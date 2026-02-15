'use client'

import { useState, useEffect } from 'react'

/**
 * useSuppliers Hook
 *
 * Fetch and manage suppliers data
 */

interface UseSuppliersOptions {
  search?: string
  hasCredit?: boolean
}

export function useSuppliers(options: UseSuppliersOptions = {}) {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSuppliers = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (options.search) params.append('search', options.search)
      if (options.hasCredit) params.append('hasCredit', 'true')

      const response = await fetch(`/api/suppliers?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch suppliers')
      }

      const data = await response.json()
      setSuppliers(data.suppliers || data)
      setSummary(data.summary)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch suppliers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSuppliers()
  }, [options.search, options.hasCredit])

  return {
    suppliers,
    summary,
    loading,
    error,
    refetch: fetchSuppliers,
  }
}
