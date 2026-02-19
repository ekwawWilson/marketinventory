import { NextResponse } from 'next/server'
import { requireTenant } from '@/lib/tenant/requireTenant'
import { prisma } from '@/lib/db/prisma'

/**
 * GET /api/dashboard
 *
 * Returns chart and KPI data for the dashboard:
 * - salesLast7Days: daily revenue for bar chart
 * - paymentMethodSplit: CASH/MOMO/BANK totals for donut
 * - topItems: top 5 selling items by revenue
 * - kpis: today's revenue, total customers, stock value, outstanding debt
 */
export async function GET() {
  try {
    const { error, tenantId } = await requireTenant()
    if (error) return error!

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1)

    // Last 7 days range
    const sevenDaysAgo = new Date(todayStart)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)

    const [
      salesLast7,
      allPayments,
      allSaleItems,
      todaySales,
      totalCustomers,
      allItems,
      totalDebt,
    ] = await Promise.all([
      // Sales grouped by day (last 7 days)
      prisma.sale.findMany({
        where: { tenantId: tenantId!, createdAt: { gte: sevenDaysAgo, lte: todayEnd } },
        select: { totalAmount: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),

      // All customer payments last 7 days for payment method split
      prisma.customerPayment.findMany({
        where: { tenantId: tenantId!, createdAt: { gte: sevenDaysAgo, lte: todayEnd } },
        select: { amount: true, method: true },
      }),

      // Sale items for top items (last 7 days)
      prisma.saleItem.findMany({
        where: {
          sale: { tenantId: tenantId!, createdAt: { gte: sevenDaysAgo, lte: todayEnd } },
        },
        select: {
          quantity: true,
          price: true,
          item: { select: { id: true, name: true } },
        },
      }),

      // Today's sales for KPI
      prisma.sale.findMany({
        where: { tenantId: tenantId!, createdAt: { gte: todayStart, lte: todayEnd } },
        select: { totalAmount: true },
      }),

      // Total customer count
      prisma.customer.count({ where: { tenantId: tenantId! } }),

      // All items for stock value
      prisma.item.findMany({
        where: { tenantId: tenantId! },
        select: { quantity: true, costPrice: true },
      }),

      // Outstanding customer debt
      prisma.customer.aggregate({
        where: { tenantId: tenantId!, balance: { gt: 0 } },
        _sum: { balance: true },
      }),
    ])

    // Build last 7 days array (fill gaps with 0)
    const salesLast7Days: { date: string; revenue: number; label: string }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayStart)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const dayLabel = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })
      const revenue = salesLast7
        .filter(s => s.createdAt.toISOString().split('T')[0] === dateStr)
        .reduce((sum, s) => sum + s.totalAmount, 0)
      salesLast7Days.push({ date: dateStr, revenue, label: dayLabel })
    }

    // Payment method split
    const paymentMethodSplit = allPayments.reduce<Record<string, number>>((acc, p) => {
      acc[p.method] = (acc[p.method] || 0) + p.amount
      return acc
    }, {})

    // Also include cash sales (not from customer payments)
    const cashSalesTotal = salesLast7
      .filter(s => {
        // we don't have paymentType here but include all sale totals
        return true
      })
      .reduce((sum, s) => sum + s.totalAmount, 0)

    // Top 5 items by revenue
    const itemTotals = allSaleItems.reduce<Record<string, { name: string; revenue: number; qty: number }>>((acc, si) => {
      const id = si.item.id
      if (!acc[id]) acc[id] = { name: si.item.name, revenue: 0, qty: 0 }
      acc[id].revenue += si.price * si.quantity
      acc[id].qty += si.quantity
      return acc
    }, {})

    const topItems = Object.values(itemTotals)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(item => ({ name: item.name, revenue: Math.round(item.revenue * 100) / 100, qty: Math.round(item.qty * 100) / 100 }))

    // KPIs
    const todayRevenue = todaySales.reduce((sum, s) => sum + s.totalAmount, 0)
    const stockValue = allItems.reduce((sum, i) => sum + i.quantity * i.costPrice, 0)

    return NextResponse.json({
      salesLast7Days,
      paymentMethodSplit: [
        { method: 'Cash', value: paymentMethodSplit['CASH'] || 0, color: '#22c55e' },
        { method: 'MoMo', value: paymentMethodSplit['MOMO'] || 0, color: '#f59e0b' },
        { method: 'Bank', value: paymentMethodSplit['BANK'] || 0, color: '#3b82f6' },
      ],
      topItems,
      kpis: {
        todayRevenue,
        totalCustomers,
        stockValue,
        outstandingDebt: totalDebt._sum.balance || 0,
      },
    })
  } catch (err) {
    console.error('Dashboard API error:', err)
    return NextResponse.json({ error: 'Failed to load dashboard data' }, { status: 500 })
  }
}
