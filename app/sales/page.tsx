'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { SaleWithDetails } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils/format'

type FilterStatus = 'all' | 'paid' | 'partial'
type PaymentFilter = 'all' | 'CASH' | 'CREDIT'

export default function SalesPage() {
  const router = useRouter()
  const [sales, setSales] = useState<SaleWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all')

  useEffect(() => { fetchSales() }, [])

  const fetchSales = async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/sales')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      // API returns { sales, summary }
      setSales(data.sales || data.data || [])
    } catch {
      setError('Failed to load sales. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const filtered = sales.filter(s => {
    const q = search.toLowerCase()
    const matchesSearch = !q
      || s.id.toLowerCase().includes(q)
      || (s.customer?.name || 'Walk-in').toLowerCase().includes(q)
    const credit = s.totalAmount - s.paidAmount
    const matchesFilter =
      filter === 'all' ? true : filter === 'paid' ? credit === 0 : credit > 0
    const matchesPayment =
      paymentFilter === 'all' ? true : s.paymentType === paymentFilter
    return matchesSearch && matchesFilter && matchesPayment
  })

  const totalRevenue = filtered.reduce((s, x) => s + x.paidAmount, 0)
  const totalCredit = filtered.reduce((s, x) => s + Math.max(0, x.totalAmount - x.paidAmount), 0)
  const cashSales = sales.filter(s => s.paymentType === 'CASH').length
  const creditSales = sales.filter(s => s.paymentType === 'CREDIT').length

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
            <p className="text-sm text-gray-500 mt-0.5">{sales.length} total transactions</p>
          </div>
          <button
            onClick={() => router.push('/sales/new')}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-md text-sm"
          >
            <span className="text-xl leading-none">+</span> New Sale
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase">Total Sales</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{sales.length}</p>
            <p className="text-xs text-gray-400 mt-1">
              {cashSales} cash · {creditSales} credit
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase">Revenue Collected</p>
            <p className="text-xl font-bold text-green-600 mt-1">{formatCurrency(totalRevenue)}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase">Credit Outstanding</p>
            <p className="text-xl font-bold text-red-500 mt-1">{formatCurrency(totalCredit)}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase">Fully Paid</p>
            <p className="text-xl font-bold text-blue-600 mt-1">
              {sales.filter(s => s.totalAmount === s.paidAmount).length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3">
          {/* Row 1: Payment type filter */}
          <div className="flex gap-2">
            <span className="text-xs font-semibold text-gray-500 self-center mr-1">Type:</span>
            {([['all', 'All'], ['CASH', '💵 Cash'], ['CREDIT', '📋 Credit']] as [PaymentFilter, string][]).map(([f, label]) => (
              <button
                key={f}
                onClick={() => setPaymentFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${
                  paymentFilter === f
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Row 2: Status filter + Search */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex gap-2">
              <span className="text-xs font-semibold text-gray-500 self-center mr-1">Status:</span>
              {(['all', 'paid', 'partial'] as FilterStatus[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${
                    filter === f
                      ? 'bg-gray-800 text-white border-gray-800'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by customer or ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-base"
              />
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
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
            <span className="text-5xl mb-3">💰</span>
            <p className="text-lg font-semibold text-gray-700">No sales found</p>
            <p className="text-sm text-gray-500 mt-1">{search ? 'Try a different search' : 'Create your first sale'}</p>
            {!search && (
              <button onClick={() => router.push('/sales/new')} className="mt-4 px-6 py-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700">
                Create Sale
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {filtered.map(sale => {
                const credit = sale.totalAmount - sale.paidAmount
                return (
                  <div
                    key={sale.id}
                    onClick={() => router.push(`/sales/${sale.id}`)}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 cursor-pointer active:bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-gray-900 text-base">
                          {sale.customer?.name || 'Walk-in Customer'}
                        </p>
                        <p className="text-xs text-gray-500 font-mono mt-0.5">#{sale.id.slice(0, 8).toUpperCase()}</p>
                        <p className="text-xs text-gray-400 mt-1">{formatDate(sale.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">{formatCurrency(sale.totalAmount)}</p>
                        <div className="flex gap-1 mt-1 justify-end">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            sale.paymentType === 'CASH' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {sale.paymentType === 'CASH' ? '💵 Cash' : '📋 Credit'}
                          </span>
                          {credit === 0 ? (
                            <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-bold">Paid</span>
                          ) : (
                            <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-xs font-bold">Partial</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                      <span>{sale.items?.length || 0} item(s)</span>
                      <span className="text-blue-600 font-semibold">View receipt →</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Customer</th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase">Type</th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase">Items</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase">Total</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase">Paid</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase">Credit</th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(sale => {
                    const credit = sale.totalAmount - sale.paidAmount
                    return (
                      <tr
                        key={sale.id}
                        onClick={() => router.push(`/sales/${sale.id}`)}
                        className="hover:bg-blue-50 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4 text-sm text-gray-700">{formatDate(sale.createdAt)}</td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                            #{sale.id.slice(0, 8).toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {sale.customer?.name || 'Walk-in Customer'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            sale.paymentType === 'CASH' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {sale.paymentType === 'CASH' ? '💵 Cash' : '📋 Credit'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-center text-gray-600">{sale.items?.length || 0}</td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">{formatCurrency(sale.totalAmount)}</td>
                        <td className="px-6 py-4 text-sm text-green-700 font-semibold text-right">{formatCurrency(sale.paidAmount)}</td>
                        <td className="px-6 py-4 text-sm text-right">
                          {credit > 0 ? <span className="text-red-600 font-semibold">{formatCurrency(credit)}</span> : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            credit === 0 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {credit === 0 ? 'Paid' : 'Partial'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="px-6 py-3 bg-gray-50 border-t text-sm text-gray-500 font-medium">
                Showing {filtered.length} of {sales.length} sales
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
