'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { DataTable, Column } from '@/components/tables/DataTable'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { stockAdjustmentSchema, StockAdjustmentFormData } from '@/types/form'
import { useItems } from '@/hooks/useItems'
import { formatDate } from '@/lib/utils/format'

/**
 * Stock Adjustments Page
 *
 * View history and create new stock adjustments
 */

interface StockAdjustment {
  id: string
  type: string
  quantity: number
  reason: string
  createdAt: Date
  item: { id: string; name: string }
  user: { name: string }
}

export default function StockAdjustmentsPage() {
  const router = useRouter()
  const { items, refetch: refetchItems } = useItems()
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StockAdjustmentFormData>({
    resolver: zodResolver(stockAdjustmentSchema),
  })

  useEffect(() => {
    fetchAdjustments()
  }, [])

  const fetchAdjustments = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/adjustments')
      if (!response.ok) throw new Error('Failed to fetch adjustments')
      const data = await response.json()
      setAdjustments(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load adjustments')
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: StockAdjustmentFormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create adjustment')
      }

      alert('Stock adjustment created successfully!')
      reset()
      setShowForm(false)
      fetchAdjustments()
      refetchItems()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create adjustment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const columns: Column<StockAdjustment>[] = [
    {
      key: 'createdAt',
      label: 'Date',
      sortable: true,
      render: (adj) => formatDate(adj.createdAt),
    },
    {
      key: 'item',
      label: 'Item',
      sortable: true,
      render: (adj) => adj.item.name,
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (adj) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          adj.type === 'INCREASE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {adj.type}
        </span>
      ),
    },
    {
      key: 'quantity',
      label: 'Quantity',
      sortable: true,
      render: (adj) => (
        <span className={`font-semibold ${adj.type === 'INCREASE' ? 'text-green-600' : 'text-red-600'}`}>
          {adj.type === 'INCREASE' ? '+' : '-'}{adj.quantity}
        </span>
      ),
      className: 'text-center',
    },
    {
      key: 'reason',
      label: 'Reason',
      sortable: true,
    },
    {
      key: 'user',
      label: 'Created By',
      sortable: true,
      render: (adj) => adj.user.name,
    },
  ]

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Stock Adjustments</h1>
            <p className="text-sm text-gray-500 mt-1">
              Track inventory adjustments and corrections
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center space-x-2"
          >
            <span>{showForm ? '✕' : '+'}</span>
            <span>{showForm ? 'Cancel' : 'New Adjustment'}</span>
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Adjustment Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Item Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item *
                  </label>
                  <select
                    {...register('itemId')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Item</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} (Current: {item.quantity})
                      </option>
                    ))}
                  </select>
                  {errors.itemId && (
                    <p className="mt-1 text-sm text-red-600">{errors.itemId.message}</p>
                  )}
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type *
                  </label>
                  <select
                    {...register('type')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Type</option>
                    <option value="INCREASE">Increase Stock</option>
                    <option value="DECREASE">Decrease Stock</option>
                  </select>
                  {errors.type && (
                    <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
                  )}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  {...register('quantity', { valueAsNumber: true })}
                  min="1"
                  placeholder="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {errors.quantity && (
                  <p className="mt-1 text-sm text-red-600">{errors.quantity.message}</p>
                )}
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason *
                </label>
                <textarea
                  {...register('reason')}
                  rows={3}
                  placeholder="Explain the reason for this adjustment..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {errors.reason && (
                  <p className="mt-1 text-sm text-red-600">{errors.reason.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Adjustment'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Adjustments Table */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-gray-500">Loading adjustments...</div>
          </div>
        ) : (
          <DataTable
            data={adjustments}
            columns={columns}
            searchPlaceholder="Search adjustments..."
            emptyMessage="No stock adjustments found"
          />
        )}
      </div>
    </AppLayout>
  )
}
