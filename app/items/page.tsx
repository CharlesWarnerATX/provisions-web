'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type ItemRow = {
  id: string
  name: string
  brand: string | null
  category: string
  inStock: boolean
  recipeCount: number
}

export default function ItemsPage() {
  const router = useRouter()
  const [items, setItems] = useState<ItemRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [itemsRes, stockRes, recipeRes] = await Promise.all([
      supabase.from('items').select('id, name, brand, category').order('name'),
      supabase.from('inventory_lots').select('item_id').gt('quantity_remaining', 0),
      supabase.from('recipe_ingredients').select('item_id'),
    ])
    if (itemsRes.error) { setError(itemsRes.error.message); setLoading(false); return }

    const inStockSet = new Set((stockRes.data ?? []).map((r: { item_id: string }) => r.item_id))
    const recipeCountMap = new Map<string, number>()
    for (const r of (recipeRes.data ?? []) as { item_id: string }[]) {
      recipeCountMap.set(r.item_id, (recipeCountMap.get(r.item_id) ?? 0) + 1)
    }

    setItems(
      ((itemsRes.data ?? []) as Omit<ItemRow, 'inStock' | 'recipeCount'>[]).map(item => ({
        ...item,
        inStock: inStockSet.has(item.id),
        recipeCount: recipeCountMap.get(item.id) ?? 0,
      }))
    )
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = search
    ? items.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.brand ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : items

  return (
    <div className="max-w-lg mx-auto">
      <div className="sticky top-0 z-10 bg-green-700 text-white shadow-md">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.push('/')} className="p-1 hover:bg-green-600 active:bg-green-800 rounded" aria-label="Back">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold flex-1">Items</h1>
          {!loading && <span className="text-sm text-green-200">{items.length}</span>}
        </div>
        <div className="px-4 pb-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search items…"
            className="w-full px-3 py-2 rounded-lg text-sm text-gray-900 bg-white/90 placeholder-gray-400 focus:outline-none focus:bg-white"
          />
        </div>
      </div>

      <div className="p-3 pb-24">
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
          </div>
        )}
        {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
        {!loading && filtered.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-16">
            {search ? 'No items match your search.' : 'No items yet.'}
          </p>
        )}
        <div className="flex flex-col gap-1">
          {filtered.map(item => (
            <button
              key={item.id}
              onClick={() => router.push(`/items/${item.id}`)}
              className="w-full text-left bg-white rounded-lg shadow-sm px-4 py-3 flex items-center gap-3 active:opacity-70 transition-opacity"
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${item.inStock ? 'bg-green-500' : 'bg-gray-300'}`} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {item.name}
                  {item.brand && <span className="font-normal text-gray-400 text-sm ml-1.5">{item.brand}</span>}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {item.category}
                  {item.recipeCount > 0 && ` · ${item.recipeCount} recipe${item.recipeCount !== 1 ? 's' : ''}`}
                  {!item.inStock && ' · not in stock'}
                </p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
