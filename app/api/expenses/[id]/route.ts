import { NextResponse } from 'next/server'
import { requireTenant } from '@/lib/tenant/requireTenant'
import { requirePermission } from '@/lib/permissions/rbac'
import { prisma } from '@/lib/db/prisma'

/**
 * DELETE /api/expenses/[id] - Delete an expense
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { error, tenantId, user } = await requireTenant()
    if (error) return error!

    const { authorized, error: permError } = requirePermission(user!.role, 'delete_expenses')
    if (!authorized) return permError!

    const expense = await prisma.expense.findFirst({
      where: { id, tenantId: tenantId! },
    })

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    await prisma.expense.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Failed to delete expense:', err)
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 })
  }
}
