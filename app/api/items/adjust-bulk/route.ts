import { NextResponse } from 'next/server'
import { requireTenant } from '@/lib/tenant/requireTenant'
import { requirePermission } from '@/lib/permissions/rbac'
import { prisma } from '@/lib/db/prisma'

/**
 * POST /api/items/adjust-bulk
 *
 * Bulk item quantity adjustment — match by item name within the tenant.
 *
 * Body:
 *   { adjustments: Array<{ name: string, type: 'add'|'remove'|'set', quantity: number, reason?: string }> }
 *
 * Returns:
 *   { updated: number, skipped: number, errors: string[] }
 *
 * Requires: update_items permission
 * Max 500 adjustments per request.
 */

export async function POST(req: Request) {
  try {
    const { error, tenantId, user } = await requireTenant()
    if (error) return error!

    const { authorized, error: permError } = requirePermission(user!.role, 'update_items')
    if (!authorized) return permError!

    const body = await req.json()
    const adjustments: Array<{ name: string; type: string; quantity: number | string; reason?: string }> =
      body.adjustments

    if (!Array.isArray(adjustments) || adjustments.length === 0) {
      return NextResponse.json({ error: 'adjustments array is required' }, { status: 400 })
    }

    if (adjustments.length > 500) {
      return NextResponse.json({ error: 'Maximum 500 adjustments per request' }, { status: 400 })
    }

    const results = { updated: 0, skipped: 0, errors: [] as string[] }

    for (let i = 0; i < adjustments.length; i++) {
      const { name, type, quantity, reason } = adjustments[i]
      const rowNum = i + 1

      if (!name?.trim()) {
        results.errors.push(`Row ${rowNum}: name is required`)
        results.skipped++
        continue
      }

      if (!['add', 'remove', 'set'].includes(type)) {
        results.errors.push(`Row ${rowNum} (${name}): type must be add, remove, or set`)
        results.skipped++
        continue
      }

      const qty = Number(quantity)
      if (isNaN(qty) || qty < 0) {
        results.errors.push(`Row ${rowNum} (${name}): quantity must be a non-negative number`)
        results.skipped++
        continue
      }

      if (type !== 'set' && qty === 0) {
        results.errors.push(`Row ${rowNum} (${name}): quantity must be > 0 for add/remove`)
        results.skipped++
        continue
      }

      try {
        const item = await prisma.item.findFirst({
          where: { name: { equals: name.trim(), mode: 'insensitive' }, tenantId: tenantId! },
        })

        if (!item) {
          results.errors.push(`Row ${rowNum}: item "${name}" not found`)
          results.skipped++
          continue
        }

        let newQuantity: number
        if (type === 'add') {
          newQuantity = item.quantity + qty
        } else if (type === 'remove') {
          newQuantity = item.quantity - qty
          if (newQuantity < 0) {
            results.errors.push(
              `Row ${rowNum} (${name}): cannot remove ${qty} — only ${item.quantity} in stock`
            )
            results.skipped++
            continue
          }
        } else {
          newQuantity = qty
        }

        await prisma.item.update({ where: { id: item.id }, data: { quantity: newQuantity } })
        results.updated++
      } catch (err) {
        results.errors.push(`Row ${rowNum} (${name}): ${err instanceof Error ? err.message : 'error'}`)
        results.skipped++
      }
    }

    return NextResponse.json(results)
  } catch (err) {
    console.error('Bulk item adjustment failed:', err)
    return NextResponse.json({ error: 'Bulk adjustment failed' }, { status: 500 })
  }
}
