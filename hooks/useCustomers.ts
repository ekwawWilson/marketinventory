'use client'

import { useState, useEffect } from 'react'

/**
 * useCustomers Hook
 *
 * Fetch and manage customers data
 */

interface UseCustomersOptions {
  search?: string
  hasDebt?: boolean
}

export function useCustomers(options: UseCustomersOptions = {}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [customers, setCustomers] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCustomers = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (options.search) params.append('search', options.search)
      if (options.hasDebt) params.append('hasDebt', 'true')

      const response = await fetch(`/api/customers?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch customers')
      }

      const data = await response.json()
      setCustomers(data.customers || data)
      setSummary(data.summary)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch customers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [options.search, options.hasDebt])

  return {
    customers,
    summary,
    loading,
    error,
    refetch: fetchCustomers,
  }
}
