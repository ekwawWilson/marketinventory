import { NextResponse } from 'next/server'
import { requireBranchAccess } from '@/lib/branch/server'
import { requirePermission } from '@/lib/permissions/rbac'
import { prisma } from '@/lib/db/prisma'
import { verifyMomoNumber, isMomoChannel } from '@/lib/momo/hubtelVerify'

/**
 * POST /api/momo/verify-test
 *
 * Runs a real Verification API call and returns Hubtel's exact response —
 * HTTP status, the request URL, and the untouched response body — rather than
 * the friendly, generic message /api/momo/verify gives a cashier mid-sale.
 *
 * This exists because "verification is not working" is otherwise
 * undiagnosable from the till: the cashier-facing route deliberately collapses
 * every failure into one reassuring line so a payment provider outage never
 * blocks a sale. When something needs reporting to Hubtel, that line is not
 * enough — this is what to screenshot or copy into a support ticket.
 *
 * Settings-level access only, and not rate-limited or cached like the
 * cashier route: this is a deliberate, occasional diagnostic call.
 */
export async function POST(req: Request) {
  try {
    const { error, context } = await requireBranchAccess()
    if (error) return error

    const { authorized, error: permError } = requirePermission(context!, 'manage_settings')
    if (!authorized) return permError!

    const body = await req.json().catch(() => ({}))
    const phoneNumber = String(body.phoneNumber ?? '').trim()
    const channel = body.channel

    if (!phoneNumber || !channel) {
      return NextResponse.json(
        { error: 'phoneNumber and channel are required' },
        { status: 400 }
      )
    }
    if (!isMomoChannel(channel)) {
      return NextResponse.json({ error: 'Unknown mobile money network' }, { status: 400 })
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: context!.tenantId },
      select: {
        hubtelClientId: true,
        hubtelClientSecret: true,
        hubtelCollectionAccount: true,
      },
    })

    if (
      !tenant?.hubtelClientId ||
      !tenant?.hubtelClientSecret ||
      !tenant?.hubtelCollectionAccount
    ) {
      return NextResponse.json({
        success: false,
        error:
          'Hubtel is not fully configured — add the Client ID, Client Secret and ' +
          'Collection Account Number above, save, then run this test again.',
      })
    }

    const result = await verifyMomoNumber(
      {
        clientId: tenant.hubtelClientId,
        clientSecret: tenant.hubtelClientSecret,
        collectionAccount: tenant.hubtelCollectionAccount,
      },
      channel,
      phoneNumber
    )

    return NextResponse.json(result)
  } catch (err) {
    console.error('MoMo verify-test error:', err)
    return NextResponse.json({ error: 'Test failed to run.' }, { status: 500 })
  }
}
