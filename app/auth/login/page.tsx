'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { ImprovedLogin } from './ImprovedLogin'

/**
 * Login Page
 *
 * Improved UX with:
 * - Large, easy-to-tap buttons
 * - Clear labels and instructions
 * - Demo account quick-fill
 * - Password visibility toggle
 * - Beautiful gradient design
 */

function LoginPageContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  return <ImprovedLogin error={error || undefined} />
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginPageContent />
    </Suspense>
  )
}
