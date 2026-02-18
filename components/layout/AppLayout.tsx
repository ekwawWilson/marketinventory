'use client'

import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { BottomNav } from './BottomNav'
import { ReactNode } from 'react'

/**
 * App Layout Component
 *
 * Responsive layout:
 * - Mobile (<768px): Top header + bottom tab navigation
 * - Tablet/Desktop (>=768px): Sidebar + header
 */

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop/Tablet Sidebar - hidden on mobile */}
      <Sidebar />

      {/* Main content area */}
      <div className="pl-64 flex flex-col min-h-screen">
        <Header />

        <main className="flex-1 pb-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            {children}
          </div>
        </main>

        {/* Branding footer — desktop only */}
        <footer className="border-t border-gray-100 bg-white px-6 py-3">
          <p className="text-xs text-gray-400 text-center">
            <span className="font-semibold text-gray-500">PETROS Business Management Mini</span>
            {' · '}Developed by <span className="font-semibold text-gray-500">EYO Solutions</span>
            {' · '}0246462398
          </p>
        </footer>
      </div>

      {/* Mobile Bottom Tab Navigation - shown only on mobile */}
      <BottomNav />
    </div>
  )
}
