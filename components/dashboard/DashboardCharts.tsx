'use client'

import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { formatCurrency } from '@/lib/utils/format'

interface DashboardData {
  salesLast7Days: { date: string; revenue: number; label: string }[]
  paymentMethodSplit: { method: string; value: number; color: string }[]
  topItems: { name: string; revenue: number; qty: number }[]
  kpis: {
    todayRevenue: number
    totalCustomers: number
    stockValue: number
    outstandingDebt: number
  }
}

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 p-4 shadow-sm`}>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-lg text-xs">
        <p className="font-semibold text-gray-700 mb-0.5">{label}</p>
        <p className="text-green-600 font-bold">{formatCurrency(payload[0].value)}</p>
      </div>
    )
  }
  return null
}

export function DashboardCharts() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setIsLoading(false) })
      .catch(() => setIsLoading(false))
  }, [])

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-2xl h-20" />
        ))}
      </div>
    )
  }

  if (!data) return null

  const hasPaymentData = data.paymentMethodSplit.some(p => p.value > 0)
  const hasChartData = data.salesLast7Days.some(d => d.revenue > 0)

  return (
    <div className="space-y-5">

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Today's Revenue"
          value={formatCurrency(data.kpis.todayRevenue)}
          sub="sales today"
          color="text-green-600"
        />
        <KpiCard
          label="Total Customers"
          value={data.kpis.totalCustomers.toString()}
          sub="registered"
          color="text-blue-600"
        />
        <KpiCard
          label="Stock Value"
          value={formatCurrency(data.kpis.stockValue)}
          sub="at cost price"
          color="text-indigo-600"
        />
        <KpiCard
          label="Outstanding Debt"
          value={formatCurrency(data.kpis.outstandingDebt)}
          sub="from customers"
          color="text-red-600"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Sales Bar Chart — takes 2/3 width on large */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm font-bold text-gray-800 mb-4">Sales — Last 7 Days</p>
          {hasChartData ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.salesLast7Days} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" fill="#22c55e" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-44 text-gray-400 text-sm">
              No sales data yet for the last 7 days
            </div>
          )}
        </div>

        {/* Payment Method Donut — 1/3 width */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm font-bold text-gray-800 mb-2">Payments (7 days)</p>
          {hasPaymentData ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={data.paymentMethodSplit.filter(p => p.value > 0)}
                  cx="50%"
                  cy="45%"
                  innerRadius={45}
                  outerRadius={68}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {data.paymentMethodSplit.filter(p => p.value > 0).map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Legend
                  formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
                  iconType="circle"
                  iconSize={8}
                />
                <Tooltip
                  formatter={(value: number | undefined) => [formatCurrency(value ?? 0), '']}
                  contentStyle={{ borderRadius: 12, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-44 text-gray-400 text-sm">
              No payment data yet
            </div>
          )}
        </div>
      </div>

      {/* Top Items */}
      {data.topItems.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm font-bold text-gray-800 mb-3">Top Selling Items (7 days)</p>
          <div className="space-y-2">
            {data.topItems.map((item, i) => {
              const maxRevenue = data.topItems[0].revenue
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                      <p className="text-sm font-bold text-green-600 ml-2 shrink-0">{formatCurrency(item.revenue)}</p>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-green-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.round((item.revenue / maxRevenue) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}
