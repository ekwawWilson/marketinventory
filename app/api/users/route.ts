import { NextResponse } from 'next/server'
import { requireTenant } from '@/lib/tenant/requireTenant'
import { requireOwner, Role } from '@/lib/permissions/rbac'
import { prisma } from '@/lib/db/prisma'
import { hash } from 'bcryptjs'

export async function GET(req: Request) {
  try {
    const { error, tenantId } = await requireTenant()
    if (error) return error!

    const users = await prisma.user.findMany({
      where: { tenantId: tenantId! },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(users)
  } catch (err) {
    console.error('Failed to fetch users:', err)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { error, tenantId, user } = await requireTenant()
    if (error) return error!

    const { authorized, error: roleError } = requireOwner(user!.role)
    if (!authorized) return roleError!

    const body = await req.json()

    if (!body.name || !body.email || !body.password || !body.role) {
      return NextResponse.json({ error: 'Name, email, password and role are required' }, { status: 400 })
    }

    const validRoles = ['OWNER', 'STORE_MANAGER', 'CASHIER', 'INVENTORY_MANAGER', 'ACCOUNTANT', 'STAFF']
    if (!validRoles.includes(body.role)) {
      return NextResponse.json({ error: `Role must be one of: ${validRoles.join(', ')}` }, { status: 400 })
    }

    if (body.password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email: body.email.toLowerCase().trim() } })
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
    }

    const hashedPassword = await hash(body.password, 10)

    const newUser = await prisma.user.create({
      data: {
        tenantId: tenantId!,
        name: body.name.trim(),
        email: body.email.toLowerCase().trim(),
        password: hashedPassword,
        role: body.role as never,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    })

    return NextResponse.json(newUser, { status: 201 })
  } catch (err) {
    console.error('Failed to create user:', err)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
