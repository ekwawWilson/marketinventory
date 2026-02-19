import { NextResponse } from 'next/server'
import { requireTenant } from '@/lib/tenant/requireTenant'
import { requirePermission } from '@/lib/permissions/rbac'
import { prisma } from '@/lib/db/prisma'

/**
 * GET /api/quotations — list all quotations for tenant
 * POST /api/quotations — create quotation
 */

export async function GET(req: Request) {
  try {
    const { error, tenantId } = await requireTenant()
    if (error) return error!

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { tenantId: tenantId! }
    if (status) where.status = status

    const quotations = await prisma.quotation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
      },
    })

    // Attach customer names manually (no direct relation on model — just customerId)
    const customerIds = [...new Set(quotations.map(q => q.customerId).filter(Boolean))] as string[]
    const customers = customerIds.length
      ? await prisma.customer.findMany({ where: { id: { in: customerIds }, tenantId: tenantId! }, select: { id: true, name: true, phone: true } })
      : []
    const customerMap = Object.fromEntries(customers.map(c => [c.id, c]))

    const result = quotations.map(q => ({
      ...q,
      customer: q.customerId ? (customerMap[q.customerId] ?? null) : null,
    }))

    return NextResponse.json({ quotations: result })
  } catch (err) {
    console.error('Failed to fetch quotations:', err)
    return NextResponse.json({ error: 'Failed to fetch quotations' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { error, tenantId, user } = await requireTenant()
    if (error) return error!

    const { authorized, error: permError } = requirePermission(user!.role, 'create_quotation')
    if (!authorized) return permError!

    const body = await req.json()

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 })
    }

    // Resolve item names from DB for snapshot
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itemIds = body.items.map((i: any) => i.itemId)
    const dbItems = await prisma.item.findMany({ where: { id: { in: itemIds }, tenantId: tenantId! } })
    const itemMap = Object.fromEntries(dbItems.map(i => [i.id, i]))

    if (dbItems.length !== itemIds.length) {
      return NextResponse.json({ error: 'One or more items not found' }, { status: 404 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itemsData = body.items.map((i: any) => ({
      itemId: i.itemId,
      itemName: itemMap[i.itemId]?.name ?? '',
      quantity: parseFloat(i.quantity),
      price: parseFloat(i.price) || itemMap[i.itemId]?.sellingPrice || 0,
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalAmount = itemsData.reduce((s: number, i: any) => s + i.quantity * i.price, 0)

    const quotation = await prisma.quotation.create({
      data: {
        tenantId: tenantId!,
        customerId: body.customerId || null,
        status: 'DRAFT',
        totalAmount,
        note: body.note || null,
        validUntil: body.validUntil ? new Date(body.validUntil) : null,
        items: { create: itemsData },
      },
      include: { items: true },
    })

    return NextResponse.json(quotation, { status: 201 })
  } catch (err) {
    console.error('Failed to create quotation:', err)
    return NextResponse.json({ error: 'Failed to create quotation' }, { status: 500 })
  }
}
