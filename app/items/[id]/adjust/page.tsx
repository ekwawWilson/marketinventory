'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { formatCurrency } from '@/lib/utils/format'

/**
 * Quantity Adjustment Page
 *
 * Add stock, remove stock, or set an absolute quantity for an item.
 */

type AdjustType = 'add' | 'remove' | 'set'

export default function AdjustQuantityPage() {
  const router = useRouter()
  const params = useParams()
  const itemId = params.id as string

  const [item, setItem] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [adjustType, setAdjustType] = useState<AdjustType>('add')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')

  useEffect(() => { fetchItem() }, [itemId])

  const fetchItem = async () => {
    try {
      const res = await fetch(`/api/items/${itemId}`)
      if (!res.ok) throw new Error('Failed to fetch item')
      const data = await res.json()
      setItem(data.data || data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load item')
    } finally {
      setIsLoading(false)
    }
  }

  const qty = Number(quantity)
  const isValidQty = quantity !== '' && !isNaN(qty) && qty >= 0 && (adjustType === 'set' || qty > 0)

  const previewQty = isValidQty && item
    ? adjustType === 'add'
      ? item.quantity + qty
      : adjustType === 'remove'
      ? item.quantity - qty
      : qty
    : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidQty) return

    if (adjustType === 'remove' && item && qty > item.quantity) {
      setError(`Cannot remove ${qty} — only ${item.quantity} in stock`)
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)
      const res = await fetch(`/api/items/${itemId}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: adjustType, quantity: qty, reason: reason.trim() || undefined }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to adjust quantity')
      }

      router.push(`/items/${itemId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to adjust quantity')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center py-16">
          <div className="text-gray-500">Loading...</div>
        </div>
      </AppLayout>
    )
  }

  if (error && !item) {
    return (
      <AppLayout>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">{error}</div>
      </AppLayout>
    )
  }

  const typeConfig: Record<AdjustType, { label: string; icon: string; color: string; desc: string }> = {
    add:    { label: 'Add Stock',    icon: '+', color: 'bg-green-600 border-green-600',  desc: 'Increase stock (e.g. restocking, correction)' },
    remove: { label: 'Remove Stock', icon: '−', color: 'bg-red-600 border-red-600',     desc: 'Decrease stock (e.g. damage, loss, correction)' },
    set:    { label: 'Set Quantity', icon: '=', color: 'bg-blue-600 border-blue-600',   desc: 'Set an exact stock count (e.g. after stocktake)' },
  }

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.push(`/items/${itemId}`)} className="p-2 hover:bg-gray-100 rounded-xl">
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Adjust Quantity</h1>
            <p className="text-sm text-gray-500">{item?.name}</p>
          </div>
        </div>

        {/* Current stock card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase">Current Stock</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{item?.quantity ?? 0}</p>
            <p className="text-xs text-gray-400 mt-1">{item?.manufacturer?.name}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-gray-400 uppercase">Cost / Sell</p>
            <p className="text-sm font-semibold text-gray-700 mt-1">{formatCurrency(item?.costPrice ?? 0)}</p>
            <p className="text-sm font-semibold text-blue-600">{formatCurrency(item?.sellingPrice ?? 0)}</p>
          </div>
        </div>

        {/* Adjustment form */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">

          {/* Type selector */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Adjustment Type</p>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(typeConfig) as AdjustType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setAdjustType(t); setError(null) }}
                  className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 font-semibold text-sm transition-all ${
                    adjustType === t
                      ? `${typeConfig[t].color} text-white`
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span className="text-lg font-bold">{typeConfig[t].icon}</span>
                  <span className="text-xs">{typeConfig[t].label}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">{typeConfig[adjustType].desc}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Quantity input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {adjustType === 'set' ? 'New Quantity' : 'Quantity'}
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={quantity}
                onChange={e => { setQuantity(e.target.value); setError(null) }}
                placeholder={adjustType === 'set' ? 'Enter exact stock count' : 'Enter quantity'}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-lg font-semibold focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Preview */}
            {isValidQty && previewQty !== null && (
              <div className={`rounded-xl p-4 flex items-center justify-between ${
                previewQty < 0 ? 'bg-red-50 border border-red-200' : 'bg-gray-50 border border-gray-200'
              }`}>
                <div className="text-sm text-gray-600">
                  <span className="font-semibold">{item.quantity}</span>
                  {adjustType === 'add' && <span className="text-green-600"> + {qty}</span>}
                  {adjustType === 'remove' && <span className="text-red-600"> − {qty}</span>}
                  {adjustType === 'set' && <span className="text-blue-600"> → set</span>}
                </div>
                <div className={`text-xl font-bold ${
                  previewQty < 0 ? 'text-red-600' : previewQty === 0 ? 'text-gray-400' : 'text-gray-900'
                }`}>
                  = {previewQty} units
                </div>
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Reason <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. Stock count, damaged goods, supplier return…"
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => router.push(`/items/${itemId}`)}
                className="flex-1 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isValidQty || isSubmitting}
                className={`flex-1 py-3 rounded-xl font-semibold text-white transition-all ${
                  !isValidQty || isSubmitting
                    ? 'bg-gray-300 cursor-not-allowed'
                    : adjustType === 'add'
                    ? 'bg-green-600 hover:bg-green-700'
                    : adjustType === 'remove'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isSubmitting ? 'Saving…' : typeConfig[adjustType].label}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  )
}
