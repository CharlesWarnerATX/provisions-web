'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CATEGORIES } from '@/lib/types'

type Item = { id: string; name: string; brand: string | null; category: string }
type RecipeRef = { recipe_id: string; recipes: { name: string } }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  )
}

export default function ItemDetail() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [item, setItem] = useState<Item | null>(null)
  const [activeLotCount, setActiveLotCount] = useState(0)
  const [recipeRefs, setRecipeRefs] = useState<RecipeRef[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState('grocery')

  useEffect(() => {
    Promise.all([
      supabase.from('items').select('id, name, brand, category').eq('id', id).single(),
      supabase.from('inventory_lots').select('id', { count: 'exact', head: true }).eq('item_id', id).gt('quantity_remaining', 0),
      supabase.from('recipe_ingredients').select('recipe_id, recipes(name)').eq('item_id', id),
    ]).then(([itemRes, lotsRes, recipesRes]) => {
      if (itemRes.error) { setError(itemRes.error.message); setLoading(false); return }
      const i = itemRes.data as Item
      setItem(i)
      setName(i.name)
      setBrand(i.brand ?? '')
      setCategory(i.category)
      setActiveLotCount(lotsRes.count ?? 0)
      setRecipeRefs((recipesRes.data ?? []) as unknown as RecipeRef[])
      setLoading(false)
    })
  }, [id])

  async function handleSave() {
    if (!item || !name.trim()) return
    setSaving(true)
    const updates: Record<string, unknown> = {}
    if (name.trim() !== item.name) updates.name = name.trim()
    if ((brand.trim() || null) !== item.brand) updates.brand = brand.trim() || null
    if (category !== item.category) updates.category = category
    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from('items').update(updates).eq('id', id)
      if (error) { setError(error.message); setSaving(false); return }
    }
    router.push('/items')
  }

  async function handleDelete() {
    setDeleting(true)
    await supabase.from('recipe_ingredients').delete().eq('item_id', id)
    await supabase.from('inventory_lots').delete().eq('item_id', id)
    const { error } = await supabase.from('items').delete().eq('id', id)
    if (error) { setError(error.message); setDeleting(false); setConfirmDelete(false); return }
    router.push('/items')
  }

  if (loading) return (
    <div className="flex justify-center py-24">
      <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
    </div>
  )

  const hasWarning = activeLotCount > 0 || recipeRefs.length > 0

  return (
    <div className="max-w-lg mx-auto">
      <div className="sticky top-0 z-10 bg-green-700 text-white shadow-md">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="p-1 hover:bg-green-600 active:bg-green-800 rounded" aria-label="Back">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold flex-1 truncate">{item?.name}</h1>
          <button
            onClick={() => setConfirmDelete(d => !d)}
            className="p-1 hover:bg-red-500 active:bg-red-600 rounded transition-colors"
            aria-label="Delete item"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {confirmDelete && (
        <div className="bg-red-600 text-white px-4 py-3 flex flex-col gap-2">
          <p className="text-sm font-medium">
            Delete &ldquo;{item?.name}&rdquo;?
            {hasWarning && (
              <span className="block font-normal text-red-100 mt-0.5">
                This will also remove{' '}
                {[
                  activeLotCount > 0 && `${activeLotCount} inventory lot${activeLotCount !== 1 ? 's' : ''}`,
                  recipeRefs.length > 0 && `this ingredient from ${recipeRefs.length} recipe${recipeRefs.length !== 1 ? 's' : ''}`,
                ].filter(Boolean).join(' and ')}.
              </span>
            )}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-white text-red-600 font-semibold text-sm px-4 py-1.5 rounded-lg active:opacity-80 disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
            <button onClick={() => setConfirmDelete(false)} className="text-white/80 text-sm px-2 py-1.5">Cancel</button>
          </div>
        </div>
      )}

      <div className="p-4 flex flex-col gap-4">
        {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        <div className="flex gap-2 flex-wrap">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
            activeLotCount > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
          }`}>
            {activeLotCount > 0 ? `${activeLotCount} lot${activeLotCount !== 1 ? 's' : ''} in stock` : 'Not in inventory'}
          </span>
          {recipeRefs.length > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-blue-50 text-blue-700">
              {recipeRefs.length} recipe{recipeRefs.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {recipeRefs.length > 0 && (
          <div className="flex flex-col gap-0.5 -mt-2">
            {recipeRefs.map(ref => (
              <p key={ref.recipe_id} className="text-xs text-gray-400 pl-1">· {ref.recipes.name}</p>
            ))}
          </div>
        )}

        <div className="border-t border-gray-100 pt-2 flex flex-col gap-4">
          <Field label="Name">
            <input value={name} onChange={e => setName(e.target.value)} className="input" />
          </Field>
          <Field label="Brand">
            <input value={brand} onChange={e => setBrand(e.target.value)} placeholder="Optional" className="input" />
          </Field>
          <Field label="Category">
            <select value={category} onChange={e => setCategory(e.target.value)} className="input">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>

        <button onClick={handleSave} disabled={saving || !name.trim()} className="btn-primary py-3 text-base mt-2">
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      <style jsx>{`
        .input { @apply w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500; }
        .btn-primary { @apply bg-green-700 text-white rounded-lg font-medium hover:bg-green-600 active:bg-green-800 disabled:opacity-50 transition-colors; }
      `}</style>
    </div>
  )
}
