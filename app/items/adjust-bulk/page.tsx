'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { formatCurrency } from '@/lib/utils/format'

interface Item {
  id: string
  name: string
  quantity: number
  costPrice: number
  sellingPrice: number
  manufacturer: { id: string; name: string } | null
}

interface RowState {
  type: 'add' | 'remove' | 'set'
  qty: string   // string so input is controllable
  dirty: boolean
  saving: boolean
  error: string
  saved: boolean
}

export default function BulkAdjustItemsPage() {
  const router = useRouter()
  const [items, setItems] = useState<Item[]>([])
  const [rows, setRows] = useState<Record<string, RowState>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isSavingAll, setIsSavingAll] = useState(false)

  useEffect(() => {
    fetch('/api/items')
      .then(r => r.json())
      .then(data => {
        const list: Item[] = Array.isArray(data) ? data : data.data || []
        setItems(list)
        const initial: Record<string, RowState> = {}
        list.forEach(item => {
          initial[item.id] = { type: 'add', qty: '', dirty: false, saving: false, error: '', saved: false }
        })
        setRows(initial)
      })
      .finally(() => setLoading(false))
  }, [])

  const setRow = (id: string, patch: Partial<RowState>) => {
    setRows(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  const previewQty = (item: Item, row: RowState): number | null => {
    const qty = parseFloat(row.qty)
    if (isNaN(qty) || qty < 0 || row.qty === '') return null
    if (row.type === 'add') return item.quantity + qty
    if (row.type === 'remove') return Math.max(0, item.quantity - qty)
    return qty
  }

  const saveRow = async (item: Item) => {
    const row = rows[item.id]
    if (!row.dirty || row.qty === '') return
    setRow(item.id, { saving: true, error: '' })
    try {
      const res = await fetch(`/api/items/${item.id}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: row.type, quantity: parseFloat(row.qty) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      // update local item quantity
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: data.quantity } : i))
      setRow(item.id, { saving: false, dirty: false, qty: '', saved: true, error: '' })
      setTimeout(() => setRow(item.id, { saved: false }), 2000)
    } catch (err) {
      setRow(item.id, { saving: false, error: err instanceof Error ? err.message : 'Failed' })
    }
  }

  const saveAll = async () => {
    const dirtyItems = items.filter(i => rows[i.id]?.dirty && rows[i.id]?.qty !== '')
    if (dirtyItems.length === 0) return
    setIsSavingAll(true)
    for (const item of dirtyItems) {
      await saveRow(item)
    }
    setIsSavingAll(false)
  }

  const filtered = items.filter(i => {
    const q = search.toLowerCase()
    return !q || i.name.toLowerCase().includes(q) || (i.manufacturer?.name || '').toLowerCase().includes(q)
  })

  const dirtyCount = Object.values(rows).filter(r => r.dirty && r.qty !== '').length

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3 flex-1">
            <button onClick={() => router.push('/items')} className="p-2 hover:bg-gray-100 rounded-xl">
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Bulk Stock Adjustment</h1>
              <p className="text-sm text-gray-500">Set type and quantity, then save each row or save all at once</p>
            </div>
          </div>
          {dirtyCount > 0 && (
            <button
              onClick={saveAll}
              disabled={isSavingAll}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-60 text-sm shadow-md"
            >
              {isSavingAll ? 'Saving…' : `Save All (${dirtyCount})`}
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none text-sm"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Item</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Manufacturer</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase">Current Stock</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase w-36">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase w-28">Qty</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase">New Stock</th>
                    <th className="px-4 py-3 w-24"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(item => {
                    const row = rows[item.id]
                    if (!row) return null
                    const preview = previewQty(item, row)
                    return (
                      <tr key={item.id} className={`transition-colors ${row.saved ? 'bg-green-50' : row.dirty ? 'bg-indigo-50/40' : 'hover:bg-gray-50'}`}>
                        <td className="px-4 py-3 font-semibold text-gray-900">{item.name}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{item.manufacturer?.name || '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-bold ${item.quantity === 0 ? 'text-red-600' : item.quantity <= 10 ? 'text-amber-600' : 'text-gray-900'}`}>
                            {item.quantity}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex rounded-lg border-2 border-gray-200 overflow-hidden text-xs font-semibold">
                            {(['add', 'remove', 'set'] as const).map(t => (
                              <button key={t} type="button"
                                onClick={() => setRow(item.id, { type: t, dirty: row.qty !== '', saved: false })}
                                className={`flex-1 py-1.5 transition-colors ${row.type === t
                                  ? t === 'add' ? 'bg-green-500 text-white'
                                    : t === 'remove' ? 'bg-red-500 text-white'
                                    : 'bg-blue-500 text-white'
                                  : 'text-gray-600 hover:bg-gray-100'
                                }`}>
                                {t}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            value={row.qty}
                            onChange={e => setRow(item.id, { qty: e.target.value, dirty: e.target.value !== '', saved: false, error: '' })}
                            placeholder="0"
                            className="w-full px-2 py-1.5 border-2 border-gray-200 rounded-lg text-sm focus:border-indigo-500 focus:outline-none"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          {preview !== null ? (
                            <span className={`font-bold text-sm ${preview === 0 ? 'text-red-600' : preview <= 10 ? 'text-amber-600' : 'text-green-700'}`}>
                              → {preview}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {row.error && <p className="text-xs text-red-600 mb-1">{row.error}</p>}
                          {row.saved ? (
                            <span className="text-xs text-green-600 font-semibold">✓ Saved</span>
                          ) : (
                            <button
                              onClick={() => saveRow(item)}
                              disabled={!row.dirty || row.qty === '' || row.saving}
                              className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              {row.saving ? '…' : 'Save'}
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {filtered.map(item => {
                const row = rows[item.id]
                if (!row) return null
                const preview = previewQty(item, row)
                return (
                  <div key={item.id} className={`p-4 space-y-3 ${row.saved ? 'bg-green-50' : row.dirty ? 'bg-indigo-50/40' : ''}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.manufacturer?.name || '—'}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-lg font-bold ${item.quantity === 0 ? 'text-red-600' : item.quantity <= 10 ? 'text-amber-600' : 'text-gray-900'}`}>
                          {item.quantity}
                        </span>
                        {preview !== null && (
                          <p className={`text-xs font-semibold ${preview <= 10 ? 'text-amber-600' : 'text-green-700'}`}>→ {preview}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex rounded-lg border-2 border-gray-200 overflow-hidden text-xs font-semibold flex-1">
                        {(['add', 'remove', 'set'] as const).map(t => (
                          <button key={t} type="button"
                            onClick={() => setRow(item.id, { type: t, dirty: row.qty !== '' })}
                            className={`flex-1 py-2 transition-colors ${row.type === t
                              ? t === 'add' ? 'bg-green-500 text-white' : t === 'remove' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
                              : 'text-gray-600 hover:bg-gray-100'
                            }`}>
                            {t}
                          </button>
                        ))}
                      </div>
                      <input
                        type="number" min="0" value={row.qty}
                        onChange={e => setRow(item.id, { qty: e.target.value, dirty: e.target.value !== '', saved: false, error: '' })}
                        placeholder="Qty"
                        className="w-20 px-2 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-indigo-500 focus:outline-none"
                      />
                      {row.saved ? (
                        <span className="flex items-center text-xs text-green-600 font-semibold px-2">✓</span>
                      ) : (
                        <button onClick={() => saveRow(item)} disabled={!row.dirty || row.qty === '' || row.saving}
                          className="px-3 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-30">
                          {row.saving ? '…' : 'Save'}
                        </button>
                      )}
                    </div>
                    {row.error && <p className="text-xs text-red-600">{row.error}</p>}
                  </div>
                )
              })}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p className="font-semibold">No items found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
