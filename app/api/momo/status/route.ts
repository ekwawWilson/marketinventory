import { NextResponse } from 'next/server'
import { applyBranchScope, requireBranchAccess } from '@/lib/branch/server'
import { prisma } from '@/lib/db/prisma'
import { getMomoStatus } from '@/lib/momo/hubtelCollect'

/**
 * GET /api/momo/status?clientReference=xxx
 *
 * Check a MoMo payment's status. Hubtel keys this by our own clientReference,
 * not their transaction id, and treats it as the fallback for when a callback
 * has not arrived within five minutes rather than the primary path.
 */
export async function GET(req: Request) {
  try {
    const { error, context } = await requireBranchAccess()
    if (error) return error

    const { searchParams } = new URL(req.url)
    // transactionId is still accepted so a till running older JS keeps working
    // through a deploy.
    const rawReference =
      searchParams.get('clientReference') ?? searchParams.get('transactionId')

    if (!rawReference) {
      return NextResponse.json({ error: 'clientReference is required' }, { status: 400 })
    }

    // The collect route namespaces the browser's reference by tenant before
    // sending it to Hubtel, so the same prefix has to be applied here or the
    // lookup misses and every payment polls as pending until it times out.
    // Tolerates a reference that already carries the prefix, so a till that
    // kept one across a deploy still resolves.
    const prefix = `${context!.tenantId.slice(0, 8)}-`
    const clientReference = rawReference.startsWith(prefix)
      ? rawReference
      : `${prefix}${rawReference}`

    const tenant = await prisma.tenant.findUnique({
      where: { id: context!.tenantId },
      select: {
        hubtelClientId: true,
        hubtelClientSecret: true,
        hubtelCollectionAccount: true,
      },
    })

    if (!tenant?.hubtelClientId || !tenant?.hubtelClientSecret) {
      return NextResponse.json({ error: 'Hubtel not configured' }, { status: 422 })
    }

    const result = await getMomoStatus(
      {
        clientId: tenant.hubtelClientId,
        clientSecret: tenant.hubtelClientSecret,
        collectionAccount: tenant.hubtelCollectionAccount ?? '',
      },
      clientReference
    )

    if (!result.success) {
      // 200 with success:false, as the collect route does: a 5xx body can be
      // replaced by a proxy's own HTML error page, which loses the reason and
      // breaks the caller's JSON parse.
      return NextResponse.json({ success: false, error: result.error })
    }

    // Keep our record in step. Hubtel's callback usually gets here first, but
    // when it does not arrive this poll is the only thing that closes the row —
    // and a PENDING row is what the recovery list works from.
    if (result.status === 'success' || result.status === 'failed') {
      await prisma.momoTransaction.updateMany({
        where: applyBranchScope(
          { clientReference, tenantId: context!.tenantId, status: 'PENDING' as const },
          context!
        ),
        data: {
          status: result.status === 'success' ? 'SUCCESS' : 'FAILED',
          completedAt: new Date(),
          ...(result.status === 'failed'
            ? { failureReason: 'Reported as unpaid by Hubtel' }
            : {}),
        },
      })
    }

    // Whether the callback already recorded the sale. The callback normally
    // beats the till to an approved payment, and without this the till would
    // record a second sale for the same money — double-counting the takings and
    // decrementing stock twice.
    const txn = await prisma.momoTransaction.findFirst({
      where: applyBranchScope({ clientReference, tenantId: context!.tenantId }, context!),
      select: { saleId: true },
    })

    return NextResponse.json({
      success: true,
      status: result.status,
      saleId: txn?.saleId ?? null,
    })
  } catch (err) {
    console.error('MoMo status error:', err)
    return NextResponse.json({ error: 'Failed to check MoMo status' }, { status: 500 })
  }
}
