'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { SaleForm } from '@/components/forms/SaleForm'
import Link from 'next/link'

export default function NewSalePage() {
  const router = useRouter()
  const [isSuccess, setIsSuccess] = useState(false)
  const [lastSaleId, setLastSaleId] = useState<string | null>(null)

  const handleSubmit = async (data: unknown) => {
    const response = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create sale')
    }

    const result = await response.json()
    setLastSaleId(result.id || result.data?.id || null)
    setIsSuccess(true)
  }

  const handleCancel = () => router.push('/sales')

  if (isSuccess) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto text-center py-12">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-5xl">✓</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sale Created!</h2>
          <p className="text-gray-600 mb-8">The sale was recorded successfully.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {lastSaleId && (
              <Link
                href={`/sales/${lastSaleId}`}
                className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
              >
                Print Receipt
              </Link>
            )}
            <button
              onClick={() => { setIsSuccess(false); setLastSaleId(null) }}
              className="px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors"
            >
              New Sale
            </button>
            <button
              onClick={() => router.push('/sales')}
              className="px-6 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50"
            >
              View All Sales
            </button>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleCancel}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">New Sale</h1>
            <p className="text-sm text-gray-500">Record a new sales transaction</p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 md:p-6">
          <SaleForm onSubmit={handleSubmit} onCancel={handleCancel} />
        </div>
      </div>
    </AppLayout>
  )
}
