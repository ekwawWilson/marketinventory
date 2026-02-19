'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { formatCurrency } from '@/lib/utils/format'
import { ExportButton } from '@/components/ExportButton'

type Tab = 'all' | 'owed' | 'cleared'

interface Supplier {
  id: string
  name: string
  phone: string | null
  balance: number
  _count?: { purchases: number }
}

export default function SuppliersPage() {
  const router = useRouter()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<Tab>('all')

  useEffect(() => { fetchSuppliers() }, [])

  const fetchSuppliers = async () => {
    try {
      const res = await fetch('/api/suppliers')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setSuppliers(data.suppliers || data.data || data || [])
    } finally {
      setIsLoading(false)
    }
  }

  const filtered = suppliers.filter(s => {
    const q = search.toLowerCase()
    const matchSearch = !q || s.name.toLowerCase().includes(q) || (s.phone || '').includes(q)
    const matchTab = tab === 'all' ? true : tab === 'owed' ? s.balance > 0 : s.balance === 0
    return matchSearch && matchTab
  })

  const totalOwed = suppliers.reduce((sum, s) => sum + Math.max(0, s.balance), 0)
  const withDebt = suppliers.filter(s => s.balance > 0)

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
            <p className="text-sm text-gray-500 mt-0.5">{suppliers.length} suppliers registered</p>
          </div>
          <div className="flex gap-2">
            <ExportButton
              filename="suppliers"
              getData={() => filtered.map(s => ({
                Name: s.name,
                Phone: s.phone || '',
                'Balance Owed (GHS)': s.balance.toFixed(2),
                'Total Purchases': s._count?.purchases ?? '',
              }))}
            />
            <button
              onClick={() => router.push('/suppliers/new')}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors shadow-md text-sm"
            >
              <span className="text-xl leading-none">+</span> Add Supplier
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase">Total Suppliers</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{suppliers.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-orange-100 shadow-sm">
            <p className="text-xs font-semibold text-orange-500 uppercase">You Owe Suppliers</p>
            <p className="text-xl font-bold text-orange-600 mt-1">{formatCurrency(totalOwed)}</p>
            <p className="text-xs text-gray-500 mt-0.5">{withDebt.length} outstanding accounts</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm col-span-2 lg:col-span-1">
            <p className="text-xs font-semibold text-gray-500 uppercase">Cleared Accounts</p>
            <p className="text-xl font-bold text-green-600 mt-1">{suppliers.length - withDebt.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">No outstanding balance</p>
          </div>
        </div>

        {/* Tabs + Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {([['all', 'All'], ['owed', 'You Owe'], ['cleared', 'Cleared']] as [Tab, string][]).map(([t, label]) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  tab === t ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {label}
                {t === 'owed' && withDebt.length > 0 && (
                  <span className="ml-1.5 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {withDebt.length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none text-sm"
            />
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="bg-white rounded-xl h-16 animate-pulse border border-gray-200" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 flex flex-col items-center py-16">
            <span className="text-5xl mb-3">🚚</span>
            <p className="font-semibold text-gray-700">No suppliers found</p>
            {!search && tab === 'all' && (
              <button onClick={() => router.push('/suppliers/new')} className="mt-4 px-5 py-2 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700">
                Add First Supplier
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile: Cards */}
            <div className="md:hidden space-y-2">
              {filtered.map(s => (
                <div
                  key={s.id}
                  onClick={() => router.push(`/suppliers/${s.id}`)}
                  className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 cursor-pointer active:bg-gray-50"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0 ${
                    s.balance > 0 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-base truncate">{s.name}</p>
                    {s.phone && <p className="text-sm text-gray-500">{s.phone}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">{s._count?.purchases || 0} purchases</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {s.balance > 0 ? (
                      <>
                        <p className="text-sm font-bold text-orange-600">{formatCurrency(s.balance)}</p>
                        <p className="text-xs text-orange-500">you owe</p>
                      </>
                    ) : (
                      <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">Cleared</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: Table */}
            <div className="hidden md:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Supplier</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Phone</th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase">Purchases</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase">You Owe</th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase">Status</th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(s => (
                    <tr key={s.id} className="hover:bg-orange-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold ${
                            s.balance > 0 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-gray-900">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{s.phone || '—'}</td>
                      <td className="px-6 py-4 text-sm text-center text-gray-600">{s._count?.purchases || 0}</td>
                      <td className="px-6 py-4 text-right">
                        {s.balance > 0 ? (
                          <span className="font-bold text-orange-600 text-base">{formatCurrency(s.balance)}</span>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          s.balance > 0 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {s.balance > 0 ? 'Outstanding' : 'Cleared'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => router.push(`/suppliers/${s.id}`)}
                          className="text-orange-600 hover:text-orange-800 font-semibold text-sm"
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-6 py-3 bg-gray-50 border-t text-sm text-gray-500">
                {filtered.length} of {suppliers.length} suppliers
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
