import { NextResponse } from 'next/server'
import { requireTenant } from '@/lib/tenant/requireTenant'
import { requirePermission } from '@/lib/permissions/rbac'
import { prisma } from '@/lib/db/prisma'
import { ReturnType } from '@prisma/client'

/**
 * Customer Returns API
 *
 * GET /api/returns/customers - List all customer returns
 * POST /api/returns/customers - Process customer return
 */

/**
 * GET /api/returns/customers
 * List all customer returns
 */
export async function GET(req: Request) {
  try {
    const { error, tenantId } = await requireTenant()
    if (error) return error!

    const { searchParams } = new URL(req.url)
    const saleId = searchParams.get('saleId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { tenantId: tenantId! }

    if (saleId) {
      where.saleId = saleId
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    const returns = await prisma.customerReturn.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        item: { select: { id: true, name: true } },
        sale: {
          select: {
            id: true,
            customer: { select: { id: true, name: true } },
          },
        },
      },
    })

    const totalAmount = returns.reduce((sum, r) => sum + r.amount, 0)

    return NextResponse.json({
      returns,
      summary: {
        total: returns.length,
        totalAmount,
      },
    })
  } catch (err) {
    console.error('Failed to fetch customer returns:', err)
    return NextResponse.json(
      { error: 'Failed to fetch customer returns' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/returns/customers
 * Process a customer return
 * Requires: process_returns permission
 *
 * Atomically:
 * 1. Creates return record
 * 2. Restores item stock
 * 3. Adjusts customer balance (CASH/CREDIT) or exchanges item (EXCHANGE)
 */
export async function POST(req: Request) {
  try {
    const { error, tenantId, user } = await requireTenant()
    if (error) return error!

    const { authorized, error: permError } = requirePermission(
      user!.role,
      'process_returns'
    )
    if (!authorized) return permError!

    const body = await req.json()

    // Validate
    if (!body.saleId || !body.itemId || !body.quantity || !body.type || !body.amount) {
      return NextResponse.json(
        { error: 'saleId, itemId, quantity, type, and amount are required' },
        { status: 400 }
      )
    }

    if (!Object.values(ReturnType).includes(body.type)) {
      return NextResponse.json(
        { error: 'Invalid return type. Must be CASH, CREDIT, or EXCHANGE' },
        { status: 400 }
      )
    }

    const quantity = parseInt(body.quantity)
    const amount = parseFloat(body.amount)

    if (quantity <= 0 || amount < 0) {
      return NextResponse.json(
        { error: 'Quantity must be positive and amount must be non-negative' },
        { status: 400 }
      )
    }

    // Verify sale belongs to tenant
    const sale = await prisma.sale.findFirst({
      where: { id: body.saleId, tenantId: tenantId! },
      include: {
        items: true,
        customer: true,
      },
    })

    if (!sale) {
      return NextResponse.json(
        { error: 'Sale not found or does not belong to your tenant' },
        { status: 404 }
      )
    }

    // Verify item was in the sale
    const saleItem = sale.items.find(si => si.itemId === body.itemId)
    if (!saleItem) {
      return NextResponse.json(
        { error: 'Item was not part of this sale' },
        { status: 400 }
      )
    }

    if (quantity > saleItem.quantity) {
      return NextResponse.json(
        { error: 'Return quantity exceeds sold quantity' },
        { status: 400 }
      )
    }

    // Execute atomic transaction
    const returnRecord = await prisma.$transaction(async (tx) => {
      // 1. Create return record
      const newReturn = await tx.customerReturn.create({
        data: {
          tenantId,
          saleId: body.saleId,
          itemId: body.itemId,
          quantity,
          type: body.type as ReturnType,
          amount,
        },
      })

      // 2. Restore item stock
      await tx.item.update({
        where: { id: body.itemId },
        data: {
          quantity: {
            increment: quantity,
          },
        },
      })

      // 3. Adjust customer balance based on return type
      if (body.type === ReturnType.CASH && sale.customerId) {
        // Reduce customer balance by return amount (cash refund)
        await tx.customer.update({
          where: { id: sale.customerId },
          data: {
            balance: {
              decrement: Math.min(amount, sale.customer!.balance),
            },
          },
        })
      } else if (body.type === ReturnType.CREDIT && sale.customerId) {
        // Increase customer credit (they now owe less or have credit)
        await tx.customer.update({
          where: { id: sale.customerId },
          data: {
            balance: {
              decrement: amount,
            },
          },
        })
      }
      // EXCHANGE: no balance adjustment needed

      return newReturn
    })

    return NextResponse.json(returnRecord, { status: 201 })
  } catch (err) {
    console.error('Failed to process customer return:', err)
    return NextResponse.json(
      { error: 'Failed to process customer return' },
      { status: 500 }
    )
  }
}
