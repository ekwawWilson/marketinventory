import type { ReactNode } from 'react'

/**
 * POS Terminal Layout
 * Fullscreen, no sidebar or header — dedicated checkout mode.
 * Overrides the root layout's AppLayout wrapper.
 */
export default function PosLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
