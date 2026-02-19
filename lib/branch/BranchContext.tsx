'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface Branch {
  id: string
  name: string
  isDefault: boolean
}

interface BranchContextValue {
  branches: Branch[]
  currentBranchId: string | null  // null = "All Branches" (owner view)
  currentBranch: Branch | null
  setBranchId: (id: string | null) => void
  isLoading: boolean
}

const BranchContext = createContext<BranchContextValue>({
  branches: [],
  currentBranchId: null,
  currentBranch: null,
  setBranchId: () => {},
  isLoading: false,
})

const STORAGE_KEY = 'petros_branch_id'

export function BranchProvider({ children }: { children: ReactNode }) {
  const [branches, setBranches] = useState<Branch[]>([])
  const [currentBranchId, setCurrentBranchId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? sessionStorage.getItem(STORAGE_KEY) : null
    fetchBranches(saved)
  }, [])

  const fetchBranches = async (savedId?: string | null) => {
    try {
      const res = await fetch('/api/branches')
      if (!res.ok) return
      const data = await res.json()
      const list: Branch[] = data.branches || []
      setBranches(list)

      if (list.length === 0) return

      // Restore saved selection, fall back to default branch
      if (savedId && list.find(b => b.id === savedId)) {
        setCurrentBranchId(savedId)
      } else {
        const def = list.find(b => b.isDefault) || list[0]
        setCurrentBranchId(def.id)
        if (typeof window !== 'undefined') sessionStorage.setItem(STORAGE_KEY, def.id)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const setBranchId = (id: string | null) => {
    setCurrentBranchId(id)
    if (typeof window !== 'undefined') {
      if (id) sessionStorage.setItem(STORAGE_KEY, id)
      else sessionStorage.removeItem(STORAGE_KEY)
    }
  }

  const currentBranch = branches.find(b => b.id === currentBranchId) ?? null

  return (
    <BranchContext.Provider value={{ branches, currentBranchId, currentBranch, setBranchId, isLoading }}>
      {children}
    </BranchContext.Provider>
  )
}

export function useBranch() {
  return useContext(BranchContext)
}
