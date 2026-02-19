/**
 * Item Formatting Utilities
 *
 * Ensures manufacturer name is always displayed with item name
 * Critical for distinguishing items with same names from different manufacturers
 */

export interface ItemWithManufacturer {
  name: string
  manufacturer?: {
    name: string
  } | null
  manufacturerId?: string
}

/**
 * Format item name with manufacturer
 * Returns: "Item Name (Manufacturer Name)"
 */
export function formatItemWithManufacturer(item: ItemWithManufacturer): string {
  const manufacturerName = item.manufacturer?.name || 'Unknown'
  return `${item.name} (${manufacturerName})`
}

/**
 * Format item for display in dropdowns and tables
 */
export function formatItemForDisplay(item: { name?: string; manufacturer?: { name?: string } | null; manufacturerName?: string } | null | undefined): string {
  if (!item) return ''

  const itemName = item.name || 'Unnamed Item'
  const manufacturerName = item.manufacturer?.name || item.manufacturerName || 'Unknown'

  return `${itemName} (${manufacturerName})`
}

/**
 * Parse formatted item string back to components
 * "Sugar 1kg (Dangote)" -> { name: "Sugar 1kg", manufacturer: "Dangote" }
 */
export function parseFormattedItem(formattedString: string): { name: string; manufacturer: string } {
  const match = formattedString.match(/^(.+?)\s*\((.+?)\)$/)

  if (match) {
    return {
      name: match[1].trim(),
      manufacturer: match[2].trim(),
    }
  }

  return {
    name: formattedString,
    manufacturer: 'Unknown',
  }
}

/**
 * Group items by manufacturer for filtered display
 */
export function groupItemsByManufacturer(items: ItemWithManufacturer[]): Record<string, ItemWithManufacturer[]> {
  return items.reduce((acc: Record<string, ItemWithManufacturer[]>, item) => {
    const manufacturerName = item.manufacturer?.name || 'Unknown'
    if (!acc[manufacturerName]) {
      acc[manufacturerName] = []
    }
    acc[manufacturerName].push(item)
    return acc
  }, {} as Record<string, ItemWithManufacturer[]>)
}
