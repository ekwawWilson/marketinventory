'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { useState } from 'react'
import { BranchSelector } from '@/components/layout/BranchSelector'
import { useSidebar } from '@/lib/sidebar/SidebarContext'

/**
 * Header Component
 *
 * Mobile: Shows app name + user avatar
 * Desktop: Hidden (sidebar handles navigation)
 */

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/sales': 'Sales',
  '/sales/new': 'New Sale',
  '/purchases': 'Purchases',
  '/purchases/new': 'New Purchase',
  '/items': 'Inventory',
  '/items/new': 'Add Item',
  '/manufacturers': 'Manufacturers',
  '/customers': 'Customers',
  '/suppliers': 'Suppliers',
  '/payments': 'Payments',
  '/quotations': 'Quotations',
  '/quotations/new': 'New Quotation',
  '/purchase-orders': 'Purchase Orders',
  '/purchase-orders/new': 'New Purchase Order',
  '/expenses': 'Expenses',
  '/expenses/new': 'Add Expense',
  '/audit-logs': 'Audit Log',
  '/till': 'Till / Cash Register',
  '/reports': 'Reports',
  '/users': 'Users & Permissions',
  '/settings': 'Settings',
  '/branches': 'Branches',
  '/import/items': 'Import Items',
  '/import/customers': 'Import Customers',
  '/items/adjust-bulk': 'Bulk Stock Adjustment',
  '/customers/adjust-balance': 'Adjust Customer Balances',
  '/returns': 'Returns',
  '/admin': 'Platform Admin',
}

export function Header() {
  const { user } = useUser()
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { collapsed, toggle } = useSidebar()

  const pageTitle = Object.entries(PAGE_TITLES).find(([key]) => 
    pathname === key || pathname?.startsWith(key + '/')
  )?.[1] || 'Market Inventory'

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Sidebar toggle (md+) + Page title */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggle}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden md:flex p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              {collapsed ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h16" />
                </svg>
              )}
            </button>
            <h2 className="text-xl font-bold text-gray-900">{pageTitle}</h2>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Branch selector — shown when tenant has 2+ branches */}
            <BranchSelector />

            {/* User menu */}
            <div className="relative">
              <button
                className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-semibold text-gray-700">{user?.name}</span>
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown */}
              {isMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-52 rounded-2xl shadow-xl bg-white ring-1 ring-black ring-opacity-5 z-20 overflow-hidden">
                    <div className="p-3 bg-gray-50 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                      <p className="text-xs text-gray-500">{user?.role}</p>
                    </div>
                    <div className="py-1">
                      <Link
                        href="/settings"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <span>⚙️</span> Settings
                      </Link>
                      <Link
                        href="/users"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <span>👥</span> Users
                      </Link>
                      <div className="my-1 border-t border-gray-100" />
                      <p className="px-4 pt-1 pb-0.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Import</p>
                      <Link
                        href="/import/items"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <span>📥</span> Import Items
                      </Link>
                      <Link
                        href="/import/customers"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <span>📥</span> Import Customers
                      </Link>
                      <div className="my-1 border-t border-gray-100" />
                      <p className="px-4 pt-1 pb-0.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Tools</p>
                      <Link
                        href="/items/adjust-bulk"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <span>🔧</span> Bulk Adjust Stock
                      </Link>
                      <Link
                        href="/customers/adjust-balance"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <span>⚖️</span> Adjust Balances
                      </Link>
                      <div className="my-1 border-t border-gray-100" />
                      <Link
                        href="/api/auth/signout"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <span>🚪</span> Sign out
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
