import { NextResponse } from 'next/server'
import { requireTenant } from '@/lib/tenant/requireTenant'
import { requirePermission } from '@/lib/permissions/rbac'
import { prisma } from '@/lib/db/prisma'
import { ReturnType } from '@prisma/client'

/**
 * Supplier Returns API
 *
 * GET /api/returns/suppliers - List all supplier returns
 * POST /api/returns/suppliers - Process supplier return (return to supplier)
 */

/**
 * GET /api/returns/suppliers
 * List all supplier returns
 */
export async function GET(req: Request) {
  try {
    const { error, tenantId } = await requireTenant()
    if (error) return error!

    const { searchParams } = new URL(req.url)
    const purchaseId = searchParams.get('purchaseId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { tenantId: tenantId! }

    if (purchaseId) {
      where.purchaseId = purchaseId
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    const returns = await prisma.supplierReturn.findMany({
      where,
      orderBy: { createdAt: 'desc' },
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
    console.error('Failed to fetch supplier returns:', err)
    return NextResponse.json(
      { error: 'Failed to fetch supplier returns' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/returns/suppliers
 * Process a supplier return (return items to supplier)
 * Requires: process_returns permission
 *
 * Atomically:
 * 1. Creates return record
 * 2. Reduces item stock
 * 3. Adjusts supplier balance (CASH/CREDIT) or exchanges item (EXCHANGE)
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
    if (!body.purchaseId || !body.itemId || !body.quantity || !body.type || !body.amount) {
      return NextResponse.json(
        { error: 'purchaseId, itemId, quantity, type, and amount are required' },
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

    // Verify purchase belongs to tenant
    const purchase = await prisma.purchase.findFirst({
      where: { id: body.purchaseId, tenantId: tenantId! },
      include: {
        items: true,
        supplier: true,
      },
    })

    if (!purchase) {
      return NextResponse.json(
        { error: 'Purchase not found or does not belong to your tenant' },
        { status: 404 }
      )
    }

    // Verify item was in the purchase
    const purchaseItem = purchase.items.find(pi => pi.itemId === body.itemId)
    if (!purchaseItem) {
      return NextResponse.json(
        { error: 'Item was not part of this purchase' },
        { status: 400 }
      )
    }

    if (quantity > purchaseItem.quantity) {
      return NextResponse.json(
        { error: 'Return quantity exceeds purchased quantity' },
        { status: 400 }
      )
    }

    // Check if item has enough stock to return
    const item = await prisma.item.findUnique({
      where: { id: body.itemId },
    })

    if (!item || item.quantity < quantity) {
      return NextResponse.json(
        { error: 'Insufficient stock to process return' },
        { status: 400 }
      )
    }

    // Execute atomic transaction
    const returnRecord = await prisma.$transaction(async (tx) => {
      // 1. Create return record
      const newReturn = await tx.supplierReturn.create({
        data: {
          tenantId,
          purchaseId: body.purchaseId,
          itemId: body.itemId,
          quantity,
          type: body.type as ReturnType,
          amount,
        },
      })

      // 2. Reduce item stock (we're returning to supplier)
      await tx.item.update({
        where: { id: body.itemId },
        data: {
          quantity: {
            decrement: quantity,
          },
        },
      })

      // 3. Adjust supplier balance based on return type
      if (body.type === ReturnType.CASH) {
        // Reduce supplier balance (we get cash refund)
        await tx.supplier.update({
          where: { id: purchase.supplierId },
          data: {
            balance: {
              decrement: Math.min(amount, purchase.supplier.balance),
            },
          },
        })
      } else if (body.type === ReturnType.CREDIT) {
        // Reduce our credit to supplier
        await tx.supplier.update({
          where: { id: purchase.supplierId },
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
    console.error('Failed to process supplier return:', err)
    return NextResponse.json(
      { error: 'Failed to process supplier return' },
      { status: 500 }
    )
  }
}
