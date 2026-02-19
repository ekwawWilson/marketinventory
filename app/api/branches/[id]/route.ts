import { NextResponse } from 'next/server'
import { requireTenant } from '@/lib/tenant/requireTenant'
import { requirePermission } from '@/lib/permissions/rbac'
import { prisma } from '@/lib/db/prisma'

/**
 * /api/branches/[id]
 *
 * GET    - Get single branch
 * PUT    - Update branch (OWNER only)
 * DELETE - Delete branch (OWNER only, cannot delete default or only branch)
 */

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, tenantId } = await requireTenant()
    if (error) return error!

    const { id } = await params

    const branch = await prisma.branch.findFirst({
      where: { id, tenantId: tenantId! },
      include: {
        users: { select: { id: true, name: true, role: true, email: true } },
        _count: { select: { users: true } },
      },
    })

    if (!branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
    }

    return NextResponse.json(branch)
  } catch (err) {
    console.error('Failed to fetch branch:', err)
    return NextResponse.json({ error: 'Failed to fetch branch' }, { status: 500 })
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, tenantId, user } = await requireTenant()
    if (error) return error!

    const { authorized, error: permError } = requirePermission(user!.role, 'manage_settings')
    if (!authorized) return permError!

    const { id } = await params
    const body = await req.json()

    const branch = await prisma.branch.findFirst({
      where: { id, tenantId: tenantId! },
    })

    if (!branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
    }

    // If setting as default, unset previous default
    if (body.isDefault) {
      await prisma.branch.updateMany({
        where: { tenantId: tenantId!, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      })
    }

    const updated = await prisma.branch.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name.trim() }),
        ...(body.address !== undefined && { address: body.address?.trim() || null }),
        ...(body.phone !== undefined && { phone: body.phone?.trim() || null }),
        ...(body.isDefault !== undefined && { isDefault: body.isDefault }),
      },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('Failed to update branch:', err)
    return NextResponse.json({ error: 'Failed to update branch' }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, tenantId, user } = await requireTenant()
    if (error) return error!

    const { authorized, error: permError } = requirePermission(user!.role, 'manage_settings')
    if (!authorized) return permError!

    const { id } = await params

    const branch = await prisma.branch.findFirst({
      where: { id, tenantId: tenantId! },
    })

    if (!branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
    }

    if (branch.isDefault) {
      return NextResponse.json(
        { error: 'Cannot delete the default branch. Set another branch as default first.' },
        { status: 400 }
      )
    }

    const totalBranches = await prisma.branch.count({ where: { tenantId: tenantId! } })
    if (totalBranches <= 1) {
      return NextResponse.json({ error: 'Cannot delete the only branch' }, { status: 400 })
    }

    // Unassign users from this branch before deleting
    await prisma.user.updateMany({
      where: { branchId: id },
      data: { branchId: null },
    })

    await prisma.branch.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Failed to delete branch:', err)
    return NextResponse.json({ error: 'Failed to delete branch' }, { status: 500 })
  }
}
