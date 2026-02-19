/**
 * API Request/Response Types
 */

// Common API response
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
}

// Paginated response
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

// Sale creation request
export interface CreateSaleRequest {
  customerId?: string
  paidAmount?: number
  items: {
    itemId: string
    quantity: number
    price?: number
  }[]
}

// Purchase creation request
export interface CreatePurchaseRequest {
  supplierId: string
  paidAmount?: number
  items: {
    itemId: string
    quantity: number
    costPrice?: number
  }[]
}

// Item creation/update request
export interface ItemRequest {
  manufacturerId: string
  name: string
  quantity?: number
  costPrice: number
  sellingPrice: number
}

// Customer creation/update request
export interface CustomerRequest {
  name: string
  phone?: string
}

// Supplier creation/update request
export interface SupplierRequest {
  name: string
  phone?: string
}

// Payment request
export interface PaymentRequest {
  customerId?: string
  supplierId?: string
  amount: number
  method: 'CASH' | 'MOMO' | 'BANK'
}

// Return request
export interface ReturnRequest {
  saleId?: string
  purchaseId?: string
  itemId: string
  quantity: number
  type: 'CASH' | 'CREDIT' | 'EXCHANGE'
  amount: number
}

// Stock adjustment request
export interface StockAdjustmentRequest {
  itemId: string
  type: 'INCREASE' | 'DECREASE'
  quantity: number
  reason: string
}

// Report query parameters
export interface ReportQuery {
  type: 'sales' | 'purchases' | 'inventory' | 'debtors' | 'creditors' | 'profit' | 'dashboard'
  startDate?: string
  endDate?: string
}

// Tenant registration request
export interface TenantRegistrationRequest {
  name: string
  email: string
  password: string
  businessName: string
  phone?: string
}
