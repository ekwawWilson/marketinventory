import { NextResponse } from 'next/server'
import { requireTenant } from '@/lib/tenant/requireTenant'
import { requireOwner, Role } from '@/lib/permissions/rbac'
import { prisma } from '@/lib/db/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const { error, tenantId, user } = await requireTenant()
    if (error) return error!

    const { authorized, error: roleError } = requireOwner(user!.role)
    if (!authorized) return roleError!

    const { id } = await params
    const body = await req.json()

    const targetUser = await prisma.user.findFirst({ where: { id, tenantId: tenantId! } })
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const validRoles = ['OWNER', 'STORE_MANAGER', 'CASHIER', 'INVENTORY_MANAGER', 'ACCOUNTANT', 'STAFF']
    if (body.role && !validRoles.includes(body.role)) {
      return NextResponse.json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` }, { status: 400 })
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name.trim() }),
        ...(body.role && { role: body.role as never }),
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('Failed to update user:', err)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { error, tenantId, user } = await requireTenant()
    if (error) return error!

    const { authorized, error: roleError } = requireOwner(user!.role)
    if (!authorized) return roleError!

    const { id } = await params

    if (id === user!.id) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 })
    }

    const targetUser = await prisma.user.findFirst({ where: { id, tenantId: tenantId! } })
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (err) {
    console.error('Failed to delete user:', err)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
