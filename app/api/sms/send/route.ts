import { NextResponse } from 'next/server'
import { requireTenant } from '@/lib/tenant/requireTenant'
import { prisma } from '@/lib/db/prisma'
import { sendSms } from '@/lib/sms/hubtel'

/**
 * POST /api/sms/send
 * Send an ad-hoc SMS (e.g. balance reminder) to a customer or custom number.
 *
 * Body: { to: string, message: string }
 */
export async function POST(req: Request) {
  try {
    const { error, tenantId } = await requireTenant()
    if (error) return error!

    const body = await req.json()
    const { to, message } = body

    if (!to || !message) {
      return NextResponse.json({ error: 'to and message are required' }, { status: 400 })
    }

    // Load tenant SMS config
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId! },
      select: {
        name: true,
        enableSmsNotifications: true,
        hubtelClientId: true,
        hubtelClientSecret: true,
        hubtelSenderId: true,
      },
    })

    if (!tenant?.enableSmsNotifications) {
      return NextResponse.json({ error: 'SMS notifications are not enabled for this account' }, { status: 403 })
    }

    if (!tenant.hubtelClientId || !tenant.hubtelClientSecret || !tenant.hubtelSenderId) {
      return NextResponse.json({ error: 'Hubtel SMS credentials are not configured' }, { status: 400 })
    }

    const result = await sendSms(
      {
        clientId: tenant.hubtelClientId,
        clientSecret: tenant.hubtelClientSecret,
        senderId: tenant.hubtelSenderId,
      },
      to,
      message,
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to send SMS' }, { status: 502 })
    }

    return NextResponse.json({ success: true, messageId: result.messageId })
  } catch (err) {
    console.error('SMS send error:', err)
    return NextResponse.json({ error: 'Failed to send SMS' }, { status: 500 })
  }
}
