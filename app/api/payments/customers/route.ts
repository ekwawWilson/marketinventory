import { NextResponse } from 'next/server'
import { requireTenant } from '@/lib/tenant/requireTenant'
import { requirePermission } from '@/lib/permissions/rbac'
import { prisma } from '@/lib/db/prisma'
import { PaymentMethod } from '@prisma/client'

/**
 * Customer Payments API
 *
 * GET /api/payments/customers - List all customer payments
 * POST /api/payments/customers - Record customer payment (reduce debt)
 */

/**
 * GET /api/payments/customers
 * List all customer payments
 */
export async function GET(req: Request) {
  try {
    const { error, tenantId } = await requireTenant()
    if (error) return error!

    const { searchParams } = new URL(req.url)
    const customerId = searchParams.get('customerId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = { tenantId: tenantId! }

    if (customerId) {
      where.customerId = customerId
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    const payments = await prisma.customerPayment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0)

    return NextResponse.json({
      payments,
      summary: {
        total: payments.length,
        totalAmount,
      },
    })
  } catch (err) {
    console.error('Failed to fetch customer payments:', err)
    return NextResponse.json(
      { error: 'Failed to fetch customer payments' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/payments/customers
 * Record a customer payment (reduces customer balance)
 * Requires: record_payments permission
 *
 * Atomically:
 * 1. Creates payment record
 * 2. Reduces customer balance
 */
export async function POST(req: Request) {
  try {
    const { error, tenantId, user } = await requireTenant()
    if (error) return error!

    const { authorized, error: permError } = requirePermission(
      user!.role,
      'record_payments'
    )
    if (!authorized) return permError!

    const body = await req.json()

    // Validate
    if (!body.customerId || typeof body.customerId !== 'string') {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      )
    }

    if (!body.amount || isNaN(parseFloat(body.amount)) || parseFloat(body.amount) <= 0) {
      return NextResponse.json(
        { error: 'Payment amount must be a positive number' },
        { status: 400 }
      )
    }

    if (!body.method || !Object.values(PaymentMethod).includes(body.method)) {
      return NextResponse.json(
        { error: 'Valid payment method is required (CASH, MOMO, BANK)' },
        { status: 400 }
      )
    }

    // Verify customer belongs to tenant
    const customer = await prisma.customer.findFirst({
      where: { id: body.customerId, tenantId: tenantId! },
    })

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found or does not belong to your tenant' },
        { status: 404 }
      )
    }

    const amount = parseFloat(body.amount)

    // Check if payment exceeds balance
    if (amount > customer.balance) {
      return NextResponse.json(
        {
          error: 'Payment amount exceeds customer balance',
          customerBalance: customer.balance,
          paymentAmount: amount,
        },
        { status: 400 }
      )
    }

    // Execute atomic transaction
    const payment = await prisma.$transaction(async (tx) => {
      // 1. Create payment record
      const newPayment = await tx.customerPayment.create({
        data: {
          tenantId,
          customerId: body.customerId,
          amount,
          method: body.method as PaymentMethod,
        },
      })

      // 2. Reduce customer balance
      await tx.customer.update({
        where: { id: body.customerId },
        data: {
          balance: {
            decrement: amount,
          },
        },
      })

      return newPayment
    })

    // Fetch updated customer
    const updatedCustomer = await prisma.customer.findUnique({
      where: { id: body.customerId },
    })

    return NextResponse.json(
      {
        payment,
        customer: {
          id: updatedCustomer?.id,
          name: updatedCustomer?.name,
          previousBalance: customer.balance,
          newBalance: updatedCustomer?.balance,
          amountPaid: amount,
        },
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('Failed to record customer payment:', err)
    return NextResponse.json(
      { error: 'Failed to record customer payment' },
      { status: 500 }
    )
  }
}
