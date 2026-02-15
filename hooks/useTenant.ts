'use client'

import { useSession } from 'next-auth/react'

/**
 * useTenant Hook
 *
 * Get current tenant information from session
 *
 * @example
 * ```tsx
 * const { tenantId, isLoading } = useTenant()
 * ```
 */

export function useTenant() {
  const { data: session, status } = useSession()

  return {
    tenantId: session?.user?.tenantId || null,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
  }
}
