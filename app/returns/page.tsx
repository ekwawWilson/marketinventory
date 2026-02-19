'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { CustomerReturnWithDetails, SupplierReturnWithDetails } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { RotateCcw } from 'lucide-react'

type Tab = 'customers' | 'suppliers'
type ReturnKind = 'customer' | 'supplier'

const RETURN_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  CASH:     { label: '💵 Cash',     color: 'bg-green-100 text-green-800' },
  CREDIT:   { label: '📋 Credit',   color: 'bg-blue-100 text-blue-800' },
  EXCHANGE: { label: '🔄 Exchange', color: 'bg-purple-100 text-purple-800' },
}

export default function ReturnsPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('customers')

  const [customerReturns, setCustomerReturns] = useState<CustomerReturnWithDetails[]>([])
  const [supplierReturns, setSupplierReturns] = useState<SupplierReturnWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showProcessModal, setShowProcessModal] = useState(false)
  const [processKind, setProcessKind] = useState<ReturnKind>('customer')

  useEffect(() => { fetchReturns() }, [])

  const fetchReturns = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [cRes, sRes] = await Promise.all([
        fetch('/api/returns/customers'),
        fetch('/api/returns/suppliers'),
      ])
      if (!cRes.ok || !sRes.ok) throw new Error('Failed to load returns')
      const [cData, sData] = await Promise.all([cRes.json(), sRes.json()])
      setCustomerReturns(cData.returns || [])
      setSupplierReturns(sData.returns || [])
    } catch {
      setError('Failed to load returns. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredCustomer = customerReturns.filter(r => {
    const q = search.toLowerCase()
    return !q
      || r.item.name.toLowerCase().includes(q)
      || (r.sale.customer?.name || 'Walk-in').toLowerCase().includes(q)
      || r.saleId.toLowerCase().includes(q)
  })

  const filteredSupplier = supplierReturns.filter(r => {
    const q = search.toLowerCase()
    return !q
      || r.item.name.toLowerCase().includes(q)
      || r.purchase.supplier.name.toLowerCase().includes(q)
      || r.purchaseId.toLowerCase().includes(q)
  })

  const totalCustomerAmount = customerReturns.reduce((s, r) => s + r.amount, 0)
  const totalSupplierAmount = supplierReturns.reduce((s, r) => s + r.amount, 0)

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Returns</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {customerReturns.length} customer · {supplierReturns.length} supplier
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setProcessKind('customer'); setShowProcessModal(true) }}
              className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white font-semibold rounded-xl hover:bg-orange-700 transition-colors shadow-sm text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              Customer Return
            </button>
            <button
              onClick={() => { setProcessKind('supplier'); setShowProcessModal(true) }}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white font-semibold rounded-xl hover:bg-amber-700 transition-colors shadow-sm text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              Supplier Return
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase">Customer Returns</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{customerReturns.length}</p>
            <p className="text-xs text-gray-400 mt-1">items returned by customers</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase">Customer Refunds</p>
            <p className="text-xl font-bold text-red-500 mt-1">{formatCurrency(totalCustomerAmount)}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase">Supplier Returns</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{supplierReturns.length}</p>
            <p className="text-xs text-gray-400 mt-1">items sent back to suppliers</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase">Supplier Credits</p>
            <p className="text-xl font-bold text-green-600 mt-1">{formatCurrency(totalSupplierAmount)}</p>
          </div>
        </div>

        {/* Tabs + Search */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {([
              ['customers', '👤 Customer Returns'],
              ['suppliers', '🚚 Supplier Returns'],
            ] as [Tab, string][]).map(([t, label]) => (
              <button
                key={t}
                onClick={() => { setTab(t); setSearch('') }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  tab === t
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="relative flex-1 min-w-0">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder={tab === 'customers' ? 'Search by item or customer…' : 'Search by item or supplier…'}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-base"
            />
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
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse h-28" />
            ))}
          </div>
        ) : tab === 'customers' ? (
          <CustomerReturnsTable
            returns={filteredCustomer}
            total={customerReturns.length}
            search={search}
            onViewSale={id => router.push(`/sales/${id}`)}
          />
        ) : (
          <SupplierReturnsTable
            returns={filteredSupplier}
            total={supplierReturns.length}
            search={search}
            onViewPurchase={id => router.push(`/purchases/${id}`)}
          />
        )}
      </div>

      {/* Process Return Modal */}
      {showProcessModal && (
        <ProcessReturnModal
          kind={processKind}
          onClose={() => setShowProcessModal(false)}
          onSuccess={() => { setShowProcessModal(false); fetchReturns() }}
        />
      )}
    </AppLayout>
  )
}

