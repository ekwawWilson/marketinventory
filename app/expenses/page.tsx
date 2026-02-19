'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { formatCurrency, formatDate } from '@/lib/utils/format'

interface Expense {
  id: string
  amount: number
  category: string
  description: string
  paidBy: string | null
  createdAt: string
}

const CATEGORY_LABELS: Record<string, string> = {
  RENT: 'Rent',
  SALARIES: 'Salaries',
  UTILITIES: 'Utilities',
  TRANSPORT: 'Transport',
  MARKETING: 'Marketing',
  MAINTENANCE: 'Maintenance',
  OTHER: 'Other',
}

const CATEGORY_COLORS: Record<string, string> = {
  RENT: 'bg-blue-100 text-blue-700',
  SALARIES: 'bg-purple-100 text-purple-700',
  UTILITIES: 'bg-yellow-100 text-yellow-700',
  TRANSPORT: 'bg-orange-100 text-orange-700',
  MARKETING: 'bg-pink-100 text-pink-700',
  MAINTENANCE: 'bg-red-100 text-red-700',
  OTHER: 'bg-gray-100 text-gray-700',
}

export default function ExpensesPage() {
  const router = useRouter()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [totalAmount, setTotalAmount] = useState(0)
  const [byCategory, setByCategory] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Filters
  const [category, setCategory] = useState('')
  const today = new Date().toISOString().split('T')[0]
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  const [startDate, setStartDate] = useState(firstOfMonth)
  const [endDate, setEndDate] = useState(today)

  useEffect(() => {
    fetchExpenses()
  }, [category, startDate, endDate])

  const fetchExpenses = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (category) params.set('category', category)
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      const res = await fetch(`/api/expenses?${params}`)
      if (!res.ok) throw new Error('Failed to load expenses')
      const data = await res.json()
      setExpenses(data.expenses || [])
      setTotalAmount(data.totalAmount || 0)
      setByCategory(data.byCategory || {})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load expenses')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense? This cannot be undone.')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete expense')
      fetchExpenses()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <AppLayout>
      <div className="space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
            <p className="text-sm text-gray-500 mt-0.5">Track non-inventory business costs</p>
          </div>
          <button
            onClick={() => router.push('/expenses/new')}
            className="px-4 py-2 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-700 flex items-center gap-2"
          >
            <span className="text-lg leading-none">+</span>
            Add Expense
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500">From</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500">To</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400"
              >
                <option value="">All Categories</option>
                {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Summary KPI cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Expenses</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(totalAmount)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{expenses.length} records</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Top Category</p>
            {Object.keys(byCategory).length > 0 ? (() => {
              const top = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]
              return (
                <>
                  <p className="text-lg font-bold text-gray-900 mt-1">{CATEGORY_LABELS[top[0]] || top[0]}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatCurrency(top[1])}</p>
                </>
              )
            })() : <p className="text-gray-400 text-sm mt-1">—</p>}
          </div>
        </div>

        {/* Category breakdown */}
        {Object.keys(byCategory).length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="text-sm font-bold text-gray-700 mb-3">By Category</p>
            <div className="space-y-2">
              {Object.entries(byCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, amt]) => (
                  <div key={cat} className="flex items-center justify-between">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[cat] || 'bg-gray-100 text-gray-700'}`}>
                      {CATEGORY_LABELS[cat] || cat}
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-gray-100 rounded-full h-1.5">
                        <div
                          className="bg-red-500 h-1.5 rounded-full"
                          style={{ width: `${Math.round((amt / totalAmount) * 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-700 w-24 text-right">{formatCurrency(amt)}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Expenses list */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900">Expense Records</h2>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-gray-400 text-sm">Loading...</div>
          ) : expenses.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-3xl mb-2">💸</p>
              <p className="text-gray-500 font-semibold">No expenses recorded</p>
              <p className="text-sm text-gray-400 mt-1">Add your first expense to start tracking costs</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {expenses.map(exp => (
                <div key={exp.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5 ${CATEGORY_COLORS[exp.category] || 'bg-gray-100 text-gray-700'}`}>
                      {CATEGORY_LABELS[exp.category] || exp.category}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{exp.description}</p>
                      <p className="text-xs text-gray-400">
                        {formatDate(new Date(exp.createdAt))}
                        {exp.paidBy && <> · Paid by {exp.paidBy}</>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className="text-base font-bold text-red-600">{formatCurrency(exp.amount)}</span>
                    <button
                      onClick={() => handleDelete(exp.id)}
                      disabled={deletingId === exp.id}
                      className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40"
                      title="Delete expense"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </AppLayout>
  )
}
