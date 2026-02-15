import { NextResponse } from 'next/server'
import { requireTenant } from '@/lib/tenant/requireTenant'
import { requirePermission } from '@/lib/permissions/rbac'
import { prisma } from '@/lib/db/prisma'

/**
 * Customer Detail API Routes
 *
 * GET /api/customers/[id] - Get customer by ID with transaction history
 * PUT /api/customers/[id] - Update customer
 * DELETE /api/customers/[id] - Delete customer
 */

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/customers/[id]
 * Get a specific customer with transaction history
 */
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { error, tenantId } = await requireTenant()
    if (error) return error!

    const { id } = await params
    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const salesWhere: any = {}
    if (startDate || endDate) {
      salesWhere.createdAt = {}
      if (startDate) salesWhere.createdAt.gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        salesWhere.createdAt.lte = end
      }
    }

    const paymentsWhere: any = { customerId: id, tenantId }
    if (startDate || endDate) {
      paymentsWhere.createdAt = {}
      if (startDate) paymentsWhere.createdAt.gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        paymentsWhere.createdAt.lte = end
      }
    }

    const [customer, payments] = await Promise.all([
      prisma.customer.findFirst({
        where: { id, tenantId },
        include: {
          sales: {
            where: salesWhere,
            orderBy: { createdAt: 'desc' },
            include: {
              items: {
                include: {
                  item: { select: { name: true, manufacturer: { select: { name: true } } } },
                },
              },
            },
          },
          _count: { select: { sales: true } },
        },
      }),
      prisma.customerPayment.findMany({
        where: paymentsWhere,
        orderBy: { createdAt: 'desc' },
      }),
    ])

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const totalSales = customer.sales.reduce((sum, sale) => sum + sale.totalAmount, 0)
    const totalPaid = customer.sales.reduce((sum, sale) => sum + sale.paidAmount, 0)
    const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0)

    return NextResponse.json({
      ...customer,
      payments,
      summary: {
        totalSales,
        totalPaid,
        totalPayments,
        currentBalance: customer.balance,
      },
    })
  } catch (err) {
    console.error('Failed to fetch customer:', err)
    return NextResponse.json(
      { error: 'Failed to fetch customer' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/customers/[id]
 * Update a customer
 * Requires: update_customers permission
 * Note: Balance cannot be updated directly (updated through sales/payments)
 */
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const { error, tenantId, user } = await requireTenant()
    if (error) return error!

    // Check permission
    const { authorized, error: permError } = requirePermission(
      user!.role,
      'update_customers'
    )
    if (!authorized) return permError!

    const { id } = await params
    const body = await req.json()

    // Check customer exists and belongs to tenant
    const existing = await prisma.customer.findFirst({
      where: { id, tenantId: tenantId! },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    // Validate
    if (body.name !== undefined && (!body.name || typeof body.name !== 'string')) {
      return NextResponse.json(
        { error: 'Customer name must be a non-empty string' },
        { status: 400 }
      )
    }

    // Prevent direct balance updates
    if (body.balance !== undefined) {
      return NextResponse.json(
        { error: 'Cannot update balance directly. Use sales or payments.' },
        { status: 400 }
      )
    }

    // Check for duplicate name or phone (excluding current customer)
    if (body.name || body.phone) {
      const duplicate = await prisma.customer.findFirst({
        where: {
          tenantId,
          OR: [
            ...(body.name
              ? [
                  {
                    name: {
                      equals: body.name.trim(),
                      mode: 'insensitive' as const,
                    },
                  },
                ]
              : []),
            ...(body.phone
              ? [
                  {
                    phone: body.phone.trim(),
                  },
                ]
              : []),
          ],
          id: { not: id },
        },
      })

      if (duplicate) {
        return NextResponse.json(
          { error: 'A customer with this name or phone already exists' },
          { status: 409 }
        )
      }
    }

    // Update customer
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name.trim() }),
        ...(body.phone !== undefined && { phone: body.phone ? body.phone.trim() : null }),
      },
      include: {
        _count: {
          select: { sales: true },
        },
      },
    })

    return NextResponse.json(customer)
  } catch (err) {
    console.error('Failed to update customer:', err)
    return NextResponse.json(
      { error: 'Failed to update customer' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/customers/[id]
 * Delete a customer
 * Requires: delete_customers permission
 * Note: Cannot delete if customer has outstanding balance or sales
 */
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { error, tenantId, user } = await requireTenant()
    if (error) return error!

    // Check permission
    const { authorized, error: permError } = requirePermission(
      user!.role,
      'delete_customers'
    )
    if (!authorized) return permError!

    const { id } = await params

    // Check customer exists and belongs to tenant
    const customer = await prisma.customer.findFirst({
      where: { id, tenantId: tenantId! },
      include: {
        _count: {
          select: { sales: true },
        },
      },
    })

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    // Check if customer has outstanding balance
    if (customer.balance > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete customer with outstanding balance',
          balance: customer.balance,
        },
        { status: 409 }
      )
    }

    // Check if customer has sales history
    if (customer._count.sales > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete customer with sales history',
          salesCount: customer._count.sales,
        },
        { status: 409 }
      )
    }

    // Delete customer
    await prisma.customer.delete({
      where: { id },
    })

    return NextResponse.json(
      { message: 'Customer deleted successfully' },
      { status: 200 }
    )
  } catch (err) {
    console.error('Failed to delete customer:', err)
    return NextResponse.json(
      { error: 'Failed to delete customer' },
      { status: 500 }
    )
  }
}
