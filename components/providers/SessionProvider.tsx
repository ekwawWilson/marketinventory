'use client'

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'
import { type ReactNode } from 'react'

/**
 * Session Provider Wrapper
 *
 * Wraps the app with NextAuth session context.
 * Makes session available to all client components via useSession hook.
 */

interface SessionProviderProps {
  children: ReactNode
}

export function SessionProvider({ children }: SessionProviderProps) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>
}
