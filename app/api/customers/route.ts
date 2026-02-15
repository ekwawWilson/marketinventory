import { NextResponse } from 'next/server'
import { requireTenant } from '@/lib/tenant/requireTenant'
import { requirePermission } from '@/lib/permissions/rbac'
import { prisma } from '@/lib/db/prisma'

/**
 * Customers API Routes
 *
 * GET /api/customers - List all customers (debtors)
 * POST /api/customers - Create new customer
 */

/**
 * GET /api/customers
 * List all customers for the current tenant
 * Optional query params: search, hasDebt
 */
export async function GET(req: Request) {
  try {
    const { error, tenantId } = await requireTenant()
    if (error) return error!

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')
    const hasDebt = searchParams.get('hasDebt') === 'true'

    // Build where clause
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

    if (hasDebt) {
      where.balance = {
        gt: 0,
      }
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        _count: {
          select: { sales: true },
        },
      },
      orderBy: [
        { balance: 'desc' }, // Debtors first
        { name: 'asc' },
      ],
    })

    // Calculate total debt
    const totalDebt = customers.reduce((sum, customer) => sum + customer.balance, 0)

    return NextResponse.json({
      customers,
      summary: {
        total: customers.length,
        withDebt: customers.filter(c => c.balance > 0).length,
        totalDebt,
      },
    })
  } catch (err) {
    console.error('Failed to fetch customers:', err)
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/customers
 * Create a new customer
 * Requires: create_customers permission
 */
export async function POST(req: Request) {
  try {
    const { error, tenantId, user } = await requireTenant()
    if (error) return error!

    // Check permission
    const { authorized, error: permError } = requirePermission(
      user!.role,
      'create_customers'
    )
    if (!authorized) return permError!

    const body = await req.json()

    // Validate required fields
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        { error: 'Customer name is required' },
        { status: 400 }
      )
    }

    // Check for duplicate customer name or phone
    const existing = await prisma.customer.findFirst({
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
        { error: 'A customer with this name or phone already exists' },
        { status: 409 }
      )
    }

    // Create customer
    const customer = await prisma.customer.create({
      data: {
        tenantId,
        name: body.name.trim(),
        phone: body.phone ? body.phone.trim() : null,
        balance: 0, // Always start with 0 balance
      },
      include: {
        _count: {
          select: { sales: true },
        },
      },
    })

    return NextResponse.json(customer, { status: 201 })
  } catch (err) {
    console.error('Failed to create customer:', err)
    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    )
  }
}
