import { NextResponse } from 'next/server'
import { requireTenant } from '@/lib/tenant/requireTenant'
import { requireOwner } from '@/lib/permissions/rbac'
import { prisma } from '@/lib/db/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/tenants/[id]/hubtel-credentials
 *
 * Reveals the actual Hubtel Client ID and Client Secret on request.
 *
 * The settings page never receives these in its initial load — only
 * hubtelClientIdSet/hubtelClientSecretSet booleans, so the page can render a
 * masked placeholder without the real secret ever reaching the browser on a
 * page view. This exists for the one moment that isn't enough for: the owner
 * clicking "Show" because they need to check what's actually stored, e.g.
 * against what's in the Hubtel dashboard. OWNER-only, same as the PUT that
 * writes these fields.
 */
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { error, tenantId, user } = await requireTenant()
    if (error) return error!

    const { authorized, error: roleError } = requireOwner(user!.role)
    if (!authorized) return roleError!

    const { id } = await params
    if (id !== tenantId) {
      return NextResponse.json(
        { error: 'You can only view your own tenant information' },
        { status: 403 }
      )
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      select: { hubtelClientId: true, hubtelClientSecret: true },
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    return NextResponse.json({
      hubtelClientId: tenant.hubtelClientId ?? '',
      hubtelClientSecret: tenant.hubtelClientSecret ?? '',
    })
  } catch (err) {
    console.error('Failed to reveal Hubtel credentials:', err)
    return NextResponse.json({ error: 'Failed to reveal credentials' }, { status: 500 })
  }
}
