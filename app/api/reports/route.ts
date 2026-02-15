import { NextResponse } from 'next/server'
import { requireTenant } from '@/lib/tenant/requireTenant'
import { prisma } from '@/lib/db/prisma'
import { hasPermission, type Role } from '@/lib/permissions/rbac'

/**
 * Comprehensive Reports API
 *
 * GET /api/reports?type={type}&startDate={date}&endDate={date}
 *
 * Report Types:
 * - sales: Sales summary by date range
 * - purchases: Purchase summary by date range
 * - inventory: Current stock levels
 * - debtors: Customer balances (accounts receivable)
 * - creditors: Supplier balances (accounts payable)
 * - profit: Profit/loss calculations
 * - dashboard: Combined summary for dashboard
 * - end-of-day: Comprehensive daily summary
 */

export async function GET(req: Request) {
  try {
    const { error, tenantId, user } = await requireTenant()
    if (error) return error!

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'dashboard'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build date filter
    const dateFilter: any = {}
    if (startDate) dateFilter.gte = new Date(startDate)
    if (endDate) dateFilter.lte = new Date(endDate)

    switch (type) {
      case 'sales':
        return await salesReport(tenantId, dateFilter)
      case 'purchases':
        return await purchasesReport(tenantId, dateFilter)
      case 'inventory':
        return await inventoryReport(tenantId)
      case 'debtors':
        return await debtorsReport(tenantId)
      case 'creditors':
        return await creditorsReport(tenantId)
      case 'profit':
        return await profitReport(tenantId, dateFilter)
      case 'dashboard':
        return await dashboardReport(tenantId)
      case 'end-of-day':
        return await endOfDayReport(tenantId, dateFilter, user?.role as Role)
      default:
        return NextResponse.json(
          { error: 'Invalid report type' },
          { status: 400 }
        )
    }
  } catch (err) {
    console.error('Failed to generate report:', err)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}

/**
 * Sales Report
 */
async function salesReport(tenantId: string, dateFilter: any) {
  const where: any = { tenantId: tenantId! }
  if (Object.keys(dateFilter).length > 0) {
    where.createdAt = dateFilter
  }

  const sales = await prisma.sale.findMany({
    where,
    include: {
      customer: { select: { name: true } },
      items: { include: { item: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0)
  const totalPaid = sales.reduce((sum, s) => sum + s.paidAmount, 0)
  const totalCredit = totalSales - totalPaid
  const cashSales = sales.filter(s => s.paymentType === 'CASH').length
  const creditSales = sales.filter(s => s.paymentType === 'CREDIT').length

  return NextResponse.json({
    type: 'sales',
    period: { start: dateFilter.gte, end: dateFilter.lte },
    summary: {
      totalTransactions: sales.length,
      totalSales,
      totalPaid,
      totalCredit,
      cashSales,
      creditSales,
      averageTransaction: sales.length > 0 ? totalSales / sales.length : 0,
    },
    sales,
  })
}

/**
 * Purchases Report
 */
async function purchasesReport(tenantId: string, dateFilter: any) {
  const where: any = { tenantId: tenantId! }
  if (Object.keys(dateFilter).length > 0) {
    where.createdAt = dateFilter
  }

  const purchases = await prisma.purchase.findMany({
    where,
    include: {
      supplier: { select: { name: true } },
      items: { include: { item: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const totalPurchases = purchases.reduce((sum, p) => sum + p.totalAmount, 0)
  const totalPaid = purchases.reduce((sum, p) => sum + p.paidAmount, 0)
  const totalCredit = totalPurchases - totalPaid

  return NextResponse.json({
    type: 'purchases',
    period: { start: dateFilter.gte, end: dateFilter.lte },
    summary: {
      totalTransactions: purchases.length,
      totalPurchases,
      totalPaid,
      totalCredit,
      averageTransaction: purchases.length > 0 ? totalPurchases / purchases.length : 0,
    },
    purchases,
  })
}

/**
 * Inventory Report
 */
async function inventoryReport(tenantId: string) {
  const items = await prisma.item.findMany({
    where: { tenantId: tenantId! },
    include: {
      manufacturer: { select: { name: true } },
    },
    orderBy: { name: 'asc' },
  })

  const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0)
  const potentialRevenue = items.reduce((sum, item) => sum + (item.quantity * item.sellingPrice), 0)
  const lowStockItems = items.filter(item => item.quantity <= 10)
  const outOfStockItems = items.filter(item => item.quantity === 0)

  return NextResponse.json({
    type: 'inventory',
    summary: {
      totalItems: items.length,
      totalStockValue: totalValue,
      potentialRevenue,
      potentialProfit: potentialRevenue - totalValue,
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
    },
    items,
    lowStockItems,
    outOfStockItems,
  })
}

/**
 * Debtors Report (Customers with Outstanding Balances)
 */
async function debtorsReport(tenantId: string) {
  const customers = await prisma.customer.findMany({
    where: {
      tenantId,
      balance: { gt: 0 },
    },
    include: {
      _count: { select: { sales: true } },
    },
    orderBy: { balance: 'desc' },
  })

  const totalDebt = customers.reduce((sum, c) => sum + c.balance, 0)

  return NextResponse.json({
    type: 'debtors',
    summary: {
      totalDebtors: customers.length,
      totalDebt,
      averageDebt: customers.length > 0 ? totalDebt / customers.length : 0,
    },
    debtors: customers,
  })
}

/**
 * Creditors Report (Suppliers with Outstanding Balances)
 */
async function creditorsReport(tenantId: string) {
  const suppliers = await prisma.supplier.findMany({
    where: {
      tenantId,
      balance: { gt: 0 },
    },
    include: {
      _count: { select: { purchases: true } },
    },
    orderBy: { balance: 'desc' },
  })

  const totalCredit = suppliers.reduce((sum, s) => sum + s.balance, 0)

  return NextResponse.json({
    type: 'creditors',
    summary: {
      totalCreditors: suppliers.length,
      totalCredit,
      averageCredit: suppliers.length > 0 ? totalCredit / suppliers.length : 0,
    },
    creditors: suppliers,
  })
}

/**
 * Profit/Loss Report
 */
async function profitReport(tenantId: string, dateFilter: any) {
  const where: any = { tenantId: tenantId! }
  if (Object.keys(dateFilter).length > 0) {
    where.createdAt = dateFilter
  }

  // Get sales with items
  const sales = await prisma.sale.findMany({
    where,
    include: {
      items: {
        include: {
          item: { select: { costPrice: true } },
        },
      },
    },
  })

  // Calculate revenue and cost
  let totalRevenue = 0
  let totalCost = 0

  for (const sale of sales) {
    totalRevenue += sale.totalAmount
    for (const saleItem of sale.items) {
      totalCost += saleItem.item.costPrice * saleItem.quantity
    }
  }

  const grossProfit = totalRevenue - totalCost
  const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0

  return NextResponse.json({
    type: 'profit',
    period: { start: dateFilter.gte, end: dateFilter.lte },
    summary: {
      totalRevenue,
      totalCost,
      grossProfit,
      profitMargin: profitMargin.toFixed(2) + '%',
      totalTransactions: sales.length,
      averageProfit: sales.length > 0 ? grossProfit / sales.length : 0,
    },
  })
}

/**
 * Dashboard Report (Combined Summary)
 */
async function dashboardReport(tenantId: string) {
  // Get counts and totals in parallel
  const [
    totalItems,
    totalCustomers,
    totalSuppliers,
    totalSales,
    totalPurchases,
    lowStockItems,
    customersWithDebt,
    suppliersWithCredit,
  ] = await Promise.all([
    prisma.item.count({ where: { tenantId: tenantId! } }),
    prisma.customer.count({ where: { tenantId: tenantId! } }),
    prisma.supplier.count({ where: { tenantId: tenantId! } }),
    prisma.sale.findMany({ where: { tenantId: tenantId! } }),
    prisma.purchase.findMany({ where: { tenantId: tenantId! } }),
    prisma.item.findMany({ where: { tenantId, quantity: { lte: 10 } } }),
    prisma.customer.findMany({ where: { tenantId, balance: { gt: 0 } } }),
    prisma.supplier.findMany({ where: { tenantId, balance: { gt: 0 } } }),
  ])

  const totalRevenue = totalSales.reduce((sum, s) => sum + s.totalAmount, 0)
  const totalCost = totalPurchases.reduce((sum, p) => sum + p.totalAmount, 0)
  const totalDebt = customersWithDebt.reduce((sum, c) => sum + c.balance, 0)
  const totalCredit = suppliersWithCredit.reduce((sum, s) => sum + s.balance, 0)

  return NextResponse.json({
    type: 'dashboard',
    summary: {
      inventory: {
        totalItems,
        lowStockCount: lowStockItems.length,
      },
      contacts: {
        totalCustomers,
        customersWithDebt: customersWithDebt.length,
        totalSuppliers,
        suppliersWithCredit: suppliersWithCredit.length,
      },
      financial: {
        totalSales: totalSales.length,
        totalRevenue,
        totalPurchases: totalPurchases.length,
        totalCost,
        totalDebt,
        totalCredit,
        netPosition: totalDebt - totalCredit,
      },
      alerts: {
        lowStockItems: lowStockItems.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
        })),
      },
    },
  })
}

/**
 * End of Day Report (Comprehensive Daily Summary)
 */
async function endOfDayReport(tenantId: string, dateFilter: any, userRole?: Role) {
  const dayWhere: any = { tenantId }
  if (Object.keys(dateFilter).length > 0) {
    dayWhere.createdAt = dateFilter
  }

  const [
    sales,
    purchases,
    customerPayments,
    supplierPayments,
    stockAdjustmentCount,
    lowStockItems,
    outOfStockItems,
    topDebtors,
    totalDebtAggregate,
  ] = await Promise.all([
    prisma.sale.findMany({
      where: dayWhere,
      include: {
        customer: { select: { name: true } },
        items: {
          include: {
            item: { select: { name: true, costPrice: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.purchase.findMany({
      where: dayWhere,
      include: {
        supplier: { select: { name: true } },
        items: {
          include: {
            item: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.customerPayment.findMany({ where: dayWhere }),
    prisma.supplierPayment.findMany({ where: dayWhere }),
    prisma.stockAdjustment.count({ where: dayWhere }),
    prisma.item.findMany({
      where: { tenantId, quantity: { gt: 0, lte: 10 } },
      select: { id: true, name: true, quantity: true },
      orderBy: { quantity: 'asc' },
    }),
    prisma.item.findMany({
      where: { tenantId, quantity: { equals: 0 } },
      select: { id: true, name: true, quantity: true },
    }),
    prisma.customer.findMany({
      where: { tenantId, balance: { gt: 0 } },
      orderBy: { balance: 'desc' },
      take: 5,
      select: { id: true, name: true, phone: true, balance: true },
    }),
    prisma.customer.aggregate({
      where: { tenantId, balance: { gt: 0 } },
      _sum: { balance: true },
      _count: true,
    }),
  ])

  // Sales Summary
  const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0)
  const cashSales = sales.filter(s => s.paymentType === 'CASH')
  const creditSales = sales.filter(s => s.paymentType === 'CREDIT')

  // Top 5 selling items
  const itemSalesMap: Record<string, { name: string; quantity: number; revenue: number }> = {}
  for (const sale of sales) {
    for (const si of sale.items) {
      const key = si.itemId
      if (!itemSalesMap[key]) {
        itemSalesMap[key] = { name: si.item.name, quantity: 0, revenue: 0 }
      }
      itemSalesMap[key].quantity += si.quantity
      itemSalesMap[key].revenue += si.price * si.quantity
    }
  }
  const topSellingItems = Object.values(itemSalesMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5)

  // Cash & Payments
  const cashPayments = customerPayments.filter(p => p.method === 'CASH').reduce((s, p) => s + p.amount, 0)
  const momoPayments = customerPayments.filter(p => p.method === 'MOMO').reduce((s, p) => s + p.amount, 0)
  const bankPayments = customerPayments.filter(p => p.method === 'BANK').reduce((s, p) => s + p.amount, 0)
  const totalCustomerPayments = customerPayments.reduce((s, p) => s + p.amount, 0)
  const newCreditIssued = creditSales.reduce((s, sale) => s + (sale.totalAmount - sale.paidAmount), 0)

  // Purchases
  const totalPurchaseAmount = purchases.reduce((sum, p) => sum + p.totalAmount, 0)
  const cashPurchases = purchases.filter(p => p.paymentType === 'CASH')
  const creditPurchases = purchases.filter(p => p.paymentType === 'CREDIT')
  const restockedItems: { name: string; quantity: number }[] = []
  for (const purchase of purchases) {
    for (const pi of purchase.items) {
      restockedItems.push({ name: pi.item.name, quantity: pi.quantity })
    }
  }
  const totalSupplierPayments = supplierPayments.reduce((s, p) => s + p.amount, 0)

  // Profit
  let totalCOGS = 0
  for (const sale of sales) {
    for (const si of sale.items) {
      totalCOGS += si.item.costPrice * si.quantity
    }
  }
  const grossProfit = totalRevenue - totalCOGS
  const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0

  // Build response
  const response: any = {
    type: 'end-of-day',
    date: dateFilter.gte || null,

    salesSummary: {
      totalCount: sales.length,
      totalRevenue,
      cashSalesCount: cashSales.length,
      cashSalesAmount: cashSales.reduce((s, sale) => s + sale.totalAmount, 0),
      creditSalesCount: creditSales.length,
      creditSalesAmount: creditSales.reduce((s, sale) => s + sale.totalAmount, 0),
      averageSaleValue: sales.length > 0 ? totalRevenue / sales.length : 0,
      topSellingItems,
    },

    cashAndPayments: {
      cashSalesReceived: cashSales.reduce((s, sale) => s + sale.paidAmount, 0),
      customerPaymentsByMethod: { CASH: cashPayments, MOMO: momoPayments, BANK: bankPayments },
      totalCustomerPayments,
      newCreditIssued,
    },

    purchasesSummary: {
      totalCount: purchases.length,
      totalAmount: totalPurchaseAmount,
      cashPurchasesCount: cashPurchases.length,
      cashPurchasesAmount: cashPurchases.reduce((s, p) => s + p.totalAmount, 0),
      creditPurchasesCount: creditPurchases.length,
      creditPurchasesAmount: creditPurchases.reduce((s, p) => s + p.totalAmount, 0),
      restockedItems,
      totalSupplierPayments,
    },

    inventoryAlerts: {
      lowStockItems,
      lowStockCount: lowStockItems.length,
      outOfStockItems,
      outOfStockCount: outOfStockItems.length,
      stockAdjustmentsCount: stockAdjustmentCount,
    },

    creditAndDebt: {
      totalOutstandingDebt: totalDebtAggregate._sum.balance || 0,
      totalDebtorsCount: totalDebtAggregate._count,
      newDebtToday: newCreditIssued,
      debtCollectedToday: totalCustomerPayments,
      topDebtors,
    },
  }

  // Only include profit if user has permission
  if (userRole && hasPermission(userRole, 'view_profit_margins')) {
    response.profitSummary = {
      totalRevenue,
      totalCOGS,
      grossProfit,
      profitMargin: Number(profitMargin.toFixed(2)),
    }
  }

  return NextResponse.json(response)
}
