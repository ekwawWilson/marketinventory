'use client'

import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'

/**
 * Reports Dashboard Page
 *
 * Central hub for all reports
 */

export default function ReportsPage() {
  const router = useRouter()

  const reports = [
    {
      title: 'Sales Reports',
      description: 'View sales performance, trends, and statistics',
      icon: '💰',
      href: '/reports/sales',
      color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
    },
    {
      title: 'Purchase Reports',
      description: 'Track purchase history and supplier analytics',
      icon: '🛒',
      href: '/reports/purchases',
      color: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
    },
    {
      title: 'Inventory Reports',
      description: 'Stock levels, low stock alerts, and inventory value',
      icon: '📦',
      href: '/reports/inventory',
      color: 'bg-green-50 border-green-200 hover:bg-green-100',
    },
    {
      title: 'Debtors Report',
      description: 'Customers with outstanding balances',
      icon: '👤',
      href: '/reports/debtors',
      color: 'bg-red-50 border-red-200 hover:bg-red-100',
    },
    {
      title: 'Creditors Report',
      description: 'Suppliers you owe money to',
      icon: '🚚',
      href: '/reports/creditors',
      color: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
    },
  ]

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">
            Access business insights and analytics
          </p>
        </div>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => (
            <button
              key={report.href}
              onClick={() => router.push(report.href)}
              className={`p-6 border-2 rounded-lg text-left transition-colors ${report.color}`}
            >
              <div className="text-4xl mb-3">{report.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {report.title}
              </h3>
              <p className="text-sm text-gray-600">
                {report.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
