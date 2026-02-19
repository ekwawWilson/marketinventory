import { NextResponse } from 'next/server'
import { requireTenant } from '@/lib/tenant/requireTenant'
import { requirePermission } from '@/lib/permissions/rbac'
import { prisma } from '@/lib/db/prisma'

/**
 * GET /api/quotations/[id] — get single quotation
 * PATCH /api/quotations/[id] — update status (SENT/ACCEPTED/REJECTED/EXPIRED)
 * DELETE /api/quotations/[id] — delete quotation
 */

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error, tenantId } = await requireTenant()
    if (error) return error!
    const { id } = await params

    const quotation = await prisma.quotation.findFirst({
      where: { id, tenantId: tenantId! },
      include: { items: true },
    })

    if (!quotation) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    let customer = null
    if (quotation.customerId) {
      customer = await prisma.customer.findFirst({
        where: { id: quotation.customerId, tenantId: tenantId! },
        select: { id: true, name: true, phone: true },
      })
    }

    return NextResponse.json({ ...quotation, customer })
  } catch (err) {
    console.error('Failed to fetch quotation:', err)
    return NextResponse.json({ error: 'Failed to fetch quotation' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error, tenantId, user } = await requireTenant()
    if (error) return error!
    const { id } = await params

    const { authorized, error: permError } = requirePermission(user!.role, 'create_quotation')
    if (!authorized) return permError!

    const body = await req.json()
    const existing = await prisma.quotation.findFirst({ where: { id, tenantId: tenantId! } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updated = await prisma.quotation.update({
      where: { id },
      data: {
        status: body.status ?? existing.status,
        note: body.note !== undefined ? body.note : existing.note,
        validUntil: body.validUntil !== undefined ? (body.validUntil ? new Date(body.validUntil) : null) : existing.validUntil,
      },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('Failed to update quotation:', err)
    return NextResponse.json({ error: 'Failed to update quotation' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error, tenantId, user } = await requireTenant()
    if (error) return error!
    const { id } = await params

    const { authorized, error: permError } = requirePermission(user!.role, 'delete_quotation')
    if (!authorized) return permError!

    const existing = await prisma.quotation.findFirst({ where: { id, tenantId: tenantId! } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.quotation.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Failed to delete quotation:', err)
    return NextResponse.json({ error: 'Failed to delete quotation' }, { status: 500 })
  }
}

/**
 * POST /api/quotations/[id]/convert — convert quotation to sale
 * This is handled below as a named export from a sub-path,
 * but we add a POST that accepts action=convert for simplicity.
 */