/* -------------------------------------------------------------------------- */
/* Process Return Modal (used from Returns page directly)                     */
/* -------------------------------------------------------------------------- */

interface SaleOption {
  id: string
  createdAt: string
  customer: { name: string } | null
  items: { itemId: string; quantity: number; price: number; item: { id: string; name: string } }[]
}

interface PurchaseOption {
  id: string
  createdAt: string
  supplier: { name: string }
  items: { itemId: string; quantity: number; costPrice: number; item: { id: string; name: string } }[]
}

function ProcessReturnModal({
  kind,
  onClose,
  onSuccess,
}: {
  kind: ReturnKind
  onClose: () => void
  onSuccess: () => void
}) {
  const [step, setStep] = useState<'lookup' | 'form'>('lookup')
  const [lookupId, setLookupId] = useState('')
  const [isLooking, setIsLooking] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)

  const [sale, setSale] = useState<SaleOption | null>(null)
  const [purchase, setPurchase] = useState<PurchaseOption | null>(null)

  const [selectedItemId, setSelectedItemId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [returnType, setReturnType] = useState<'CASH' | 'CREDIT' | 'EXCHANGE'>('CASH')
  const [amount, setAmount] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleLookup = async () => {
    const id = lookupId.trim()
    if (!id) { setLookupError('Enter a sale or purchase ID'); return }
    setIsLooking(true)
    setLookupError(null)
    try {
      const endpoint = kind === 'customer' ? `/api/sales/${id}` : `/api/purchases/${id}`
      const res = await fetch(endpoint)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Not found')
      if (kind === 'customer') {
        setSale(data)
        setSelectedItemId(data.items?.[0]?.item?.id ?? '')
      } else {
        setPurchase(data)
        setSelectedItemId(data.items?.[0]?.item?.id ?? '')
      }
      setStep('form')
    } catch (e) {
      setLookupError(e instanceof Error ? e.message : 'Not found')
    } finally {
      setIsLooking(false)
    }
  }

  const items = kind === 'customer'
    ? (sale?.items || []).map(si => ({ id: si.item.id, name: si.item.name, qty: si.quantity, price: si.price }))
    : (purchase?.items || []).map(pi => ({ id: pi.item.id, name: pi.item.name, qty: pi.quantity, price: pi.costPrice }))

  const selectedItem = items.find(i => i.id === selectedItemId)
  const autoAmount = selectedItem ? (selectedItem.price * quantity).toFixed(2) : ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    const amountNum = parseFloat(amount)
    if (!selectedItemId) { setSubmitError('Select an item'); return }
    if (quantity <= 0) { setSubmitError('Quantity must be at least 1'); return }
    if (isNaN(amountNum) || amountNum < 0) { setSubmitError('Enter a valid amount'); return }
    if (selectedItem && quantity > selectedItem.qty) {
      setSubmitError(`Max: ${selectedItem.qty}`)
      return
    }

    setIsSubmitting(true)
    try {
      const endpoint = kind === 'customer' ? '/api/returns/customers' : '/api/returns/suppliers'
      const body = kind === 'customer'
        ? { saleId: sale!.id, itemId: selectedItemId, quantity, type: returnType, amount: amountNum }
        : { purchaseId: purchase!.id, itemId: selectedItemId, quantity, type: returnType, amount: amountNum }
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Return failed')
      onSuccess()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const title = kind === 'customer' ? 'Process Customer Return' : 'Process Supplier Return'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            {step === 'form' && (
              <button onClick={() => { setStep('lookup'); setSale(null); setPurchase(null) }}
                className="text-xs text-blue-600 hover:underline mt-0.5">
                ← Change {kind === 'customer' ? 'sale' : 'purchase'}
              </button>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {step === 'lookup' ? (
          <div className="p-5 space-y-4">
            <p className="text-sm text-gray-600">
              Enter the {kind === 'customer' ? 'Sale' : 'Purchase'} ID to look up the original transaction.
            </p>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {kind === 'customer' ? 'Sale' : 'Purchase'} ID
              </label>
              <input
                type="text"
                value={lookupId}
                onChange={e => setLookupId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLookup()}
                placeholder="Paste the full ID here…"
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none text-sm font-mono"
              />
            </div>
            {lookupError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-sm">
                ⚠ {lookupError}
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button onClick={onClose}
                className="flex-1 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleLookup} disabled={isLooking}
                className="flex-1 py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 disabled:opacity-50 transition-colors">
                {isLooking ? 'Looking up…' : 'Find'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Context pill */}
            <div className="bg-gray-50 rounded-xl p-3 text-sm">
              {kind === 'customer' ? (
                <p className="font-medium text-gray-700">
                  Sale <span className="font-mono text-xs">#{sale!.id.slice(0, 8).toUpperCase()}</span>
                  {' · '}{sale!.customer?.name || 'Walk-in'}
                </p>
              ) : (
                <p className="font-medium text-gray-700">
                  Purchase <span className="font-mono text-xs">#{purchase!.id.slice(0, 8).toUpperCase()}</span>
                  {' · '}{purchase!.supplier.name}
                </p>
              )}
            </div>

            {/* Item */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Item to Return</label>
              <select
                value={selectedItemId}
                onChange={e => { setSelectedItemId(e.target.value); setQuantity(1); setAmount('') }}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none text-sm"
              >
                {items.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.qty} × {formatCurrency(i.price)})
                  </option>
                ))}
              </select>
            </div>

            {/* Qty */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Quantity {selectedItem && <span className="text-xs font-normal text-gray-400 ml-1">max {selectedItem.qty}</span>}
              </label>
              <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden bg-white">
                <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 font-bold text-lg border-r border-gray-200">−</button>
                <input type="number" min={1} max={selectedItem?.qty} value={quantity}
                  onChange={e => { setQuantity(parseInt(e.target.value) || 1); setAmount('') }}
                  className="flex-1 text-center font-bold text-gray-900 focus:outline-none py-2.5 text-base" />
                <button type="button" onClick={() => setQuantity(q => q + 1)}
                  className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 font-bold text-lg border-l border-gray-200">+</button>
              </div>
            </div>

            {/* Return type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Return Type</label>
              <div className="grid grid-cols-3 gap-2">
                {(['CASH', 'CREDIT', 'EXCHANGE'] as const).map(t => (
                  <button key={t} type="button" onClick={() => setReturnType(t)}
                    className={`py-2.5 rounded-xl text-xs font-bold border-2 transition-colors ${
                      returnType === t
                        ? t === 'CASH' ? 'bg-green-600 text-white border-green-600'
                          : t === 'CREDIT' ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}>
                    {t === 'CASH' ? '💵 Cash' : t === 'CREDIT' ? '📋 Credit' : '🔄 Exchange'}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Amount (GH₵)</label>
              <div className="relative">
                <input type="number" step="0.01" min="0" value={amount}
                  placeholder={autoAmount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none text-lg font-bold" />
                {autoAmount && !amount && (
                  <button type="button" onClick={() => setAmount(autoAmount)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-orange-600 font-semibold hover:underline">
                    Use {formatCurrency(parseFloat(autoAmount))}
                  </button>
                )}
              </div>
            </div>

            {submitError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-sm">⚠ {submitError}</div>
            )}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting}
                className="flex-1 py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 disabled:opacity-50 transition-colors">
                {isSubmitting ? 'Processing…' : 'Confirm Return'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Customer Returns Table                                                      */
/* -------------------------------------------------------------------------- */

function CustomerReturnsTable({
  returns,
  total,
  search,
  onViewSale,
}: {
  returns: CustomerReturnWithDetails[]
  total: number
  search: string
  onViewSale: (id: string) => void
}) {
  if (returns.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center justify-center py-16">
        <span className="text-5xl mb-3">↩️</span>
        <p className="text-lg font-semibold text-gray-700">No customer returns found</p>
        <p className="text-sm text-gray-500 mt-1">
          {search ? 'Try a different search' : 'Process a return from any sale receipt page'}
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {returns.map(r => {
          const type = RETURN_TYPE_LABELS[r.type] ?? { label: r.type, color: 'bg-gray-100 text-gray-700' }
          return (
            <div
              key={r.id}
              onClick={() => onViewSale(r.saleId)}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 cursor-pointer active:bg-gray-50"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-gray-900">{r.item.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {r.sale.customer?.name || 'Walk-in Customer'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{formatDate(r.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold text-gray-900">{formatCurrency(r.amount)}</p>
                  <span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-bold ${type.color}`}>
                    {type.label}
                  </span>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <span>Qty: {r.quantity}</span>
                <span className="text-blue-600 font-semibold">View sale →</span>
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
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Item</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Sale ID</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase">Qty</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase">Type</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase">Amount</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {returns.map(r => {
              const type = RETURN_TYPE_LABELS[r.type] ?? { label: r.type, color: 'bg-gray-100 text-gray-700' }
              return (
                <tr key={r.id} className="hover:bg-blue-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-700">{formatDate(r.createdAt)}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{r.item.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {r.sale.customer?.name || 'Walk-in Customer'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                      #{r.saleId.slice(0, 8).toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-700">{r.quantity}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${type.color}`}>
                      {type.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                    {formatCurrency(r.amount)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => onViewSale(r.saleId)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      View Sale
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="px-6 py-3 bg-gray-50 border-t text-sm text-gray-500 font-medium">
          Showing {returns.length} of {total} customer returns
        </div>
      </div>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/* Supplier Returns Table                                                      */
/* -------------------------------------------------------------------------- */

function SupplierReturnsTable({
  returns,
  total,
  search,
  onViewPurchase,
}: {
  returns: SupplierReturnWithDetails[]
  total: number
  search: string
  onViewPurchase: (id: string) => void
}) {
  if (returns.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center justify-center py-16">
        <span className="text-5xl mb-3">📦</span>
        <p className="text-lg font-semibold text-gray-700">No supplier returns found</p>
        <p className="text-sm text-gray-500 mt-1">
          {search ? 'Try a different search' : 'Process a return from any purchase detail page'}
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {returns.map(r => {
          const type = RETURN_TYPE_LABELS[r.type] ?? { label: r.type, color: 'bg-gray-100 text-gray-700' }
          return (
            <div
              key={r.id}
              onClick={() => onViewPurchase(r.purchaseId)}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 cursor-pointer active:bg-gray-50"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-gray-900">{r.item.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{r.purchase.supplier.name}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatDate(r.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold text-gray-900">{formatCurrency(r.amount)}</p>
                  <span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-bold ${type.color}`}>
                    {type.label}
                  </span>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <span>Qty: {r.quantity}</span>
                <span className="text-blue-600 font-semibold">View purchase →</span>
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
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Item</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Supplier</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Purchase ID</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase">Qty</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase">Type</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase">Amount</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {returns.map(r => {
              const type = RETURN_TYPE_LABELS[r.type] ?? { label: r.type, color: 'bg-gray-100 text-gray-700' }
              return (
                <tr key={r.id} className="hover:bg-blue-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-700">{formatDate(r.createdAt)}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{r.item.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{r.purchase.supplier.name}</td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                      #{r.purchaseId.slice(0, 8).toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-700">{r.quantity}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${type.color}`}>
                      {type.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                    {formatCurrency(r.amount)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => onViewPurchase(r.purchaseId)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      View Purchase
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="px-6 py-3 bg-gray-50 border-t text-sm text-gray-500 font-medium">
          Showing {returns.length} of {total} supplier returns
        </div>
      </div>
    </>
  )
}
