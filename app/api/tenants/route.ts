import { NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/db/prisma'
import { Role, TenantStatus } from '@/lib/generated/prisma/client'

/**
 * Tenants API
 *
 * POST /api/tenants - Create new tenant (signup/registration)
 */

/**
 * POST /api/tenants
 * Create a new tenant with owner user (signup)
 * This is a public endpoint (no authentication required)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Validate required fields
    const validationError = validateSignupData(body)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: body.email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await hash(body.password, 10)

    // Create tenant and owner user atomically
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name: body.businessName.trim(),
          phone: body.phone ? body.phone.trim() : null,
          status: TenantStatus.TRIAL, // Start with trial
        },
      })

      // 2. Create owner user
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          name: body.name.trim(),
          email: body.email.toLowerCase().trim(),
          password: hashedPassword,
          role: Role.OWNER,
        },
      })

      return { tenant, user }
    })

    // Don't return password in response
    const { password: _, ...userWithoutPassword } = result.user

    return NextResponse.json(
      {
        message: 'Account created successfully',
        tenant: result.tenant,
        user: userWithoutPassword,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('Failed to create tenant:', err)
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}

/**
 * Validate signup data
 */
function validateSignupData(data: any): string | null {
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    return 'Your name is required'
  }

  if (!data.email || typeof data.email !== 'string') {
    return 'Email is required'
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(data.email)) {
    return 'Invalid email format'
  }

  if (!data.password || typeof data.password !== 'string' || data.password.length < 8) {
    return 'Password must be at least 8 characters'
  }

  if (!data.businessName || typeof data.businessName !== 'string' || data.businessName.trim().length === 0) {
    return 'Business name is required'
  }

  return null
}
