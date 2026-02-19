import { NextResponse } from 'next/server'
import { requireTenant } from '@/lib/tenant/requireTenant'
import { requirePermission } from '@/lib/permissions/rbac'
import { prisma } from '@/lib/db/prisma'

/**
 * Branches API
 *
 * GET  /api/branches - List all branches for the tenant
 * POST /api/branches - Create a new branch (OWNER only)
 */

export async function GET(req: Request) {
  try {
    const { error, tenantId } = await requireTenant()
    if (error) return error!

    const branches = await prisma.branch.findMany({
      where: { tenantId: tenantId! },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      include: {
        _count: { select: { users: true } },
      },
    })

    return NextResponse.json({ branches })
  } catch (err) {
    console.error('Failed to fetch branches:', err)
    return NextResponse.json({ error: 'Failed to fetch branches' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { error, tenantId, user } = await requireTenant()
    if (error) return error!

    const { authorized, error: permError } = requirePermission(user!.role, 'manage_settings')
    if (!authorized) return permError!

    const body = await req.json()

    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: 'Branch name is required' }, { status: 400 })
    }

    // If this is the first branch, make it the default
    const existingCount = await prisma.branch.count({ where: { tenantId: tenantId! } })
    const isDefault = existingCount === 0 ? true : (body.isDefault ?? false)

    // If setting as default, unset any current default
    if (isDefault) {
      await prisma.branch.updateMany({
        where: { tenantId: tenantId!, isDefault: true },
        data: { isDefault: false },
      })
    }

    const branch = await prisma.branch.create({
      data: {
        tenantId: tenantId!,
        name: body.name.trim(),
        address: body.address?.trim() || null,
        phone: body.phone?.trim() || null,
        isDefault,
      },
    })

    return NextResponse.json(branch, { status: 201 })
  } catch (err) {
    console.error('Failed to create branch:', err)
    return NextResponse.json({ error: 'Failed to create branch' }, { status: 500 })
  }
}
