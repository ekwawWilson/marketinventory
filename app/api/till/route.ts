import { NextResponse } from 'next/server'
import { requireTenant } from '@/lib/tenant/requireTenant'
import { requirePermission } from '@/lib/permissions/rbac'
import { prisma } from '@/lib/db/prisma'

/**
 * Till / Cash Register API
 *
 * GET  /api/till          - Get current open shift (if any) + today's running totals
 * POST /api/till          - Open a new shift (openingFloat)
 * PUT  /api/till          - Close current shift (closingCount, note)
 */

export async function GET(req: Request) {
  try {
    const { error, tenantId, user } = await requireTenant()
    if (error) return error!

    const { authorized, error: permError } = requirePermission(user!.role, 'manage_till')
    if (!authorized) return permError!

    // Find the current user's open shift
    const openShift = await prisma.cashRegister.findFirst({
      where: { tenantId: tenantId!, userId: user!.id, status: 'OPEN' },
      orderBy: { openedAt: 'desc' },
    })

    // Fetch today's shift history for this user
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const todayShifts = await prisma.cashRegister.findMany({
      where: { tenantId: tenantId!, userId: user!.id, openedAt: { gte: todayStart } },
      orderBy: { openedAt: 'desc' },
    })

    if (!openShift) {
      return NextResponse.json({ openShift: null, todayShifts, runningTotals: null })
    }

    // Calculate running totals since shift opened
    const [cashSales, cashPaymentsReceived, cashExpenses] = await Promise.all([
      // Cash sales since shift opened
      prisma.sale.aggregate({
        where: {
          tenantId: tenantId!,
          paymentType: 'CASH',
          createdAt: { gte: openShift.openedAt },
        },
        _sum: { paidAmount: true },
      }),

      // Customer cash payments received since shift opened
      prisma.customerPayment.aggregate({
        where: {
          tenantId: tenantId!,
          method: 'CASH',
          createdAt: { gte: openShift.openedAt },
        },
        _sum: { amount: true },
      }),

      // Cash expenses since shift opened
      prisma.expense.aggregate({
        where: {
          tenantId: tenantId!,
          createdAt: { gte: openShift.openedAt },
        },
        _sum: { amount: true },
      }),
    ])

    const cashIn = (cashSales._sum.paidAmount || 0) + (cashPaymentsReceived._sum.amount || 0)
    const cashOut = cashExpenses._sum.amount || 0
    const expectedCash = openShift.openingFloat + cashIn - cashOut

    const runningTotals = {
      openingFloat: openShift.openingFloat,
      cashSales: cashSales._sum.paidAmount || 0,
      cashPaymentsReceived: cashPaymentsReceived._sum.amount || 0,
      cashExpenses: cashOut,
      cashIn,
      cashOut,
      expectedCash,
    }

    return NextResponse.json({ openShift, todayShifts, runningTotals })
  } catch (err) {
    console.error('Till GET error:', err)
    return NextResponse.json({ error: 'Failed to load till data' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { error, tenantId, user } = await requireTenant()
    if (error) return error!

    const { authorized, error: permError } = requirePermission(user!.role, 'manage_till')
    if (!authorized) return permError!

    // Prevent opening a second shift while one is already open
    const existing = await prisma.cashRegister.findFirst({
      where: { tenantId: tenantId!, userId: user!.id, status: 'OPEN' },
    })
    if (existing) {
      return NextResponse.json({ error: 'You already have an open shift. Close it first.' }, { status: 400 })
    }

    const body = await req.json()
    const openingFloat = parseFloat(body.openingFloat ?? 0)
    if (isNaN(openingFloat) || openingFloat < 0) {
      return NextResponse.json({ error: 'Opening float must be a non-negative number' }, { status: 400 })
    }

    const shift = await prisma.cashRegister.create({
      data: {
        tenantId: tenantId!,
        userId: user!.id,
        openingFloat,
        status: 'OPEN',
      },
    })

    return NextResponse.json(shift, { status: 201 })
  } catch (err) {
    console.error('Till POST error:', err)
    return NextResponse.json({ error: 'Failed to open shift' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const { error, tenantId, user } = await requireTenant()
    if (error) return error!

    const { authorized, error: permError } = requirePermission(user!.role, 'manage_till')
    if (!authorized) return permError!

    const openShift = await prisma.cashRegister.findFirst({
      where: { tenantId: tenantId!, userId: user!.id, status: 'OPEN' },
    })
    if (!openShift) {
      return NextResponse.json({ error: 'No open shift found' }, { status: 404 })
    }

    const body = await req.json()
    const closingCount = parseFloat(body.closingCount)
    if (isNaN(closingCount) || closingCount < 0) {
      return NextResponse.json({ error: 'Closing count must be a non-negative number' }, { status: 400 })
    }

    // Recalculate expected cash at close time
    const [cashSales, cashPayments, cashExpenses] = await Promise.all([
      prisma.sale.aggregate({
        where: { tenantId: tenantId!, paymentType: 'CASH', createdAt: { gte: openShift.openedAt } },
        _sum: { paidAmount: true },
      }),
      prisma.customerPayment.aggregate({
        where: { tenantId: tenantId!, method: 'CASH', createdAt: { gte: openShift.openedAt } },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { tenantId: tenantId!, createdAt: { gte: openShift.openedAt } },
        _sum: { amount: true },
      }),
    ])

    const expectedCash =
      openShift.openingFloat +
      (cashSales._sum.paidAmount || 0) +
      (cashPayments._sum.amount || 0) -
      (cashExpenses._sum.amount || 0)

    const variance = closingCount - expectedCash

    const closed = await prisma.cashRegister.update({
      where: { id: openShift.id },
      data: {
        status: 'CLOSED',
        closingCount,
        expectedCash,
        variance,
        note: body.note?.trim() || null,
        closedAt: new Date(),
      },
    })

    return NextResponse.json(closed)
  } catch (err) {
    console.error('Till PUT error:', err)
    return NextResponse.json({ error: 'Failed to close shift' }, { status: 500 })
  }
}
