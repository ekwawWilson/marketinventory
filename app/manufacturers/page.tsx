'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { DataTable, Column } from '@/components/tables/DataTable'
import { Manufacturer } from '@/types'

/**
 * Manufacturers List Page
 *
 * Displays all manufacturers
 */

export default function ManufacturersPage() {
  const router = useRouter()
  const [manufacturers, setManufacturers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchManufacturers()
  }, [])

  const fetchManufacturers = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/manufacturers')
      if (!response.ok) throw new Error('Failed to fetch manufacturers')
      const data = await response.json()
      setManufacturers(Array.isArray(data) ? data : data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load manufacturers')
    } finally {
      setIsLoading(false)
    }
  }

  const columns: Column<any>[] = [
    {
      key: 'name',
      label: 'Manufacturer Name',
      sortable: true,
    },
    {
      key: '_count',
      label: 'Total Items',
      sortable: true,
      render: (manufacturer) => (
        <span className="text-gray-600">{manufacturer._count?.items || 0}</span>
      ),
      className: 'text-center',
    },
  ]

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manufacturers</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage product manufacturers
            </p>
          </div>
          <button
            onClick={() => router.push('/manufacturers/new')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center space-x-2"
          >
            <span>+</span>
            <span>New Manufacturer</span>
          </button>
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
            <div className="text-gray-500">Loading manufacturers...</div>
          </div>
        ) : (
          <DataTable
            data={manufacturers}
            columns={columns}
            searchPlaceholder="Search manufacturers..."
            emptyMessage="No manufacturers found"
          />
        )}
      </div>
    </AppLayout>
  )
}
