import { NextResponse } from 'next/server'
import { requireTenant } from '@/lib/tenant/requireTenant'
import { requirePermission } from '@/lib/permissions/rbac'
import { prisma } from '@/lib/db/prisma'
import { sendSms, buildBalanceReminderSms } from '@/lib/sms/hubtel'

/**
 * POST /api/sms/reminder
 * Send a balance reminder SMS to a customer.
 * Requires: record_payments or manage_settings permission.
 *
 * Body: { customerId: string }
 */
export async function POST(req: Request) {
  try {
    const { error, tenantId, user } = await requireTenant()
    if (error) return error!

    const { authorized, error: permError } = requirePermission(user!.role, 'record_payments')
    if (!authorized) return permError!

    const body = await req.json()
    const { customerId } = body

    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 })
    }

    // Verify customer belongs to tenant
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId: tenantId! },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    if (!customer.phone) {
      return NextResponse.json({ error: 'Customer has no phone number on file' }, { status: 400 })
    }

    if (customer.balance <= 0) {
      return NextResponse.json({ error: 'Customer has no outstanding balance' }, { status: 400 })
    }

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
      return NextResponse.json({ error: 'SMS notifications are not enabled for this business' }, { status: 400 })
    }

    if (!tenant.hubtelClientId || !tenant.hubtelClientSecret || !tenant.hubtelSenderId) {
      return NextResponse.json({ error: 'Hubtel SMS credentials are not configured' }, { status: 400 })
    }

    const message = buildBalanceReminderSms({
      businessName: tenant.name,
      customerName: customer.name,
      balance: customer.balance,
    })

    const result = await sendSms(
      { clientId: tenant.hubtelClientId, clientSecret: tenant.hubtelClientSecret, senderId: tenant.hubtelSenderId },
      customer.phone,
      message,
    )

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 502 })
    }

    return NextResponse.json({ success: true, messageId: result.messageId })
  } catch (err) {
    console.error('SMS reminder error:', err)
    return NextResponse.json({ error: 'Failed to send reminder SMS' }, { status: 500 })
  }
}
