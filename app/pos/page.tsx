'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { useBranch } from '@/lib/branch/BranchContext'
import { formatCurrency } from '@/lib/utils/format'

interface PosItem {
  id: string
  name: string
  barcode: string | null
  sellingPrice: number
  quantity: number
}

interface CartLine {
  itemId: string
  name: string
  price: number
  qty: number
  maxStock: number
}

type PaymentMethod = 'CASH' | 'MOMO' | 'BANK'

/**
 * POS Terminal Page
 * Fullscreen checkout — no sidebar/header.
 * Barcode-scan-first, keyboard-driven, instant checkout.
 */
export default function PosPage() {
  const router = useRouter()
  const { user } = useUser()
  const { currentBranch } = useBranch()

  // Item catalog (loaded once, refreshed on demand)
  const [allItems, setAllItems] = useState<PosItem[]>([])
  const [isLoadingItems, setIsLoadingItems] = useState(true)

  // Search / grid state
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  // Cart state
  const [cart, setCart] = useState<CartLine[]>([])
  const [selectedCartIdx, setSelectedCartIdx] = useState<number | null>(null)

  // Payment state
  const [method, setMethod] = useState<PaymentMethod>('CASH')
  const [tendered, setTendered] = useState('')
  const [numpadBuffer, setNumpadBuffer] = useState('')

  // Checkout feedback
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [flashSuccess, setFlashSuccess] = useState(false)
  const [lastSaleId, setLastSaleId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  // Load items
  const loadItems = useCallback(async () => {
    setIsLoadingItems(true)
    try {
      const res = await fetch('/api/pos/items?limit=200')
      if (res.ok) {
        const data = await res.json()
        setAllItems(Array.isArray(data) ? data : [])
      }
    } finally {
      setIsLoadingItems(false)
    }
  }, [])

  useEffect(() => { loadItems() }, [loadItems])

  // Auto-focus search on load
  useEffect(() => { searchRef.current?.focus() }, [])

  // Filtered item grid
  const q = search.trim().toLowerCase()
  const displayItems = q
    ? allItems.filter(
        i =>
          i.name.toLowerCase().includes(q) ||
          (i.barcode && i.barcode.startsWith(search.trim()))
      )
    : allItems.slice(0, 60)

  // Cart helpers
  const addToCart = (item: PosItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.itemId === item.id)
      if (existing) {
        return prev.map(c =>
          c.itemId === item.id
            ? { ...c, qty: Math.min(c.qty + 1, c.maxStock) }
            : c
        )
      }
      return [...prev, { itemId: item.id, name: item.name, price: item.sellingPrice, qty: 1, maxStock: item.quantity }]
    })
    setSearch('')
    searchRef.current?.focus()
  }

  const removeFromCart = (idx: number) => {
    setCart(prev => prev.filter((_, i) => i !== idx))
    setSelectedCartIdx(null)
  }

  const updateCartQty = (idx: number, qty: number) => {
    if (qty <= 0) { removeFromCart(idx); return }
    setCart(prev => prev.map((c, i) => i === idx ? { ...c, qty: Math.min(qty, c.maxStock) } : c))
  }

  // Barcode scan: if search matches a barcode exactly, add immediately
  const handleSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const exact = allItems.find(i => i.barcode === search.trim())
      if (exact) { addToCart(exact); return }
      if (displayItems.length === 1) { addToCart(displayItems[0]); return }
    }
    if (e.key === 'Escape') { setSearch(''); searchRef.current?.focus() }
  }

  // Totals
  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0)
  const tenderedNum = parseFloat(tendered) || 0
  const change = tenderedNum - subtotal

  // Numpad — applies to tendered amount or selected cart item qty
  const numpadPress = (key: string) => {
    if (selectedCartIdx !== null) {
      // Apply numpad to cart item qty
      let buf = numpadBuffer
      if (key === '←') { buf = buf.slice(0, -1) }
      else if (key === 'C') { buf = '' }
      else if (key === '✓') {
        const qty = parseInt(buf, 10) || 1
        updateCartQty(selectedCartIdx, qty)
        setNumpadBuffer('')
        setSelectedCartIdx(null)
        return
      } else { buf = buf + key }
      setNumpadBuffer(buf)
    } else {
      // Apply numpad to tendered amount
      let buf = tendered
      if (key === '←') { buf = buf.slice(0, -1) }
      else if (key === 'C') { buf = '' }
      else if (key === '✓') { /* confirm — submit handled by button */ }
      else if (key === '.' && buf.includes('.')) { /* skip second dot */ }
      else { buf = buf + key }
      setTendered(buf)
    }
  }

  // Checkout
  const handleCheckout = async () => {
    if (cart.length === 0 || isSubmitting) return
    setErrorMsg('')
    setIsSubmitting(true)
    try {
      const paidAmount = method === 'CASH'
        ? (tenderedNum > 0 ? Math.min(tenderedNum, subtotal) : subtotal)
        : subtotal
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(c => ({ itemId: c.itemId, quantity: c.qty, price: c.price, discountAmount: 0 })),
          paidAmount,
          paymentMethod: method,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to record sale')
      }
      const result = await res.json()
      setLastSaleId(result.id || result.data?.id || null)
      // Flash success, then reset
      setFlashSuccess(true)
      setTimeout(() => {
        setCart([])
        setTendered('')
        setNumpadBuffer('')
        setSelectedCartIdx(null)
        setFlashSuccess(false)
        setLastSaleId(null)
        loadItems() // refresh stock counts
        searchRef.current?.focus()
      }, 2000)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Checkout failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Success flash overlay
  if (flashSuccess) {
    return (
      <div className="fixed inset-0 bg-green-600 flex flex-col items-center justify-center text-white z-50">
        <div className="text-8xl mb-6">✓</div>
        <h2 className="text-4xl font-bold mb-2">Sale Complete!</h2>
        <p className="text-xl opacity-80 mb-8">{formatCurrency(subtotal)}</p>
        {lastSaleId && (
          <button
            onClick={() => window.open(`/sales/${lastSaleId}`, '_blank')}
            className="px-8 py-3 bg-white text-green-700 font-bold rounded-2xl hover:bg-green-50 text-lg"
          >
            Print Receipt
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gray-100 flex flex-col overflow-hidden">

      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-indigo-700 text-white shrink-0">
        <span className="font-bold text-lg tracking-wide">PETROS POS</span>
        {currentBranch && (
          <span className="text-indigo-200 text-sm font-medium">· {currentBranch.name}</span>
        )}
        <div className="flex-1" />
        {user?.name && (
          <span className="text-indigo-200 text-sm">Cashier: {user.name}</span>
        )}
        <button
          onClick={() => router.push('/sales')}
          title="Exit POS"
          className="ml-2 p-1.5 rounded-lg hover:bg-indigo-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Main 2-column layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT PANEL — search + item grid */}
        <div className="flex flex-col flex-1 overflow-hidden">

          {/* Search / barcode */}
          <div className="px-4 pt-3 pb-2 bg-white border-b border-gray-200 shrink-0">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={handleSearchKey}
                placeholder="Search item or scan barcode..."
                className="w-full pl-10 pr-4 py-3 border-2 border-indigo-300 rounded-xl focus:border-indigo-500 focus:outline-none text-base font-medium"
                autoComplete="off"
                autoFocus
              />
            </div>
          </div>

          {/* Item grid */}
          <div className="flex-1 overflow-y-auto p-3">
            {isLoadingItems ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                {Array.from({ length: 18 }).map((_, i) => (
                  <div key={i} className="h-20 bg-white rounded-xl animate-pulse border border-gray-200" />
                ))}
              </div>
            ) : displayItems.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-gray-400">
                <span className="text-5xl mb-3">📦</span>
                <p className="font-semibold">{q ? 'No items match' : 'No items in stock'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                {displayItems.map(item => {
                  const inCart = cart.find(c => c.itemId === item.id)
                  return (
                    <button
                      key={item.id}
                      onClick={() => addToCart(item)}
                      className={`relative flex flex-col items-center justify-center p-2 rounded-xl border-2 text-center transition-all active:scale-95 ${
                        inCart
                          ? 'bg-indigo-50 border-indigo-400 shadow-md'
                          : 'bg-white border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                      }`}
                    >
                      {inCart && (
                        <span className="absolute top-1 right-1 w-5 h-5 bg-indigo-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                          {inCart.qty}
                        </span>
                      )}
                      <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg mb-1">
                        {item.name.charAt(0).toUpperCase()}
                      </div>
                      <p className="text-xs font-semibold text-gray-900 leading-tight line-clamp-2">{item.name}</p>
                      <p className="text-xs font-bold text-indigo-600 mt-0.5">{formatCurrency(item.sellingPrice)}</p>
                      <p className="text-[10px] text-gray-400">Stk: {item.quantity}</p>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL — cart + numpad + payment */}
        <div className="flex flex-col w-80 xl:w-96 bg-white border-l border-gray-200 shrink-0 overflow-hidden">

          {/* Cart header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
            <span className="font-bold text-gray-800">
              Cart
              {cart.length > 0 && (
                <span className="ml-1.5 bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full">{cart.length}</span>
              )}
            </span>
            {cart.length > 0 && (
              <button onClick={() => { setCart([]); setSelectedCartIdx(null) }} className="text-xs text-red-500 hover:text-red-700 font-semibold">
                Clear
              </button>
            )}
          </div>

          {/* Cart lines */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 min-h-0">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-gray-300">
                <span className="text-4xl mb-2">🛒</span>
                <p className="text-sm">Cart is empty</p>
              </div>
            ) : (
              cart.map((line, idx) => (
                <div
                  key={line.itemId}
                  onClick={() => setSelectedCartIdx(idx === selectedCartIdx ? null : idx)}
                  className={`px-3 py-2.5 cursor-pointer transition-colors ${
                    selectedCartIdx === idx ? 'bg-indigo-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{line.name}</p>
                      <p className="text-xs text-gray-400">{line.qty} × {formatCurrency(line.price)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(line.qty * line.price)}</p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); removeFromCart(idx) }}
                      className="text-red-300 hover:text-red-500 text-lg leading-none shrink-0 ml-1"
                    >
                      ×
                    </button>
                  </div>
                  {selectedCartIdx === idx && (
                    <div className="mt-1.5 flex items-center gap-1 text-xs text-indigo-600 font-medium">
                      <span>Use numpad to set qty</span>
                      {numpadBuffer && <span className="bg-indigo-100 px-1.5 py-0.5 rounded font-mono">{numpadBuffer}</span>}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Total */}
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 shrink-0">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-600">TOTAL</span>
              <span className="text-2xl font-bold text-gray-900">{formatCurrency(subtotal)}</span>
            </div>
          </div>

          {/* Numpad */}
          <div className="px-3 py-2 shrink-0 border-t border-gray-100">
            <div className="grid grid-cols-3 gap-1.5">
              {['7','8','9','4','5','6','1','2','3','.','0','←'].map(k => (
                <button
                  key={k}
                  onClick={() => numpadPress(k)}
                  className="py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-base font-bold text-gray-800 transition-colors active:scale-95"
                >
                  {k}
                </button>
              ))}
              <button onClick={() => numpadPress('C')} className="py-2.5 bg-red-100 hover:bg-red-200 rounded-lg text-sm font-bold text-red-700 transition-colors active:scale-95">C</button>
              <button onClick={() => numpadPress('00')} className="py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-base font-bold text-gray-800 transition-colors active:scale-95">00</button>
              <button onClick={() => numpadPress('✓')} className="py-2.5 bg-green-100 hover:bg-green-200 rounded-lg text-base font-bold text-green-700 transition-colors active:scale-95">✓</button>
            </div>
          </div>

          {/* Payment method */}
          <div className="px-3 pb-2 shrink-0">
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              {(['CASH', 'MOMO', 'BANK'] as PaymentMethod[]).map(m => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`py-2 rounded-lg text-xs font-bold transition-colors border-2 ${
                    method === m ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  {m === 'CASH' ? '💵' : m === 'MOMO' ? '📱' : '🏦'} {m}
                </button>
              ))}
            </div>

            {method === 'CASH' && (
              <div className="mb-2">
                <input
                  type="number"
                  value={tendered}
                  onChange={e => setTendered(e.target.value)}
                  placeholder={`Tendered (e.g. ${subtotal > 0 ? subtotal.toFixed(2) : '0.00'})`}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm font-bold focus:border-indigo-400 focus:outline-none"
                />
                {tendered && change >= 0 && (
                  <div className="mt-1 flex justify-between text-sm font-bold text-green-700 bg-green-50 px-2 py-1 rounded-lg">
                    <span>Change:</span><span>{formatCurrency(change)}</span>
                  </div>
                )}
                {tendered && change < 0 && (
                  <div className="mt-1 flex justify-between text-sm font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg">
                    <span>Short:</span><span>{formatCurrency(Math.abs(change))}</span>
                  </div>
                )}
              </div>
            )}

            {errorMsg && (
              <p className="text-xs text-red-600 bg-red-50 px-2 py-1.5 rounded-lg mb-2">{errorMsg}</p>
            )}

            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || isSubmitting}
              className="w-full py-3.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold rounded-xl text-base transition-colors active:scale-95 shadow-md"
            >
              {isSubmitting ? 'Processing...' : `✓ Pay — ${formatCurrency(subtotal)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
