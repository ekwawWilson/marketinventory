import { NextResponse } from 'next/server'
import { requireTenant } from '@/lib/tenant/requireTenant'
import { requirePermission } from '@/lib/permissions/rbac'
import { prisma } from '@/lib/db/prisma'
import { PaymentType } from '@prisma/client'

/**
 * Purchases API Routes
 *
 * GET /api/purchases - List all purchases
 * POST /api/purchases - Create new purchase with atomic transaction
 */

/**
 * GET /api/purchases
 * List all purchases for the current tenant
 * Optional query params: supplierId, paymentType, startDate, endDate
 */
export async function GET(req: Request) {
  try {
    const { error, tenantId } = await requireTenant()
    if (error) return error!

    const { searchParams } = new URL(req.url)
    const supplierId = searchParams.get('supplierId')
    const paymentType = searchParams.get('paymentType')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { tenantId: tenantId! }

    if (supplierId) {
      where.supplierId = supplierId
    }

    if (paymentType) {
      where.paymentType = paymentType as PaymentType
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    const purchases = await prisma.purchase.findMany({
      where,
      include: {
        supplier: {
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
      total: purchases.length,
      totalAmount: purchases.reduce((sum, purchase) => sum + purchase.totalAmount, 0),
      totalPaid: purchases.reduce((sum, purchase) => sum + purchase.paidAmount, 0),
      totalCredit: purchases.reduce(
        (sum, purchase) => sum + (purchase.totalAmount - purchase.paidAmount),
        0
      ),
    }

    return NextResponse.json({ purchases, summary })
  } catch (err) {
    console.error('Failed to fetch purchases:', err)
    return NextResponse.json(
      { error: 'Failed to fetch purchases' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/purchases
 * Create a new purchase with atomic transaction
 * Requires: create_purchase permission
 *
 * Atomically:
 * 1. Creates purchase record
 * 2. Creates purchase items
 * 3. Increases item stock
 * 4. Updates supplier balance (if credit purchase)
 */
export async function POST(req: Request) {
  try {
    const { error, tenantId, user } = await requireTenant()
    if (error) return error!

    // Check permission
    const { authorized, error: permError } = requirePermission(
      user!.role,
      'create_purchase'
    )
    if (!authorized) return permError!

    const body = await req.json()

    // Validate request
    const validationError = validatePurchaseRequest(body)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    // Verify supplier belongs to tenant
    const supplier = await prisma.supplier.findFirst({
      where: { id: body.supplierId, tenantId: tenantId! },
    })

    if (!supplier) {
      return NextResponse.json(
        { error: 'Supplier not found or does not belong to your tenant' },
        { status: 404 }
      )
    }

    // Verify all items belong to tenant
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // Calculate totals
    let totalAmount = 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const purchaseItemsData = body.items.map((purchaseItem: any) => {
      const item = items.find((i) => i.id === purchaseItem.itemId)!
      const costPrice = purchaseItem.costPrice || item.costPrice
      const subtotal = costPrice * purchaseItem.quantity
      totalAmount += subtotal

      return {
        itemId: purchaseItem.itemId,
        quantity: purchaseItem.quantity,
        costPrice,
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

    // Execute atomic transaction
    const purchase = await prisma.$transaction(async (tx) => {
      // 1. Create purchase
      const newPurchase = await tx.purchase.create({
        data: {
          tenantId,
          supplierId: body.supplierId,
          totalAmount,
          paidAmount,
          paymentType: creditAmount > 0 ? PaymentType.CREDIT : PaymentType.CASH,
        },
      })

      // 2. Create purchase items
      await tx.purchaseItem.createMany({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: purchaseItemsData.map((item: any) => ({
          purchaseId: newPurchase.id,
          ...item,
        })),
      })

      // 3. Increase item stock
      for (const purchaseItem of body.items) {
        await tx.item.update({
          where: { id: purchaseItem.itemId },
          data: {
            quantity: {
              increment: purchaseItem.quantity,
            },
          },
        })
      }

      // 4. Update supplier balance (if credit purchase)
      if (creditAmount > 0) {
        await tx.supplier.update({
          where: { id: body.supplierId },
          data: {
            balance: {
              increment: creditAmount,
            },
          },
        })
      }

      return newPurchase
    })

    // Fetch complete purchase data
    const completePurchase = await prisma.purchase.findUnique({
      where: { id: purchase.id },
      include: {
        supplier: true,
        items: {
          include: {
            item: true,
          },
        },
      },
    })

    return NextResponse.json(completePurchase, { status: 201 })
  } catch (err) {
    console.error('Failed to create purchase:', err)
    return NextResponse.json(
      { error: 'Failed to create purchase' },
      { status: 500 }
    )
  }
}

/**
 * Validate purchase request data
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validatePurchaseRequest(data: any): string | null {
  if (!data.supplierId || typeof data.supplierId !== 'string') {
    return 'Supplier ID is required'
  }

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

    if (item.costPrice !== undefined && (isNaN(parseFloat(item.costPrice)) || parseFloat(item.costPrice) < 0)) {
      return 'Item cost price must be a non-negative number'
    }
  }

  if (data.paidAmount !== undefined && (isNaN(parseFloat(data.paidAmount)) || parseFloat(data.paidAmount) < 0)) {
    return 'Paid amount must be a non-negative number'
  }

  return null
}
