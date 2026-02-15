'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { PurchaseWithDetails } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils/format'

/**
 * Purchases Page - Responsive
 * Mobile: Card list view
 * Tablet/Desktop: Full table view
 */

type FilterStatus = 'all' | 'paid' | 'partial'

export default function PurchasesPage() {
  const router = useRouter()
  const [purchases, setPurchases] = useState<PurchaseWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterStatus>('all')

  useEffect(() => { fetchPurchases() }, [])

  const fetchPurchases = async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/purchases')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setPurchases(data.purchases || data.data || [])
    } catch {
      setError('Failed to load purchases. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const filtered = purchases.filter(p => {
    const q = search.toLowerCase()
    const matchesSearch = !q
      || p.id.toLowerCase().includes(q)
      || (p.supplier?.name || '').toLowerCase().includes(q)
    const credit = p.totalAmount - p.paidAmount
    const matchesFilter =
      filter === 'all' ? true
      : filter === 'paid' ? credit === 0
      : credit > 0
    return matchesSearch && matchesFilter
  })

  const totalSpend = filtered.reduce((s, x) => s + x.paidAmount, 0)
  const totalCredit = filtered.reduce((s, x) => s + Math.max(0, x.totalAmount - x.paidAmount), 0)

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Purchases</h1>
            <p className="text-sm text-gray-500 mt-0.5">{purchases.length} total purchases</p>
          </div>
          <button
            onClick={() => router.push('/purchases/new')}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-md text-sm"
          >
            <span className="text-xl leading-none">+</span>
            New Purchase
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Purchases</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{purchases.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Spent</p>
            <p className="text-xl font-bold text-green-600 mt-1">{formatCurrency(totalSpend)}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Owed to Suppliers</p>
            <p className="text-xl font-bold text-red-500 mt-1">{formatCurrency(totalCredit)}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fully Paid</p>
            <p className="text-xl font-bold text-blue-600 mt-1">
              {purchases.filter(p => p.totalAmount === p.paidAmount).length}
            </p>
          </div>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by supplier or ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none text-base"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'paid', 'partial'] as FilterStatus[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${
                  filter === f
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse h-32" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center justify-center py-16">
            <span className="text-5xl mb-3">🛒</span>
            <p className="text-lg font-semibold text-gray-700">No purchases found</p>
            <p className="text-sm text-gray-500 mt-1">
              {search ? 'Try a different search term' : 'Record your first purchase'}
            </p>
            {!search && (
              <button
                onClick={() => router.push('/purchases/new')}
                className="mt-4 px-6 py-2 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700"
              >
                Record Purchase
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {filtered.map(purchase => {
                const credit = purchase.totalAmount - purchase.paidAmount
                return (
                  <div
                    key={purchase.id}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-gray-900 text-base">
                          {purchase.supplier?.name || 'Unknown Supplier'}
                        </p>
                        <p className="text-xs text-gray-500 font-mono mt-0.5">
                          #{purchase.id.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">{formatDate(purchase.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">{formatCurrency(purchase.totalAmount)}</p>
                        <span className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          credit === 0
                            ? 'bg-green-100 text-green-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {credit === 0 ? '✓ Paid' : `Owe: ${formatCurrency(credit)}`}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                      <span>{purchase.items?.length || 0} item(s)</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">Paid: {formatCurrency(purchase.paidAmount)}</span>
                        <button
                          onClick={() => router.push(`/purchases/${purchase.id}/edit`)}
                          className="text-xs text-indigo-600 font-semibold hover:underline"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop/Tablet Table */}
            <div className="hidden md:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Supplier</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Items</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Paid</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Owed</th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(purchase => {
                    const credit = purchase.totalAmount - purchase.paidAmount
                    return (
                      <tr key={purchase.id} className="hover:bg-green-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-700">{formatDate(purchase.createdAt)}</td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                            #{purchase.id.slice(0, 8).toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {purchase.supplier?.name || '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-center text-gray-600">
                          {purchase.items?.length || 0}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                          {formatCurrency(purchase.totalAmount)}
                        </td>
                        <td className="px-6 py-4 text-sm text-green-700 font-semibold text-right">
                          {formatCurrency(purchase.paidAmount)}
                        </td>
                        <td className="px-6 py-4 text-sm text-right">
                          {credit > 0 ? (
                            <span className="text-red-600 font-semibold">{formatCurrency(credit)}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                            credit === 0
                              ? 'bg-green-100 text-green-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {credit === 0 ? 'Paid' : 'Partial'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={() => router.push(`/purchases/${purchase.id}/edit`)}
                            className="text-xs text-indigo-600 font-semibold hover:underline"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="px-6 py-3 bg-gray-50 border-t text-sm text-gray-500 font-medium">
                Showing {filtered.length} of {purchases.length} purchases
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
