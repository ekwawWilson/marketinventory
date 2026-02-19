'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { ExportButton } from '@/components/ExportButton'

type QuotationStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'

interface Quotation {
  id: string
  customerId: string | null
  customer: { id: string; name: string; phone: string | null } | null
  status: QuotationStatus
  totalAmount: number
  note: string | null
  validUntil: string | null
  createdAt: string
  items: { id: string; itemName: string; quantity: number; price: number }[]
}

const STATUS_COLORS: Record<QuotationStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SENT: 'bg-blue-100 text-blue-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-orange-100 text-orange-700',
}

export default function QuotationsPage() {
  const router = useRouter()
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<QuotationStatus | 'all'>('all')

  useEffect(() => { fetchQuotations() }, [])

  const fetchQuotations = async () => {
    try {
      const res = await fetch('/api/quotations')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setQuotations(data.quotations || [])
    } finally {
      setIsLoading(false)
    }
  }

  const filtered = quotations.filter(q => {
    const q_ = search.toLowerCase()
    const matchSearch = !q_
      || q.customer?.name.toLowerCase().includes(q_)
      || q.id.toLowerCase().includes(q_)
      || q.items.some(i => i.itemName.toLowerCase().includes(q_))
    const matchStatus = statusFilter === 'all' || q.status === statusFilter
    return matchSearch && matchStatus
  })

  const statusCounts = quotations.reduce((acc, q) => {
    acc[q.status] = (acc[q.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const totalValue = filtered.reduce((s, q) => s + q.totalAmount, 0)

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Quotations</h1>
            <p className="text-sm text-gray-500 mt-0.5">{quotations.length} proforma invoices</p>
          </div>
          <div className="flex gap-2">
            <ExportButton
              filename="quotations"
              getData={() => filtered.map(q => ({
                Date: formatDate(q.createdAt),
                Customer: q.customer?.name || 'Walk-in',
                Status: q.status,
                Items: q.items.length,
                'Total (GHS)': q.totalAmount.toFixed(2),
                'Valid Until': q.validUntil ? formatDate(q.validUntil) : '',
              }))}
            />
            <button
              onClick={() => router.push('/quotations/new')}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-md text-sm"
            >
              <span className="text-xl leading-none">+</span> New Quote
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'] as QuotationStatus[]).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
              className={`rounded-xl p-3 border text-left transition-all ${
                statusFilter === status ? 'ring-2 ring-blue-500' : ''
              } ${
                status === 'ACCEPTED' ? 'bg-green-50 border-green-200' :
                status === 'REJECTED' ? 'bg-red-50 border-red-200' :
                status === 'SENT' ? 'bg-blue-50 border-blue-200' :
                status === 'EXPIRED' ? 'bg-orange-50 border-orange-200' :
                'bg-white border-gray-200'
              }`}
            >
              <p className="text-xs font-semibold text-gray-500 uppercase">{status}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{statusCounts[status] || 0}</p>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by customer, item, or ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-sm"
            />
          </div>
          {statusFilter !== 'all' && (
            <button
              onClick={() => setStatusFilter('all')}
              className="px-4 py-2.5 text-sm border-2 border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 font-semibold"
            >
              Clear Filter
            </button>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="bg-white rounded-xl h-20 animate-pulse border border-gray-200" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 flex flex-col items-center py-16">
            <span className="text-5xl mb-3">📄</span>
            <p className="font-semibold text-gray-700">No quotations found</p>
            {!search && statusFilter === 'all' && (
              <button
                onClick={() => router.push('/quotations/new')}
                className="mt-4 px-5 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
              >
                Create First Quote
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile: Cards */}
            <div className="md:hidden space-y-2">
              {filtered.map(q => (
                <div
                  key={q.id}
                  onClick={() => router.push(`/quotations/${q.id}`)}
                  className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer active:bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-gray-900">{q.customer?.name || 'Walk-in'}</p>
                      <p className="text-xs font-mono text-gray-400 mt-0.5">#{q.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(q.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{formatCurrency(q.totalAmount)}</p>
                      <span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_COLORS[q.status]}`}>
                        {q.status}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{q.items.length} item(s): {q.items.map(i => i.itemName).join(', ')}</p>
                </div>
              ))}
            </div>

            {/* Desktop: Table */}
            <div className="hidden md:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Customer</th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase">Items</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Valid Until</th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(q => {
                    const isExpiredNow = q.validUntil && new Date(q.validUntil) < new Date() && q.status === 'SENT'
                    return (
                      <tr
                        key={q.id}
                        onClick={() => router.push(`/quotations/${q.id}`)}
                        className="hover:bg-blue-50 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4 text-sm text-gray-700">{formatDate(q.createdAt)}</td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                            #{q.id.slice(0, 8).toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {q.customer?.name || 'Walk-in'}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-600">{q.items.length}</td>
                        <td className="px-6 py-4 text-right font-bold text-gray-900">{formatCurrency(q.totalAmount)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {q.validUntil ? (
                            <span className={isExpiredNow ? 'text-red-600 font-semibold' : ''}>
                              {formatDate(q.validUntil)}
                              {isExpiredNow && ' (Expired)'}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[q.status]}`}>
                            {q.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td colSpan={4} className="px-6 py-3 text-sm font-bold text-gray-700">
                      Total ({filtered.length} quotations)
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-bold text-blue-700">
                      {formatCurrency(totalValue)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
