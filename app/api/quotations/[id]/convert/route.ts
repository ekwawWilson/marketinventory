import { NextResponse } from 'next/server'
import { requireTenant } from '@/lib/tenant/requireTenant'
import { requirePermission } from '@/lib/permissions/rbac'
import { prisma } from '@/lib/db/prisma'
import { PaymentType } from '@prisma/client'

/**
 * POST /api/quotations/[id]/convert
 * Convert an accepted quotation into a sale.
 * Requires create_sale permission.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error, tenantId, user } = await requireTenant()
    if (error) return error!
    const { id } = await params

    const { authorized, error: permError } = requirePermission(user!.role, 'create_sale')
    if (!authorized) return permError!

    const quotation = await prisma.quotation.findFirst({
      where: { id, tenantId: tenantId! },
      include: { items: true },
    })
    if (!quotation) return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })

    if (quotation.status === 'REJECTED' || quotation.status === 'EXPIRED') {
      return NextResponse.json({ error: 'Cannot convert a rejected or expired quotation' }, { status: 400 })
    }

    // Verify item stock
    const itemIds = quotation.items.map(i => i.itemId)
    const dbItems = await prisma.item.findMany({ where: { id: { in: itemIds }, tenantId: tenantId! } })
    const itemMap = Object.fromEntries(dbItems.map(i => [i.id, i]))

    for (const qi of quotation.items) {
      const item = itemMap[qi.itemId]
      if (!item) return NextResponse.json({ error: `Item "${qi.itemName}" not found` }, { status: 404 })
      if (item.quantity < qi.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for "${item.name}". Available: ${item.quantity}, Required: ${qi.quantity}` },
          { status: 400 }
        )
      }
    }

    const body = await req.json().catch(() => ({}))
    const paidAmount = parseFloat(body.paidAmount) || quotation.totalAmount

    // Execute atomically
    const sale = await prisma.$transaction(async (tx) => {
      const newSale = await tx.sale.create({
        data: {
          tenantId: tenantId!,
          customerId: quotation.customerId || null,
          totalAmount: quotation.totalAmount,
          paidAmount: Math.min(paidAmount, quotation.totalAmount),
          paymentType: paidAmount >= quotation.totalAmount ? PaymentType.CASH : PaymentType.CREDIT,
        },
      })

      await tx.saleItem.createMany({
        data: quotation.items.map(qi => ({
          saleId: newSale.id,
          itemId: qi.itemId,
          quantity: qi.quantity,
          price: qi.price,
        })),
      })

      for (const qi of quotation.items) {
        await tx.item.update({
          where: { id: qi.itemId },
          data: { quantity: { decrement: qi.quantity } },
        })
      }

      const creditAmount = quotation.totalAmount - Math.min(paidAmount, quotation.totalAmount)
      if (creditAmount > 0 && quotation.customerId) {
        await tx.customer.update({
          where: { id: quotation.customerId },
          data: { balance: { increment: creditAmount } },
        })
      }

      // Mark quotation as accepted
      await tx.quotation.update({
        where: { id },
        data: { status: 'ACCEPTED' },
      })

      return newSale
    })

    return NextResponse.json({ saleId: sale.id }, { status: 201 })
  } catch (err) {
    console.error('Failed to convert quotation:', err)
    return NextResponse.json({ error: 'Failed to convert quotation to sale' }, { status: 500 })
  }
}
