import { NextResponse } from 'next/server'
import { requireTenant } from '@/lib/tenant/requireTenant'
import { requirePermission } from '@/lib/permissions/rbac'
import { prisma } from '@/lib/db/prisma'
import { PaymentType } from '@/lib/generated/prisma/client'

/**
 * Sales API Routes
 *
 * GET /api/sales - List all sales
 * POST /api/sales - Create new sale with atomic transaction
 */

/**
 * GET /api/sales
 * List all sales for the current tenant
 * Optional query params: customerId, paymentType, startDate, endDate
 */
export async function GET(req: Request) {
  try {
    const { error, tenantId } = await requireTenant()
    if (error) return error!

    const { searchParams } = new URL(req.url)
    const customerId = searchParams.get('customerId')
    const paymentType = searchParams.get('paymentType')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build where clause
    const where: any = { tenantId: tenantId! }

    if (customerId) {
      where.customerId = customerId
    }

    if (paymentType) {
      where.paymentType = paymentType as PaymentType
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Calculate summary
    const summary = {
      total: sales.length,
      totalAmount: sales.reduce((sum, sale) => sum + sale.totalAmount, 0),
      totalPaid: sales.reduce((sum, sale) => sum + sale.paidAmount, 0),
      totalCredit: sales.reduce(
        (sum, sale) => sum + (sale.totalAmount - sale.paidAmount),
        0
      ),
    }

    return NextResponse.json({ sales, summary })
  } catch (err) {
    console.error('Failed to fetch sales:', err)
    return NextResponse.json(
      { error: 'Failed to fetch sales' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/sales
 * Create a new sale with atomic transaction
 * Requires: create_sale permission
 *
 * Atomically:
 * 1. Creates sale record
 * 2. Creates sale items
 * 3. Reduces item stock
 * 4. Updates customer balance (if credit sale)
 */
export async function POST(req: Request) {
  try {
    const { error, tenantId, user } = await requireTenant()
    if (error) return error!

    // Check permission
    const { authorized, error: permError } = requirePermission(
      user!.role,
      'create_sale'
    )
    if (!authorized) return permError!

    const body = await req.json()

    // Validate request
    const validationError = validateSaleRequest(body)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    // If customer is provided, verify it belongs to tenant
    if (body.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: body.customerId, tenantId: tenantId! },
      })

      if (!customer) {
        return NextResponse.json(
          { error: 'Customer not found or does not belong to your tenant' },
          { status: 404 }
        )
      }
    }

    // Verify all items belong to tenant and have sufficient stock
    const itemIds = body.items.map((item: any) => item.itemId)
    const items = await prisma.item.findMany({
      where: {
        id: { in: itemIds },
        tenantId,
      },
    })

    if (items.length !== itemIds.length) {
      return NextResponse.json(
        { error: 'One or more items not found or do not belong to your tenant' },
        { status: 404 }
      )
    }

    // Check stock availability
    for (const saleItem of body.items) {
      const item = items.find((i) => i.id === saleItem.itemId)
      if (!item) continue

      if (item.quantity < saleItem.quantity) {
        return NextResponse.json(
          {
            error: `Insufficient stock for item "${item.name}". Available: ${item.quantity}, Requested: ${saleItem.quantity}`,
          },
          { status: 400 }
        )
      }
    }

    // Calculate totals
    let totalAmount = 0
    const saleItemsData = body.items.map((saleItem: any) => {
      const item = items.find((i) => i.id === saleItem.itemId)!
      const price = saleItem.price || item.sellingPrice
      const subtotal = price * saleItem.quantity
      totalAmount += subtotal

      return {
        itemId: saleItem.itemId,
        quantity: saleItem.quantity,
        price,
      }
    })

    const paidAmount = body.paidAmount || 0
    const creditAmount = totalAmount - paidAmount

    // Validate payment
    if (paidAmount > totalAmount) {
      return NextResponse.json(
        { error: 'Paid amount cannot exceed total amount' },
        { status: 400 }
      )
    }

    if (creditAmount > 0 && !body.customerId) {
      return NextResponse.json(
        { error: 'Customer is required for credit sales' },
        { status: 400 }
      )
    }

    // Execute atomic transaction
    const sale = await prisma.$transaction(async (tx) => {
      // 1. Create sale
      const newSale = await tx.sale.create({
        data: {
          tenantId,
          customerId: body.customerId || null,
          totalAmount,
          paidAmount,
          paymentType: creditAmount > 0 ? PaymentType.CREDIT : PaymentType.CASH,
        },
      })

      // 2. Create sale items
      await tx.saleItem.createMany({
        data: saleItemsData.map((item: any) => ({
          saleId: newSale.id,
          ...item,
        })),
      })

      // 3. Reduce item stock
      for (const saleItem of body.items) {
        await tx.item.update({
          where: { id: saleItem.itemId },
          data: {
            quantity: {
              decrement: saleItem.quantity,
            },
          },
        })
      }

      // 4. Update customer balance (if credit sale)
      if (creditAmount > 0 && body.customerId) {
        await tx.customer.update({
          where: { id: body.customerId },
          data: {
            balance: {
              increment: creditAmount,
            },
          },
        })
      }

      return newSale
    })

    // Fetch complete sale data
    const completeSale = await prisma.sale.findUnique({
      where: { id: sale.id },
      include: {
        customer: true,
        items: {
          include: {
            item: true,
          },
        },
      },
    })

    return NextResponse.json(completeSale, { status: 201 })
  } catch (err) {
    console.error('Failed to create sale:', err)
    return NextResponse.json(
      { error: 'Failed to create sale' },
      { status: 500 }
    )
  }
}

/**
 * Validate sale request data
 */
function validateSaleRequest(data: any): string | null {
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    return 'At least one item is required'
  }

  for (const item of data.items) {
    if (!item.itemId || typeof item.itemId !== 'string') {
      return 'Each item must have a valid itemId'
    }

    if (!item.quantity || isNaN(item.quantity) || item.quantity <= 0) {
      return 'Each item must have a positive quantity'
    }

    if (item.price !== undefined && (isNaN(parseFloat(item.price)) || parseFloat(item.price) < 0)) {
      return 'Item price must be a non-negative number'
    }
  }

  if (data.paidAmount !== undefined && (isNaN(parseFloat(data.paidAmount)) || parseFloat(data.paidAmount) < 0)) {
    return 'Paid amount must be a non-negative number'
  }

  return null
}
