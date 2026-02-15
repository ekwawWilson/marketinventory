'use client'

import { DataTable, Column } from './DataTable'
import { ItemWithManufacturer } from '@/types'
import { formatCurrency } from '@/lib/utils/format'

/**
 * Items Table Component
 *
 * Displays inventory items with stock levels and pricing
 */

interface ItemsTableProps {
  items: ItemWithManufacturer[]
  onItemClick?: (item: ItemWithManufacturer) => void
}

export function ItemsTable({ items, onItemClick }: ItemsTableProps) {
  const columns: Column<ItemWithManufacturer>[] = [
    {
      key: 'name',
      label: 'Item Name & Manufacturer',
      sortable: true,
      render: (item) => (
        <div>
          <div className="font-bold text-gray-900 text-base">{item.name}</div>
          <div className="text-sm font-semibold text-blue-600 mt-1">
            📦 {item.manufacturer?.name || 'Unknown Manufacturer'}
          </div>
        </div>
      ),
    },
    {
      key: 'quantity',
      label: 'Stock',
      sortable: true,
      render: (item) => {
        const isLowStock = item.quantity <= 10
        return (
          <span
            className={`font-semibold ${
              isLowStock ? 'text-red-600' : 'text-gray-900'
            }`}
          >
            {item.quantity}
            {isLowStock && (
              <span className="ml-1 text-xs">⚠️</span>
            )}
          </span>
        )
      },
      className: 'text-center',
    },
    {
      key: 'costPrice',
      label: 'Cost Price',
      sortable: true,
      render: (item) => (
        <span className="text-gray-600">{formatCurrency(item.costPrice)}</span>
      ),
      className: 'text-right',
    },
    {
      key: 'sellingPrice',
      label: 'Selling Price',
      sortable: true,
      render: (item) => (
        <span className="font-semibold">{formatCurrency(item.sellingPrice)}</span>
      ),
      className: 'text-right',
    },
    {
      key: 'profit',
      label: 'Profit/Unit',
      sortable: true,
      render: (item) => {
        const profit = item.sellingPrice - item.costPrice
        return (
          <span className={profit > 0 ? 'text-green-600 font-medium' : 'text-gray-600'}>
            {formatCurrency(profit)}
          </span>
        )
      },
      className: 'text-right',
    },
    {
      key: 'totalValue',
      label: 'Stock Value',
      sortable: true,
      render: (item) => {
        const value = item.quantity * item.costPrice
        return <span className="text-gray-900">{formatCurrency(value)}</span>
      },
      className: 'text-right',
    },
  ]

  return (
    <DataTable
      data={items}
      columns={columns}
      searchPlaceholder="Search items by name, manufacturer..."
      emptyMessage="No items found"
      onRowClick={onItemClick}
    />
  )
}
