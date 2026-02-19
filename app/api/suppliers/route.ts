import { NextResponse } from 'next/server'
import { requireTenant } from '@/lib/tenant/requireTenant'
import { requirePermission } from '@/lib/permissions/rbac'
import { prisma } from '@/lib/db/prisma'

/**
 * Suppliers API Routes
 *
 * GET /api/suppliers - List all suppliers (creditors)
 * POST /api/suppliers - Create new supplier
 */

/**
 * GET /api/suppliers
 * List all suppliers for the current tenant
 * Optional query params: search, hasCredit
 */
export async function GET(req: Request) {
  try {
    const { error, tenantId } = await requireTenant()
    if (error) return error!

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')
    const hasCredit = searchParams.get('hasCredit') === 'true'

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { tenantId: tenantId! }

    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive' as const,
          },
        },
        {
          phone: {
            contains: search,
          },
        },
      ]
    }

    if (hasCredit) {
      where.balance = {
        gt: 0,
      }
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      include: {
        _count: {
          select: { purchases: true },
        },
      },
      orderBy: [
        { balance: 'desc' }, // Creditors first
        { name: 'asc' },
      ],
    })

    // Calculate total credit
    const totalCredit = suppliers.reduce((sum, supplier) => sum + supplier.balance, 0)

    return NextResponse.json({
      suppliers,
      summary: {
        total: suppliers.length,
        withCredit: suppliers.filter(s => s.balance > 0).length,
        totalCredit,
      },
    })
  } catch (err) {
    console.error('Failed to fetch suppliers:', err)
    return NextResponse.json(
      { error: 'Failed to fetch suppliers' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/suppliers
 * Create a new supplier
 * Requires: create_suppliers permission
 */
export async function POST(req: Request) {
  try {
    const { error, tenantId, user } = await requireTenant()
    if (error) return error!

    // Check permission
    const { authorized, error: permError } = requirePermission(
      user!.role,
      'create_suppliers'
    )
    if (!authorized) return permError!

    const body = await req.json()

    // Validate required fields
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        { error: 'Supplier name is required' },
        { status: 400 }
      )
    }

    // Check for duplicate supplier name or phone
    const existing = await prisma.supplier.findFirst({
      where: {
        tenantId,
        OR: [
          {
            name: {
              equals: body.name.trim(),
              mode: 'insensitive' as const,
            },
          },
          ...(body.phone
            ? [
                {
                  phone: body.phone.trim(),
                },
              ]
            : []),
        ],
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'A supplier with this name or phone already exists' },
        { status: 409 }
      )
    }

    // Create supplier
    const supplier = await prisma.supplier.create({
      data: {
        tenantId,
        name: body.name.trim(),
        phone: body.phone ? body.phone.trim() : null,
        balance: 0, // Always start with 0 balance
      },
      include: {
        _count: {
          select: { purchases: true },
        },
      },
    })

    return NextResponse.json(supplier, { status: 201 })
  } catch (err) {
    console.error('Failed to create supplier:', err)
    return NextResponse.json(
      { error: 'Failed to create supplier' },
      { status: 500 }
    )
  }
}
