'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Recipe = {
  id: string
  name: string
  description: string | null
  servings: number | null
  ingredient_count?: number
}

export default function RecipesPage() {
  const router = useRouter()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('recipes')
      .select('id, name, description, servings, recipe_ingredients(count)')
      .order('name')
    if (error) { setError(error.message); setLoading(false); return }
    setRecipes(
      (data ?? []).map((r: Record<string, unknown>) => ({
        ...(r as Recipe),
        ingredient_count: (r.recipe_ingredients as { count: number }[])?.[0]?.count ?? 0,
      }))
    )
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="max-w-lg mx-auto">
      <div className="sticky top-0 z-10 bg-green-700 text-white shadow-md">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.push('/')} className="p-1 hover:bg-green-600 active:bg-green-800 rounded" aria-label="Back">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold flex-1">Recipes</h1>
          <Link href="/recipes/add" className="p-1 hover:bg-green-600 active:bg-green-800 rounded" aria-label="Add recipe">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </Link>
        </div>
      </div>

      <div className="p-3 pb-24">
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
          </div>
        )}
        {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
        {!loading && recipes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-14 h-14 text-green-200 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <p className="text-gray-500 font-medium">No recipes yet</p>
            <p className="text-gray-400 text-sm mt-1">Tap + to add your first recipe</p>
          </div>
        )}
        <div className="flex flex-col gap-2">
          {recipes.map(recipe => (
            <button
              key={recipe.id}
              onClick={() => router.push(`/recipes/${recipe.id}`)}
              className="w-full text-left bg-white rounded-lg shadow-sm p-4 flex items-center gap-3 active:opacity-70 transition-opacity"
            >
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{recipe.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {[
                    recipe.servings ? `${recipe.servings} servings` : null,
                    recipe.ingredient_count ? `${recipe.ingredient_count} ingredient${recipe.ingredient_count !== 1 ? 's' : ''}` : 'No ingredients yet',
                  ].filter(Boolean).join(' · ')}
                </p>
                {recipe.description && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{recipe.description}</p>
                )}
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
