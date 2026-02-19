'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useUser } from '@/hooks/useUser'
import { useTenantFeatures } from '@/hooks/useTenant'
import { useSidebar } from '@/lib/sidebar/SidebarContext'

/**
 * Sidebar Navigation Component
 *
 * Desktop/Tablet sidebar - hidden on mobile (md:flex)
 * Collapsible: full (w-64) ↔ icon-rail (w-16)
 * Import and Tools are sub-menu items under Settings (expandable)
 */

export function Sidebar() {
  const pathname = usePathname()
  const { user } = useUser()
  const { features } = useTenantFeatures()
  const { collapsed, toggle } = useSidebar()

  const ALL_STAFF_ROLES = ['OWNER', 'STORE_MANAGER', 'CASHIER', 'INVENTORY_MANAGER', 'ACCOUNTANT', 'STAFF']

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: '📊', roles: ALL_STAFF_ROLES, show: true },
    { name: 'POS Terminal', href: '/pos', icon: '🖥️', roles: ['OWNER', 'STORE_MANAGER', 'CASHIER'], show: features.enablePosTerminal },
    { name: 'Sales', href: '/sales', icon: '💰', roles: ALL_STAFF_ROLES, show: true },
    { name: 'Purchases', href: '/purchases', icon: '🛒', roles: ALL_STAFF_ROLES, show: true },
    { name: 'Items', href: '/items', icon: '📦', roles: ALL_STAFF_ROLES, show: true },
    { name: 'Manufacturers', href: '/manufacturers', icon: '🏭', roles: ALL_STAFF_ROLES, show: true },
    { name: 'Customers', href: '/customers', icon: '👤', roles: ALL_STAFF_ROLES, show: true },
    { name: 'Suppliers', href: '/suppliers', icon: '🚚', roles: ALL_STAFF_ROLES, show: true },
    { name: 'Payments', href: '/payments', icon: '💳', roles: ALL_STAFF_ROLES, show: true },
    { name: 'Quotations', href: '/quotations', icon: '📄', roles: ['OWNER', 'STORE_MANAGER', 'CASHIER'], show: features.enableQuotations },
    { name: 'Purchase Orders', href: '/purchase-orders', icon: '📋', roles: ['OWNER', 'STORE_MANAGER', 'INVENTORY_MANAGER'], show: features.enablePurchaseOrders },
    { name: 'Expenses', href: '/expenses', icon: '💸', roles: ['OWNER', 'STORE_MANAGER', 'ACCOUNTANT'], show: features.enableExpenses },
    { name: 'Till', href: '/till', icon: '🏧', roles: ['OWNER', 'STORE_MANAGER', 'CASHIER'], show: features.enableTill },
    { name: 'Reports', href: '/reports', icon: '📈', roles: ALL_STAFF_ROLES, show: true },
    { name: 'Users', href: '/users', icon: '👥', roles: ['OWNER'], show: true },
    { name: 'Branches', href: '/branches', icon: '🏪', roles: ['OWNER'], show: features.enableBranches },
  ]

  const settingsSubMenu = [
    { name: 'Settings', href: '/settings', icon: '⚙️', roles: ['OWNER'] },
    { name: 'Audit Log', href: '/audit-logs', icon: '🔍', roles: ['OWNER', 'STORE_MANAGER'] },
    { name: 'Import Items', href: '/import/items', icon: '📥', roles: ALL_STAFF_ROLES },
    { name: 'Import Customers', href: '/import/customers', icon: '📥', roles: ALL_STAFF_ROLES },
    { name: 'Adjust Stock (Bulk)', href: '/items/adjust-bulk', icon: '🔧', roles: ALL_STAFF_ROLES },
    { name: 'Adjust Balances', href: '/customers/adjust-balance', icon: '⚖️', roles: ALL_STAFF_ROLES },
  ]

  const filteredNavigation = navigation.filter(item =>
    item.show && item.roles.includes(user?.role || '')
  )
  const filteredSubMenu = settingsSubMenu.filter(item =>
    item.roles.includes(user?.role || '')
  )

  const isSubMenuActive = filteredSubMenu.some(item =>
    pathname === item.href || pathname?.startsWith(item.href + '/')
  )

  const [settingsOpen, setSettingsOpen] = useState(isSubMenuActive)

  return (
    <aside
      className={`hidden md:flex flex-col fixed inset-y-0 z-30 transition-all duration-200 ease-in-out ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex flex-col grow bg-white border-r border-gray-200 pb-4 overflow-y-auto overflow-x-hidden shadow-sm">

        {/* Logo / Brand + collapse toggle */}
        <div className={`flex items-center shrink-0 h-14 border-b border-gray-100 ${collapsed ? 'justify-center px-0' : 'px-4 gap-3'}`}>
          {collapsed ? (
            <button
              onClick={toggle}
              title="Expand sidebar"
              className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-xl shadow-md hover:bg-blue-700 transition-colors"
            >
              🏪
            </button>
          ) : (
            <>
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-xl shadow-md shrink-0">
                🏪
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-sm font-bold text-gray-900 leading-tight truncate">PETROS Business</h1>
                <p className="text-xs text-gray-500">Management Mini</p>
              </div>
              <button
                onClick={toggle}
                title="Collapse sidebar"
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Navigation */}
        <nav className={`flex-1 py-3 space-y-0.5 ${collapsed ? 'px-2' : 'px-3'}`}>
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            return (
              <Link
                key={item.name}
                href={item.href}
                title={collapsed ? item.name : undefined}
                className={`
                  group flex items-center text-sm font-medium rounded-xl transition-all
                  ${collapsed ? 'justify-center w-10 h-10 mx-auto' : 'px-3 py-2.5'}
                  ${isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                <span className={`text-lg ${collapsed ? '' : 'mr-3'}`}>{item.icon}</span>
                {!collapsed && (
                  <>
                    <span className="truncate">{item.name}</span>
                    {isActive && (
                      <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full opacity-70 shrink-0" />
                    )}
                  </>
                )}
              </Link>
            )
          })}

          {/* Settings sub-menu */}
          {filteredSubMenu.length > 0 && (
            <div className="pt-1">
              {collapsed ? (
                /* In collapsed mode show Settings as a plain icon link to /settings */
                <Link
                  href="/settings"
                  title="Settings"
                  className={`
                    flex items-center justify-center w-10 h-10 mx-auto rounded-xl transition-all
                    ${isSubMenuActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <span className="text-lg">⚙️</span>
                </Link>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setSettingsOpen(o => !o)}
                    className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${
                      isSubMenuActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <span className="mr-3 text-lg">⚙️</span>
                    <span className="flex-1 text-left">Settings</span>
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${settingsOpen ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {settingsOpen && (
                    <div className="mt-0.5 ml-4 pl-3 border-l-2 border-gray-100 space-y-0.5">
                      {filteredSubMenu.map((item) => {
                        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            className={`
                              flex items-center px-3 py-2 text-sm font-medium rounded-xl transition-all
                              ${isActive
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                              }
                            `}
                          >
                            <span className="mr-2.5 text-base">{item.icon}</span>
                            {item.name}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </nav>

        {/* User Info */}
        <div className={`shrink-0 border-t border-gray-200 ${collapsed ? 'p-2' : 'p-4'}`}>
          {collapsed ? (
            <div
              title={`${user?.name} · ${user?.role}`}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-base shadow-md mx-auto"
            >
              {user?.name?.charAt(0).toUpperCase()}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-base shadow-md shrink-0">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                <p className="text-xs font-medium text-gray-500">
                  {user?.role?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                </p>
              </div>
              <Link
                href="/api/auth/signout"
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                title="Sign out"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </Link>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
