import { NextResponse } from 'next/server'
import { requireTenant } from '@/lib/tenant/requireTenant'
import { requirePermission } from '@/lib/permissions/rbac'
import { prisma } from '@/lib/db/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/purchase-orders/[id]
 */
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { error, tenantId } = await requireTenant()
    if (error) return error!

    const { id } = await params

    const order = await prisma.purchaseOrder.findFirst({
      where: { id, tenantId: tenantId! },
      include: { items: true },
    })

    if (!order) return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })

    let supplier = null
    if (order.supplierId) {
      supplier = await prisma.supplier.findFirst({
        where: { id: order.supplierId },
        select: { id: true, name: true, phone: true },
      })
    }

    return NextResponse.json({ ...order, supplier })
  } catch (err) {
    console.error('Failed to fetch purchase order:', err)
    return NextResponse.json({ error: 'Failed to fetch purchase order' }, { status: 500 })
  }
}

/**
 * PATCH /api/purchase-orders/[id]
 * Update status / note / expectedAt
 */
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const { error, tenantId, user } = await requireTenant()
    if (error) return error!

    const { authorized, error: permError } = requirePermission(user!.role, 'create_purchase_order')
    if (!authorized) return permError!

    const { id } = await params
    const body = await req.json()

    const existing = await prisma.purchaseOrder.findFirst({
      where: { id, tenantId: tenantId! },
    })
    if (!existing) return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })

    const order = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        ...(body.status && { status: body.status }),
        ...(body.note !== undefined && { note: body.note }),
        ...(body.expectedAt !== undefined && { expectedAt: body.expectedAt ? new Date(body.expectedAt) : null }),
      },
    })

    return NextResponse.json(order)
  } catch (err) {
    console.error('Failed to update purchase order:', err)
    return NextResponse.json({ error: 'Failed to update purchase order' }, { status: 500 })
  }
}

/**
 * DELETE /api/purchase-orders/[id]
 * Only DRAFT orders can be deleted
 */
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { error, tenantId, user } = await requireTenant()
    if (error) return error!

    const { authorized, error: permError } = requirePermission(user!.role, 'delete_purchase_order')
    if (!authorized) return permError!

    const { id } = await params

    const existing = await prisma.purchaseOrder.findFirst({
      where: { id, tenantId: tenantId! },
    })
    if (!existing) return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
    if (existing.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Only DRAFT purchase orders can be deleted' }, { status: 409 })
    }

    await prisma.purchaseOrder.delete({ where: { id } })

    return NextResponse.json({ message: 'Purchase order deleted' })
  } catch (err) {
    console.error('Failed to delete purchase order:', err)
    return NextResponse.json({ error: 'Failed to delete purchase order' }, { status: 500 })
  }
}
