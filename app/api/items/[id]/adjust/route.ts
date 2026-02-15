import { NextResponse } from 'next/server'
import { requireTenant } from '@/lib/tenant/requireTenant'
import { requirePermission } from '@/lib/permissions/rbac'
import { prisma } from '@/lib/db/prisma'

/**
 * POST /api/items/[id]/adjust
 * Adjust item quantity (add, remove, or set absolute)
 * Requires: update_items permission
 *
 * Body:
 *   type: 'add' | 'remove' | 'set'
 *   quantity: number  (amount to add/remove, or new absolute value for 'set')
 *   reason: string    (optional note for the adjustment)
 */

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { error, tenantId, user } = await requireTenant()
    if (error) return error!

    const { authorized, error: permError } = requirePermission(
      user!.role,
      'update_items'
    )
    if (!authorized) return permError!

    const { id } = await params
    const body = await req.json()

    const { type, quantity, reason } = body

    // Validate
    if (!['add', 'remove', 'set'].includes(type)) {
      return NextResponse.json(
        { error: 'type must be one of: add, remove, set' },
        { status: 400 }
      )
    }

    const qty = Number(quantity)
    if (isNaN(qty) || qty < 0) {
      return NextResponse.json(
        { error: 'quantity must be a non-negative number' },
        { status: 400 }
      )
    }

    if (type !== 'set' && qty === 0) {
      return NextResponse.json(
        { error: 'quantity must be greater than 0 for add/remove adjustments' },
        { status: 400 }
      )
    }

    // Fetch item
    const item = await prisma.item.findFirst({
      where: { id, tenantId: tenantId! },
    })

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Calculate new quantity
    let newQuantity: number
    if (type === 'add') {
      newQuantity = item.quantity + qty
    } else if (type === 'remove') {
      newQuantity = item.quantity - qty
      if (newQuantity < 0) {
        return NextResponse.json(
          {
            error: `Cannot remove ${qty} units — only ${item.quantity} in stock`,
            currentQuantity: item.quantity,
          },
          { status: 400 }
        )
      }
    } else {
      // set
      newQuantity = qty
    }

    const updated = await prisma.item.update({
      where: { id },
      data: { quantity: newQuantity },
      include: { manufacturer: { select: { name: true } } },
    })

    return NextResponse.json({
      ...updated,
      adjustment: {
        type,
        previousQuantity: item.quantity,
        newQuantity,
        change: newQuantity - item.quantity,
        reason: reason || null,
      },
    })
  } catch (err) {
    console.error('Failed to adjust quantity:', err)
    return NextResponse.json(
      { error: 'Failed to adjust quantity' },
      { status: 500 }
    )
  }
}
