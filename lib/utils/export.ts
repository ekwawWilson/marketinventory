/**
 * Export Utilities — CSV and Excel download helpers
 *
 * Usage:
 *   exportCSV([{ name: 'Item A', qty: 10 }], 'inventory')
 *   exportExcel([{ name: 'Item A', qty: 10 }], 'inventory')
 */

/**
 * Convert an array of objects to a CSV string and trigger download.
 */
export function exportCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return

  const headers = Object.keys(rows[0])
  const lines = [
    headers.join(','),
    ...rows.map(row =>
      headers
        .map(h => {
          const val = row[h] ?? ''
          // Wrap in quotes if value contains comma, quote, or newline
          const str = String(val)
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str
        })
        .join(',')
    ),
  ]

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(blob, `${filename}.csv`)
}

/**
 * Convert an array of objects to an Excel (.xlsx) file and trigger download.
 * Falls back to CSV if xlsx is unavailable.
 */
export async function exportExcel(rows: Record<string, unknown>[], filename: string) {
  try {
    const XLSX = await import('xlsx')
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')

    // Auto-size columns
    const colWidths = Object.keys(rows[0] || {}).map(key => ({
      wch: Math.max(key.length, ...rows.map(r => String(r[key] ?? '').length).slice(0, 100)),
    }))
    ws['!cols'] = colWidths

    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    triggerDownload(blob, `${filename}.xlsx`)
  } catch {
    // Fallback to CSV if xlsx fails
    exportCSV(rows, filename)
  }
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
