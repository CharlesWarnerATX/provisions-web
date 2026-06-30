export interface Location {
  id: string
  name: string
  sort_order: number | null
}

export interface LotRow {
  id: string
  quantity_remaining: number
  canonical_unit: string
  size_label: string | null
  expiration_date: string | null
  location_id: string | null
  items: { name: string; brand: string | null; category: string }
  locations: { name: string } | null
}

export const CATEGORIES = [
  'grocery', 'dairy', 'produce', 'meat', 'seafood', 'frozen',
  'pantry', 'beverages', 'condiments', 'snacks', 'bakery', 'deli',
  'household', 'personal care', 'other',
]
