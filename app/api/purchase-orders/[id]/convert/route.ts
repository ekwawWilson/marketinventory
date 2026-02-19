import { NextResponse } from 'next/server'
import { requireTenant } from '@/lib/tenant/requireTenant'
import { requirePermission } from '@/lib/permissions/rbac'
import { prisma } from '@/lib/db/prisma'
import { PaymentType } from '@prisma/client'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/purchase-orders/[id]/convert
 * Convert a purchase order into an actual purchase (receiving goods).
 * Marks order as RECEIVED, creates Purchase + PurchaseItems, increments stock.
 */
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { error, tenantId, user } = await requireTenant()
    if (error) return error!

    const { authorized, error: permError } = requirePermission(user!.role, 'create_purchase')
    if (!authorized) return permError!

    const { id } = await params
    const body = await req.json()

    const order = await prisma.purchaseOrder.findFirst({
      where: { id, tenantId: tenantId! },
      include: { items: true },
    })

    if (!order) return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
    if (order.status === 'RECEIVED') {
      return NextResponse.json({ error: 'Purchase order has already been received' }, { status: 409 })
    }
    if (order.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Cannot receive a cancelled purchase order' }, { status: 409 })
    }
    if (!order.supplierId) {
      return NextResponse.json({ error: 'A supplier must be set before receiving' }, { status: 400 })
    }

    const paidAmount = parseFloat(body.paidAmount) || 0
    const totalAmount = order.totalAmount
    const creditAmount = totalAmount - paidAmount

    if (paidAmount > totalAmount) {
      return NextResponse.json({ error: 'Paid amount cannot exceed total amount' }, { status: 400 })
    }

    const purchase = await prisma.$transaction(async (tx) => {
      // 1. Create purchase
      const newPurchase = await tx.purchase.create({
        data: {
          tenantId: tenantId!,
          supplierId: order.supplierId!,
          totalAmount,
          paidAmount,
          paymentType: creditAmount > 0 ? PaymentType.CREDIT : PaymentType.CASH,
        },
      })

      // 2. Create purchase items
      await tx.purchaseItem.createMany({
        data: order.items.map(i => ({
          purchaseId: newPurchase.id,
          itemId: i.itemId,
          quantity: i.quantity,
          costPrice: i.costPrice,
        })),
      })

      // 3. Increment item stock + update cost price
      for (const item of order.items) {
        await tx.item.update({
          where: { id: item.itemId },
          data: {
            quantity: { increment: item.quantity },
            costPrice: item.costPrice,
          },
        })
      }

      // 4. If credit, add to supplier balance
      if (creditAmount > 0) {
        await tx.supplier.update({
          where: { id: order.supplierId! },
          data: { balance: { increment: creditAmount } },
        })
      }

      // 5. Mark order as RECEIVED
      await tx.purchaseOrder.update({
        where: { id: order.id },
        data: { status: 'RECEIVED' },
      })

      return newPurchase
    })

    return NextResponse.json({ purchaseId: purchase.id })
  } catch (err) {
    console.error('Failed to convert purchase order:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to convert purchase order' }, { status: 500 })
  }
}
