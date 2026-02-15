import { NextResponse } from 'next/server'
import { requireTenant } from '@/lib/tenant/requireTenant'
import { requirePermission } from '@/lib/permissions/rbac'
import { prisma } from '@/lib/db/prisma'
import { StockAdjustmentType } from '@/lib/generated/prisma/client'

/**
 * Stock Adjustments API
 *
 * GET /api/adjustments - List all stock adjustments
 * POST /api/adjustments - Create manual stock adjustment
 */

/**
 * GET /api/adjustments
 * List all stock adjustments
 */
export async function GET(req: Request) {
  try {
    const { error, tenantId } = await requireTenant()
    if (error) return error!

    const { searchParams } = new URL(req.url)
    const itemId = searchParams.get('itemId')
    const type = searchParams.get('type')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = { tenantId: tenantId! }

    if (itemId) {
      where.itemId = itemId
    }

    if (type && Object.values(StockAdjustmentType).includes(type as StockAdjustmentType)) {
      where.type = type as StockAdjustmentType
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    const adjustments = await prisma.stockAdjustment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    const totalIncrease = adjustments
      .filter(a => a.type === StockAdjustmentType.INCREASE)
      .reduce((sum, a) => sum + a.quantity, 0)

    const totalDecrease = adjustments
      .filter(a => a.type === StockAdjustmentType.DECREASE)
      .reduce((sum, a) => sum + a.quantity, 0)

    return NextResponse.json({
      adjustments,
      summary: {
        total: adjustments.length,
        totalIncrease,
        totalDecrease,
        netChange: totalIncrease - totalDecrease,
      },
    })
  } catch (err) {
    console.error('Failed to fetch stock adjustments:', err)
    return NextResponse.json(
      { error: 'Failed to fetch stock adjustments' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/adjustments
 * Create a manual stock adjustment
 * Requires: adjust_stock permission
 *
 * Atomically:
 * 1. Creates adjustment record
 * 2. Updates item stock (INCREASE or DECREASE)
 */
export async function POST(req: Request) {
  try {
    const { error, tenantId, user } = await requireTenant()
    if (error) return error!

    const { authorized, error: permError } = requirePermission(
      user!.role,
      'adjust_stock'
    )
    if (!authorized) return permError!

    const body = await req.json()

    // Validate
    if (!body.itemId || typeof body.itemId !== 'string') {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      )
    }

    if (!body.type || !Object.values(StockAdjustmentType).includes(body.type)) {
      return NextResponse.json(
        { error: 'Valid adjustment type is required (INCREASE or DECREASE)' },
        { status: 400 }
      )
    }

    if (!body.quantity || isNaN(parseInt(body.quantity)) || parseInt(body.quantity) <= 0) {
      return NextResponse.json(
        { error: 'Quantity must be a positive number' },
        { status: 400 }
      )
    }

    if (!body.reason || typeof body.reason !== 'string' || body.reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'Reason is required for stock adjustments' },
        { status: 400 }
      )
    }

    const quantity = parseInt(body.quantity)

    // Verify item belongs to tenant
    const item = await prisma.item.findFirst({
      where: { id: body.itemId, tenantId: tenantId! },
    })

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found or does not belong to your tenant' },
        { status: 404 }
      )
    }

    // For DECREASE, check if there's enough stock
    if (body.type === StockAdjustmentType.DECREASE && item.quantity < quantity) {
      return NextResponse.json(
        {
          error: 'Insufficient stock for decrease adjustment',
          currentStock: item.quantity,
          requestedDecrease: quantity,
        },
        { status: 400 }
      )
    }

    // Execute atomic transaction
    const adjustment = await prisma.$transaction(async (tx) => {
      // 1. Create adjustment record
      const newAdjustment = await tx.stockAdjustment.create({
        data: {
          tenantId,
          itemId: body.itemId,
          type: body.type as StockAdjustmentType,
          quantity,
          reason: body.reason.trim(),
        },
      })

      // 2. Update item stock
      if (body.type === StockAdjustmentType.INCREASE) {
        await tx.item.update({
          where: { id: body.itemId },
          data: {
            quantity: {
              increment: quantity,
            },
          },
        })
      } else {
        await tx.item.update({
          where: { id: body.itemId },
          data: {
            quantity: {
              decrement: quantity,
            },
          },
        })
      }

      return newAdjustment
    })

    // Fetch updated item
    const updatedItem = await prisma.item.findUnique({
      where: { id: body.itemId },
    })

    return NextResponse.json(
      {
        adjustment,
        item: {
          id: updatedItem?.id,
          name: updatedItem?.name,
          previousQuantity: item.quantity,
          newQuantity: updatedItem?.quantity,
          change: body.type === StockAdjustmentType.INCREASE ? quantity : -quantity,
        },
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('Failed to create stock adjustment:', err)
    return NextResponse.json(
      { error: 'Failed to create stock adjustment' },
      { status: 500 }
    )
  }
}
