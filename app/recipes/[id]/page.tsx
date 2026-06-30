'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Recipe = { id: string; name: string; description: string | null; servings: number | null }
type Ingredient = {
  recipe_id: string
  item_id: string
  quantity: number
  unit: string
  preparation: string | null
  items: { name: string; brand: string | null }
}
type Item = { id: string; name: string; brand: string | null }

export default function RecipeDetail() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [allItems, setAllItems] = useState<Item[]>([])
  const [inStockIds, setInStockIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit recipe state
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editServings, setEditServings] = useState('')
  const [savingRecipe, setSavingRecipe] = useState(false)

  // Delete recipe state
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Add ingredient state
  const [addingIng, setAddingIng] = useState(false)
  const [ingItemId, setIngItemId] = useState('')
  const [ingQty, setIngQty] = useState('1')
  const [ingUnit, setIngUnit] = useState('cup')
  const [ingPrep, setIngPrep] = useState('')
  const [savingIng, setSavingIng] = useState(false)
  const [itemSearch, setItemSearch] = useState('')

  // Delete ingredient state
  const [deletingIng, setDeletingIng] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [recipeRes, ingRes, itemsRes, stockRes] = await Promise.all([
      supabase.from('recipes').select('*').eq('id', id).single(),
      supabase.from('recipe_ingredients').select('*, items(name, brand)').eq('recipe_id', id),
      supabase.from('items').select('id, name, brand').order('name'),
      supabase.from('inventory_lots').select('item_id').gt('quantity_remaining', 0),
    ])
    if (recipeRes.error) { setError(recipeRes.error.message); setLoading(false); return }
    setRecipe(recipeRes.data as Recipe)
    setEditName(recipeRes.data.name)
    setEditDesc(recipeRes.data.description ?? '')
    setEditServings(String(recipeRes.data.servings ?? 4))
    setIngredients((ingRes.data ?? []) as unknown as Ingredient[])
    setAllItems((itemsRes.data ?? []) as Item[])
    setInStockIds(new Set((stockRes.data ?? []).map((r: { item_id: string }) => r.item_id)))
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function saveRecipe() {
    if (!editName.trim() || !recipe) return
    setSavingRecipe(true)
    const { error } = await supabase.from('recipes').update({
      name: editName.trim(),
      description: editDesc.trim() || null,
      servings: parseInt(editServings) || null,
    }).eq('id', id)
    if (error) { setError(error.message); setSavingRecipe(false); return }
    setRecipe(r => r ? { ...r, name: editName.trim(), description: editDesc.trim() || null, servings: parseInt(editServings) || null } : r)
    setEditing(false)
    setSavingRecipe(false)
  }

  async function deleteRecipe() {
    await supabase.from('recipe_ingredients').delete().eq('recipe_id', id)
    const { error } = await supabase.from('recipes').delete().eq('id', id)
    if (error) { setError(error.message); return }
    router.push('/recipes')
  }

  async function addIngredient() {
    if (!ingItemId || !ingQty) return
    setSavingIng(true)
    const { error } = await supabase.from('recipe_ingredients').insert({
      recipe_id: id,
      item_id: ingItemId,
      quantity: parseFloat(ingQty),
      unit: ingUnit.trim(),
      ...(ingPrep.trim() && { preparation: ingPrep.trim() }),
    })
    if (error) { setError(error.message); setSavingIng(false); return }
    setAddingIng(false)
    setIngItemId('')
    setIngQty('1')
    setIngUnit('cup')
    setIngPrep('')
    setItemSearch('')
    setSavingIng(false)
    load()
  }

  async function deleteIngredient(itemId: string) {
    setDeletingIng(itemId)
    await supabase.from('recipe_ingredients').delete().eq('recipe_id', id).eq('item_id', itemId)
    setDeletingIng(null)
    load()
  }

  const filteredItems = allItems.filter(item =>
    item.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
    (item.brand ?? '').toLowerCase().includes(itemSearch.toLowerCase())
  )

  const inStockCount = ingredients.filter(ing => inStockIds.has(ing.item_id)).length

  if (loading) return (
    <div className="flex justify-center py-24">
      <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-green-700 text-white shadow-md">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.push('/recipes')} className="p-1 hover:bg-green-600 active:bg-green-800 rounded" aria-label="Back">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold flex-1 truncate">{recipe?.name}</h1>
          <button onClick={() => { setEditing(e => !e); setConfirmDelete(false) }} className="p-1 hover:bg-green-600 active:bg-green-800 rounded" aria-label="Edit">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button onClick={() => { setConfirmDelete(d => !d); setEditing(false) }} className="p-1 hover:bg-red-500 active:bg-red-600 rounded transition-colors" aria-label="Delete">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Delete banner */}
      {confirmDelete && (
        <div className="bg-red-600 text-white px-4 py-3 flex items-center gap-3">
          <p className="flex-1 text-sm font-medium">Delete this recipe and all its ingredients?</p>
          <button onClick={deleteRecipe} className="bg-white text-red-600 font-semibold text-sm px-4 py-1.5 rounded-lg active:opacity-80">Delete</button>
          <button onClick={() => setConfirmDelete(false)} className="text-white/80 text-sm px-2 py-1.5">Cancel</button>
        </div>
      )}

      <div className="p-4 flex flex-col gap-4 pb-10">
        {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        {/* Edit recipe form */}
        {editing ? (
          <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col gap-3">
            <input value={editName} onChange={e => setEditName(e.target.value)} className="input font-medium" />
            <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Description" rows={2} className="input resize-none text-sm" />
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 shrink-0">Servings:</label>
              <input type="number" min="1" value={editServings} onChange={e => setEditServings(e.target.value)} className="input w-20" inputMode="numeric" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={saveRecipe} disabled={savingRecipe} className="flex-1 btn-primary py-2 text-sm">{savingRecipe ? 'Saving…' : 'Save'}</button>
              <button onClick={() => setEditing(false)} className="flex-1 btn-ghost py-2 text-sm">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-4">
            {recipe?.description && <p className="text-sm text-gray-600 mb-2">{recipe.description}</p>}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              {recipe?.servings && (
                <span className="flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {recipe.servings} servings
                </span>
              )}
              {ingredients.length > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  {inStockCount}/{ingredients.length} in stock
                </span>
              )}
            </div>
          </div>
        )}

        {/* Ingredients */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ingredients</p>
            {!addingIng && (
              <button onClick={() => setAddingIng(true)} className="text-xs text-green-700 font-semibold flex items-center gap-1 active:opacity-60">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Add
              </button>
            )}
          </div>

          {ingredients.length === 0 && !addingIng && (
            <p className="text-sm text-gray-400 py-4 text-center">No ingredients yet — tap Add to start</p>
          )}

          <div className="flex flex-col gap-1">
            {ingredients.map(ing => {
              const inStock = inStockIds.has(ing.item_id)
              const label = [ing.quantity % 1 === 0 ? ing.quantity : ing.quantity.toFixed(2), ing.unit, ing.items.name, ing.preparation ? `(${ing.preparation})` : null].filter(Boolean).join(' ')
              return (
                <div key={ing.item_id} className="bg-white rounded-lg px-3 py-2.5 flex items-center gap-3 shadow-sm">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${inStock ? 'bg-green-500' : 'bg-gray-300'}`} title={inStock ? 'In stock' : 'Not in stock'} />
                  <p className={`flex-1 text-sm ${inStock ? 'text-gray-900' : 'text-gray-400'}`}>{label}</p>
                  <button
                    onClick={() => deleteIngredient(ing.item_id)}
                    disabled={deletingIng === ing.item_id}
                    className="p-1 text-gray-300 hover:text-red-400 active:text-red-600 transition-colors disabled:opacity-30"
                    aria-label="Remove ingredient"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>

          {/* Add ingredient form */}
          {addingIng && (
            <div className="mt-2 bg-white rounded-xl shadow-sm p-4 flex flex-col gap-3">
              <p className="text-sm font-medium text-gray-700">Add Ingredient</p>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Search items</label>
                <input
                  autoFocus
                  value={itemSearch}
                  onChange={e => { setItemSearch(e.target.value); setIngItemId('') }}
                  placeholder="Type to search…"
                  className="input"
                />
                {itemSearch && !ingItemId && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                    {filteredItems.length === 0 && (
                      <p className="text-sm text-gray-400 px-3 py-2">No items found</p>
                    )}
                    {filteredItems.slice(0, 8).map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => { setIngItemId(item.id); setItemSearch(item.name) }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 active:bg-green-100 border-b border-gray-100 last:border-0"
                      >
                        <span className="font-medium">{item.name}</span>
                        {item.brand && <span className="text-gray-400 ml-1">{item.brand}</span>}
                      </button>
                    ))}
                  </div>
                )}
                {ingItemId && (
                  <p className="text-xs text-green-700 font-medium">✓ {itemSearch}</p>
                )}
              </div>

              <div className="flex gap-2">
                <div className="flex flex-col gap-1 w-20">
                  <label className="text-xs text-gray-500">Qty</label>
                  <input type="number" min="0" step="0.25" value={ingQty} onChange={e => setIngQty(e.target.value)} className="input" inputMode="decimal" />
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-xs text-gray-500">Unit</label>
                  <input value={ingUnit} onChange={e => setIngUnit(e.target.value)} placeholder="cup, oz, tbsp…" className="input" />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Preparation (optional)</label>
                <input value={ingPrep} onChange={e => setIngPrep(e.target.value)} placeholder="diced, minced, cooked…" className="input" />
              </div>

              <div className="flex gap-2">
                <button onClick={addIngredient} disabled={!ingItemId || savingIng} className="flex-1 btn-primary py-2 text-sm">
                  {savingIng ? 'Adding…' : 'Add'}
                </button>
                <button onClick={() => { setAddingIng(false); setItemSearch(''); setIngItemId('') }} className="flex-1 btn-ghost py-2 text-sm">Cancel</button>
              </div>
            </div>
          )}
        </div>

        {/* In-stock legend */}
        {ingredients.length > 0 && (
          <div className="flex items-center gap-4 text-xs text-gray-400 px-1">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" /> In your inventory</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-300" /> Not in stock</span>
          </div>
        )}
      </div>

      <style jsx>{`
        .input { @apply w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500; }
        .btn-primary { @apply bg-green-700 text-white rounded-lg font-medium hover:bg-green-600 active:bg-green-800 disabled:opacity-50 transition-colors; }
        .btn-ghost { @apply bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 active:bg-gray-300 transition-colors; }
      `}</style>
    </div>
  )
}
