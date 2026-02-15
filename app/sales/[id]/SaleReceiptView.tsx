'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ThermalReceipt, printReceipt } from '@/components/receipts/ThermalReceipt'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { Printer, Eye, EyeOff, Pencil } from 'lucide-react'

interface SaleItem {
  id: string
  quantity: number
  price: number
  item: {
    id: string
    name: string
    manufacturer: {
      id: string
      name: string
    } | null
  }
}

interface Sale {
  id: string
  totalAmount: number
  paidAmount: number
  createdAt: Date
  customer: {
    id: string
    name: string
  } | null
  items: SaleItem[]
}

interface Tenant {
  id: string
  name: string
  phone: string | null
  showManufacturerOnReceipt: boolean
  receiptPrinterWidth: string
}

interface SaleReceiptViewProps {
  sale: Sale
  tenant: Tenant
}

export function SaleReceiptView({ sale, tenant }: SaleReceiptViewProps) {
  const [showPreview, setShowPreview] = useState(true)
  const router = useRouter()

  const creditAmount = sale.totalAmount - sale.paidAmount
  const changeAmount = sale.paidAmount > sale.totalAmount ? sale.paidAmount - sale.totalAmount : 0

  // Prepare receipt data
  const receiptData = {
    receiptNumber: sale.id.slice(0, 8).toUpperCase(),
    date: formatDate(sale.createdAt),
    time: new Date(sale.createdAt).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    tenantName: tenant.name,
    tenantPhone: tenant.phone || undefined,
    customerName: sale.customer?.name,
    items: sale.items.map((saleItem) => ({
      name: saleItem.item.name,
      manufacturer: saleItem.item.manufacturer ?? undefined,
      quantity: saleItem.quantity,
      price: saleItem.price,
      total: saleItem.price * saleItem.quantity,
    })),
    subtotal: sale.totalAmount,
    discount: 0,
    total: sale.totalAmount,
    paidAmount: sale.paidAmount,
    change: changeAmount,
    paymentType: creditAmount > 0 ? 'CREDIT' : 'CASH',
    showManufacturer: tenant.showManufacturerOnReceipt,
  }

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-end">
        <button
          onClick={() => router.push(`/sales/${sale.id}/edit`)}
          className="px-5 py-3 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg font-semibold hover:bg-indigo-100 transition-colors flex items-center gap-2"
        >
          <Pencil className="w-4 h-4" />
          Edit Sale
        </button>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="px-5 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors flex items-center gap-2"
        >
          {showPreview ? (
            <>
              <EyeOff className="w-5 h-5" />
              Hide Preview
            </>
          ) : (
            <>
              <Eye className="w-5 h-5" />
              Show Preview
            </>
          )}
        </button>
        <button
          onClick={printReceipt}
          className="px-5 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg"
        >
          <Printer className="w-5 h-5" />
          Print Receipt
        </button>
      </div>

      {/* Sale Summary Card */}
      <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Sale Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-sm font-semibold text-gray-600">Sale ID:</span>
            <p className="text-base font-mono text-gray-900">
              {sale.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-600">Date & Time:</span>
            <p className="text-base text-gray-900">
              {formatDate(sale.createdAt)} at{' '}
              {new Date(sale.createdAt).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-600">Customer:</span>
            <p className="text-base text-gray-900">
              {sale.customer?.name || 'Walk-in Customer'}
            </p>
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-600">Items Count:</span>
            <p className="text-base text-gray-900">{sale.items.length} items</p>
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-600">Total Amount:</span>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(sale.totalAmount)}
            </p>
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-600">Paid Amount:</span>
            <p className="text-xl font-bold text-green-600">
              {formatCurrency(sale.paidAmount)}
            </p>
          </div>
          {creditAmount > 0 && (
            <div>
              <span className="text-sm font-semibold text-gray-600">Credit Amount:</span>
              <p className="text-xl font-bold text-red-600">
                {formatCurrency(creditAmount)}
              </p>
            </div>
          )}
          {changeAmount > 0 && (
            <div>
              <span className="text-sm font-semibold text-gray-600">Change:</span>
              <p className="text-xl font-bold text-blue-600">
                {formatCurrency(changeAmount)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden">
        <div className="p-6 border-b-2 border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Items Sold</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sale.items.map((saleItem) => (
                <tr key={saleItem.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900 text-base">
                      {saleItem.item.name}
                    </div>
                    {saleItem.item.manufacturer && (
                      <div className="text-sm font-semibold text-blue-600 mt-1">
                        📦 {saleItem.item.manufacturer.name}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center text-gray-900 font-semibold">
                    {saleItem.quantity}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-900 font-semibold">
                    {formatCurrency(saleItem.price)}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-900 font-bold">
                    {formatCurrency(saleItem.price * saleItem.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Preview */}
      {showPreview && (
        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Receipt Preview</h2>
            <div className="text-sm text-gray-600">
              Width: {tenant.receiptPrinterWidth}
            </div>
          </div>
          <div className="bg-gray-100 p-8 rounded-lg flex justify-center">
            <ThermalReceipt
              data={receiptData}
              width={tenant.receiptPrinterWidth as '58mm' | '80mm'}
            />
          </div>
          <p className="text-sm text-gray-600 text-center mt-4">
            This is how the receipt will appear when printed
          </p>
        </div>
      )}
    </div>
  )
}
