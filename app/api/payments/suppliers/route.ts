import { NextResponse } from 'next/server'
import { requireTenant } from '@/lib/tenant/requireTenant'
import { requirePermission } from '@/lib/permissions/rbac'
import { prisma } from '@/lib/db/prisma'
import { PaymentMethod } from '@prisma/client'

/**
 * Supplier Payments API
 *
 * GET /api/payments/suppliers - List all supplier payments
 * POST /api/payments/suppliers - Record supplier payment (reduce credit)
 */

/**
 * GET /api/payments/suppliers
 * List all supplier payments
 */
export async function GET(req: Request) {
  try {
    const { error, tenantId } = await requireTenant()
    if (error) return error!

    const { searchParams } = new URL(req.url)
    const supplierId = searchParams.get('supplierId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = { tenantId: tenantId! }

    if (supplierId) {
      where.supplierId = supplierId
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    const payments = await prisma.supplierPayment.findMany({
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
    console.error('Failed to fetch supplier payments:', err)
    return NextResponse.json(
      { error: 'Failed to fetch supplier payments' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/payments/suppliers
 * Record a supplier payment (reduces supplier credit balance)
 * Requires: record_payments permission
 *
 * Atomically:
 * 1. Creates payment record
 * 2. Reduces supplier balance
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
    if (!body.supplierId || typeof body.supplierId !== 'string') {
      return NextResponse.json(
        { error: 'Supplier ID is required' },
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

    // Verify supplier belongs to tenant
    const supplier = await prisma.supplier.findFirst({
      where: { id: body.supplierId, tenantId: tenantId! },
    })

    if (!supplier) {
      return NextResponse.json(
        { error: 'Supplier not found or does not belong to your tenant' },
        { status: 404 }
      )
    }

    const amount = parseFloat(body.amount)

    // Check if payment exceeds balance
    if (amount > supplier.balance) {
      return NextResponse.json(
        {
          error: 'Payment amount exceeds supplier balance',
          supplierBalance: supplier.balance,
          paymentAmount: amount,
        },
        { status: 400 }
      )
    }

    // Execute atomic transaction
    const payment = await prisma.$transaction(async (tx) => {
      // 1. Create payment record
      const newPayment = await tx.supplierPayment.create({
        data: {
          tenantId,
          supplierId: body.supplierId,
          amount,
          method: body.method as PaymentMethod,
        },
      })

      // 2. Reduce supplier balance
      await tx.supplier.update({
        where: { id: body.supplierId },
        data: {
          balance: {
            decrement: amount,
          },
        },
      })

      return newPayment
    })

    // Fetch updated supplier
    const updatedSupplier = await prisma.supplier.findUnique({
      where: { id: body.supplierId },
    })

    return NextResponse.json(
      {
        payment,
        supplier: {
          id: updatedSupplier?.id,
          name: updatedSupplier?.name,
          previousBalance: supplier.balance,
          newBalance: updatedSupplier?.balance,
          amountPaid: amount,
        },
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('Failed to record supplier payment:', err)
    return NextResponse.json(
      { error: 'Failed to record supplier payment' },
      { status: 500 }
    )
  }
}
