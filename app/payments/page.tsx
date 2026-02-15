'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { DataTable, Column } from '@/components/tables/DataTable'
import { formatCurrency, formatDate } from '@/lib/utils/format'

/**
 * Payments History Page
 *
 * Displays all customer and supplier payments
 */

interface Payment {
  id: string
  amount: number
  method: string
  createdAt: Date
  customer?: { id: string; name: string }
  supplier?: { id: string; name: string }
}

export default function PaymentsPage() {
  const router = useRouter()
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    try {
      setIsLoading(true)
      // Fetch both customer and supplier payments
      const [customerRes, supplierRes] = await Promise.all([
        fetch('/api/payments/customers'),
        fetch('/api/payments/suppliers'),
      ])

      if (!customerRes.ok || !supplierRes.ok) {
        throw new Error('Failed to fetch payments')
      }

      const customerData = await customerRes.json()
      const supplierData = await supplierRes.json()

      // Combine and sort by date
      const allPayments = [
        ...(customerData.data || []),
        ...(supplierData.data || []),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      setPayments(allPayments)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments')
    } finally {
      setIsLoading(false)
    }
  }

  const columns: Column<Payment>[] = [
    {
      key: 'createdAt',
      label: 'Date',
      sortable: true,
      render: (payment) => formatDate(payment.createdAt),
    },
    {
      key: 'id',
      label: 'Payment ID',
      sortable: true,
      render: (payment) => (
        <span className="font-mono text-xs">{payment.id.slice(0, 8)}</span>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (payment) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          payment.customer ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
        }`}>
          {payment.customer ? 'Customer' : 'Supplier'}
        </span>
      ),
    },
    {
      key: 'entity',
      label: 'Customer/Supplier',
      sortable: true,
      render: (payment) => payment.customer?.name || payment.supplier?.name || '-',
    },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      render: (payment) => (
        <span className="font-semibold text-green-600">
          {formatCurrency(payment.amount)}
        </span>
      ),
      className: 'text-right',
    },
    {
      key: 'method',
      label: 'Method',
      sortable: true,
      render: (payment) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {payment.method}
        </span>
      ),
    },
  ]

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>
            <p className="text-sm text-gray-500 mt-1">
              View all customer and supplier payments
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/payments/customers')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Customer Payment
            </button>
            <button
              onClick={() => router.push('/payments/suppliers')}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
            >
              Supplier Payment
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-gray-500">Loading payments...</div>
          </div>
        ) : (
          <DataTable
            data={payments}
            columns={columns}
            searchPlaceholder="Search payments..."
            emptyMessage="No payments found"
          />
        )}
      </div>
    </AppLayout>
  )
}
