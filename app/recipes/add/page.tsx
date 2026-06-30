'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AddRecipe() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [servings, setServings] = useState('4')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    const { data, error } = await supabase
      .from('recipes')
      .insert({
        name: name.trim(),
        ...(description.trim() && { description: description.trim() }),
        ...(servings && { servings: parseInt(servings) }),
      })
      .select()
      .single()
    if (error) { setError(error.message); setSaving(false); return }
    router.push(`/recipes/${data.id}`)
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="sticky top-0 z-10 bg-green-700 text-white shadow-md">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="p-1 hover:bg-green-600 active:bg-green-800 rounded" aria-label="Back">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold">New Recipe</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
        {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Name *</label>
          <input
            required
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Chicken Soup"
            className="input"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Optional notes or summary"
            rows={3}
            className="input resize-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Servings</label>
          <input
            type="number"
            min="1"
            value={servings}
            onChange={e => setServings(e.target.value)}
            className="input"
            inputMode="numeric"
          />
        </div>

        <button type="submit" disabled={saving} className="btn-primary py-3 text-base mt-2">
          {saving ? 'Creating…' : 'Create Recipe'}
        </button>
      </form>

      <style jsx>{`
        .input { @apply w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500; }
        .btn-primary { @apply bg-green-700 text-white rounded-lg font-medium hover:bg-green-600 active:bg-green-800 disabled:opacity-50 transition-colors; }
      `}</style>
    </div>
  )
}
