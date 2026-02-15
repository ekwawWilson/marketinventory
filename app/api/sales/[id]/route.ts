import { NextResponse } from 'next/server'
import { requireTenant } from '@/lib/tenant/requireTenant'
import { requireOwner } from '@/lib/permissions/rbac'
import { prisma } from '@/lib/db/prisma'

/**
 * Sale Detail API Routes
 *
 * GET /api/sales/[id]    - Get sale by ID
 * PUT /api/sales/[id]    - Edit sale (full replace, adjusts stock + balance)
 * DELETE /api/sales/[id] - Void sale (delete with rollback)
 */

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/sales/[id]
 * Get a specific sale with all details
 */
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { error, tenantId } = await requireTenant()
    if (error) return error!

    const { id } = await params

    const sale = await prisma.sale.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        customer: true,
        items: {
          include: {
            item: {
              include: {
                manufacturer: true,
              },
            },
          },
        },
      },
    })

    if (!sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 })
    }

    return NextResponse.json(sale)
  } catch (err) {
    console.error('Failed to fetch sale:', err)
    return NextResponse.json(
      { error: 'Failed to fetch sale' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/sales/[id]
 * Edit a sale — replace items, customer, payment type and amounts.
 * Requires: OWNER role
 *
 * Body: { customerId?, paymentType, paidAmount, items: [{ itemId, quantity, price }] }
 *
 * Atomically:
 * 1. Restore old stock and reverse old customer balance
 * 2. Validate new stock availability
 * 3. Delete old items, create new items
 * 4. Deduct new stock, apply new customer balance
 * 5. Update sale record
 */
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const { error, tenantId, user } = await requireTenant()
    if (error) return error!

    const { authorized, error: roleError } = requireOwner(user!.role)
    if (!authorized) return roleError!

    const { id } = await params
    const body = await req.json()
    const { customerId, paymentType, paidAmount, items } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 })
    }

    const totalAmount = items.reduce(
      (sum: number, i: { quantity: number; price: number }) => sum + i.quantity * i.price,
      0
    )
    const paid = Math.min(parseFloat(String(paidAmount)) || 0, totalAmount)

    // Fetch current sale
    const sale = await prisma.sale.findFirst({
      where: { id, tenantId: tenantId! },
      include: { items: true },
    })
    if (!sale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 })

    const oldCreditAmount = sale.totalAmount - sale.paidAmount

    // Validate new stock (items that aren't already in old sale get their existing qty checked)
    for (const newItem of items) {
      const oldSaleItem = sale.items.find((si) => si.itemId === newItem.itemId)
      const oldQty = oldSaleItem?.quantity ?? 0
      const stockItem = await prisma.item.findFirst({
        where: { id: newItem.itemId, tenantId: tenantId! },
      })
      if (!stockItem) {
        return NextResponse.json({ error: `Item not found: ${newItem.itemId}` }, { status: 404 })
      }
      const availableAfterRestore = stockItem.quantity + oldQty
      if (availableAfterRestore < newItem.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for "${stockItem.name}". Available: ${availableAfterRestore}, requested: ${newItem.quantity}` },
          { status: 400 }
        )
      }
    }

    const newCreditAmount = totalAmount - paid

    await prisma.$transaction(async (tx) => {
      // 1. Restore old stock
      for (const si of sale.items) {
        await tx.item.update({
          where: { id: si.itemId },
          data: { quantity: { increment: si.quantity } },
        })
      }

      // 2. Reverse old customer balance
      if (oldCreditAmount > 0 && sale.customerId) {
        await tx.customer.update({
          where: { id: sale.customerId },
          data: { balance: { decrement: oldCreditAmount } },
        })
      }

      // 3. Replace sale items
      await tx.saleItem.deleteMany({ where: { saleId: id } })
      await tx.saleItem.createMany({
        data: items.map((i: { itemId: string; quantity: number; price: number }) => ({
          saleId: id,
          itemId: i.itemId,
          quantity: i.quantity,
          price: i.price,
        })),
      })

      // 4. Deduct new stock
      for (const i of items) {
        await tx.item.update({
          where: { id: i.itemId },
          data: { quantity: { decrement: i.quantity } },
        })
      }

      // 5. Apply new customer balance
      if (newCreditAmount > 0 && customerId) {
        await tx.customer.update({
          where: { id: customerId },
          data: { balance: { increment: newCreditAmount } },
        })
      }

      // 6. Update sale record
      await tx.sale.update({
        where: { id },
        data: {
          customerId: customerId || null,
          paymentType: paymentType || 'CASH',
          totalAmount,
          paidAmount: paid,
        },
      })
    })

    const updated = await prisma.sale.findFirst({
      where: { id },
      include: {
        customer: true,
        items: { include: { item: { include: { manufacturer: true } } } },
      },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('Failed to update sale:', err)
    return NextResponse.json({ error: 'Failed to update sale' }, { status: 500 })
  }
}

/**
 * DELETE /api/sales/[id]
 * Void a sale (delete with rollback)
 * Requires: OWNER role (void_sales permission)
 *
 * Atomically:
 * 1. Deletes sale items
 * 2. Restores item stock
 * 3. Reverses customer balance (if credit sale)
 * 4. Deletes sale record
 */
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { error, tenantId, user } = await requireTenant()
    if (error) return error!

    // Only OWNERs can void sales
    const { authorized, error: roleError } = requireOwner(user!.role)
    if (!authorized) return roleError!

    const { id } = await params

    // Fetch sale with all details
    const sale = await prisma.sale.findFirst({
      where: { id, tenantId: tenantId! },
      include: {
        items: true,
        customer: true,
      },
    })

    if (!sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 })
    }

    const creditAmount = sale.totalAmount - sale.paidAmount

    // Execute atomic rollback transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete sale items
      await tx.saleItem.deleteMany({
        where: { saleId: id },
      })

      // 2. Restore item stock
      for (const saleItem of sale.items) {
        await tx.item.update({
          where: { id: saleItem.itemId },
          data: {
            quantity: {
              increment: saleItem.quantity,
            },
          },
        })
      }

      // 3. Reverse customer balance (if credit sale)
      if (creditAmount > 0 && sale.customerId) {
        await tx.customer.update({
          where: { id: sale.customerId },
          data: {
            balance: {
              decrement: creditAmount,
            },
          },
        })
      }

      // 4. Delete sale
      await tx.sale.delete({
        where: { id },
      })
    })

    return NextResponse.json(
      {
        message: 'Sale voided successfully',
        voidedAmount: sale.totalAmount,
        restoredItems: sale.items.length,
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('Failed to void sale:', err)
    return NextResponse.json(
      { error: 'Failed to void sale' },
      { status: 500 }
    )
  }
}
