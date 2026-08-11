import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { requireBranchAccess } from '@/lib/branch/server'
import { prisma } from '@/lib/db/prisma'
import { sendMomoCollect } from '@/lib/momo/hubtelCollect'
import { isMomoChannel } from '@/lib/momo/hubtelVerify'

/**
 * POST /api/momo/collect
 * Sends a MoMo payment prompt to a customer's phone via Hubtel.
 * Body: { amount, phoneNumber, description, clientReference }
 */
export async function POST(req: Request) {
  try {
    const { error, context } = await requireBranchAccess()
    if (error) return error

    const body = await req.json()
    const { amount, phoneNumber, description, clientReference, channel, customerName, salePayload, intent } =
      body

    if (!amount || !phoneNumber || !clientReference) {
      return NextResponse.json(
        { error: 'amount, phoneNumber, and clientReference are required' },
        { status: 400 }
      )
    }
    // Hubtel requires the network with every payment — it cannot be inferred
    // from the number, since a ported line keeps its original prefix.
    if (!isMomoChannel(channel)) {
      return NextResponse.json(
        { error: 'Choose the customer\'s mobile money network before charging.' },
        { status: 400 }
      )
    }

    // Load tenant Hubtel credentials
    const tenant = await prisma.tenant.findUnique({
      where: { id: context!.tenantId },
      select: {
        hubtelClientId: true,
        hubtelClientSecret: true,
        hubtelCallbackUrl: true,
        hubtelCollectionAccount: true,
        name: true,
      },
    })

    if (!tenant?.hubtelClientId || !tenant?.hubtelClientSecret) {
      return NextResponse.json(
        { error: 'MoMo collection is not configured. Add Hubtel credentials in Settings → SMS.' },
        { status: 422 }
      )
    }

    // Generated here, not taken from the browser.
    //
    // Every till built its own reference from Date.now(), so two cashiers
    // reaching checkout in the same millisecond — different tills, different
    // branches, same tenant — produced the same string. The unique index caught
    // it, but the loser could not charge their customer at all and was told the
    // payment had "already been sent". Random bytes make that collision
    // vanishingly unlikely, and a server-side value cannot be forged to point
    // at someone else's payment.
    //
    // Hubtel caps ClientReference at 36 characters: 8 tenant + 1 dash + 13
    // timestamp + 1 dash + 12 random = 35.
    const reference =
      `${context!.tenantId.slice(0, 8)}-${Date.now()}-` +
      randomBytes(6).toString('hex')

    // Recorded before the prompt goes out, not after. If the till loses power
    // or closes its tab while the customer is entering their PIN, this row and
    // Hubtel's callback are the only things that can still turn an approved
    // payment into a sale.
    try {
      await prisma.momoTransaction.create({
        data: {
          tenantId: context!.tenantId,
          branchId: context!.currentBranchId ?? null,
          clientReference: reference,
          phoneNumber: String(phoneNumber),
          channel,
          amount: parseFloat(String(amount)),
          salePayload: salePayload ? JSON.stringify(salePayload) : null,
          // Only a payload we know how to replay is worth storing an intent
          // for; anything else would be replayed blindly by the callback.
          intent:
            salePayload && (intent === 'SALE' || intent === 'CUSTOMER_PAYMENT')
              ? intent
              : salePayload
                ? 'SALE'
                : null,
          createdById: context!.user.id,
        },
      })
    } catch {
      // The unique index rejected it: this reference has been charged already.
      // Sending the prompt anyway would ask the customer to pay a second time.
      return NextResponse.json({
        success: false,
        error:
          'This payment has already been sent. Check the customer’s phone before charging again.',
      })
    }

    const result = await sendMomoCollect(
      {
        clientId: tenant.hubtelClientId,
        clientSecret: tenant.hubtelClientSecret,
        callbackUrl: tenant.hubtelCallbackUrl,
        collectionAccount: tenant.hubtelCollectionAccount ?? '',
      },
      {
        amount: parseFloat(String(amount)),
        phoneNumber: String(phoneNumber),
        channel,
        customerName: customerName ? String(customerName) : undefined,
        description: description || `Payment to ${tenant.name}`,
        clientReference: reference,
      }
    )

    if (!result.success) {
      console.error('[momo-collect] Hubtel refused the payment request:', {
        reference: clientReference,
        channel,
        error: result.error,
      })
      // The prompt never reached the customer, so this reference is dead.
      // Closing it keeps a refused attempt from sitting in the pending list.
      await prisma.momoTransaction.updateMany({
        where: { clientReference: reference, tenantId: context!.tenantId, status: 'PENDING' },
        data: { status: 'FAILED', failureReason: result.error, completedAt: new Date() },
      })
      // 200, deliberately. A 5xx here is indistinguishable in the browser from
      // the proxy itself failing, and some proxies replace a 5xx body with
      // their own HTML error page — which discards Hubtel's message and leaves
      // the cashier with "Unexpected token '<'" instead of a reason.
      // The caller reads `success`, not the status code.
      return NextResponse.json({ success: false, error: result.error })
    }

    await prisma.momoTransaction.updateMany({
      where: { clientReference: reference, tenantId: context!.tenantId, status: 'PENDING' },
      data: {
        transactionId: result.transactionId ?? null,
        // 0000 means Hubtel settled it outright — no callback is coming, so
        // leaving it PENDING would strand a paid transaction.
        ...(result.status === 'success'
          ? { status: 'SUCCESS' as const, completedAt: new Date() }
          : {}),
      },
    })

    return NextResponse.json({
      success: true,
      transactionId: result.transactionId,
      status: result.status,
      // The caller polls and binds its sale with this: it is generated here, so
      // the browser cannot know it otherwise.
      clientReference: reference,
    })
  } catch (err) {
    console.error('MoMo collect error:', err)
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to send MoMo request',
    })
  }
}
