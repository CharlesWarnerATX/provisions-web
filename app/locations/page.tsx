'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Location } from '@/lib/types'

export default function Locations() {
  const router = useRouter()
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .order('sort_order', { nullsFirst: false })
      .order('name')
    if (error) setError(error.message)
    else setLocations(data as Location[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addLocation() {
    if (!newName.trim()) return
    const { error } = await supabase.from('locations').insert({ name: newName.trim() })
    if (error) { setError(error.message); return }
    setNewName('')
    setAdding(false)
    load()
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return
    const { error } = await supabase.from('locations').update({ name: editName.trim() }).eq('id', id)
    if (error) { setError(error.message); return }
    setEditId(null)
    load()
  }

  async function deleteLocation(id: string, name: string) {
    if (!confirm(`Delete "${name}"? Lots assigned here will have no location.`)) return
    const { error } = await supabase.from('locations').delete().eq('id', id)
    if (error) { setError(error.message); return }
    load()
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="sticky top-0 z-10 bg-green-700 text-white shadow-md">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="p-1 hover:bg-green-600 rounded" aria-label="Back">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold">Locations</h1>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-7 h-7 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
          </div>
        )}

        {!loading && locations.length === 0 && !adding && (
          <p className="text-center text-gray-500 py-8 text-sm">No locations yet. Tap + to add one.</p>
        )}

        {locations.map(loc => (
          <div key={loc.id} className="bg-white rounded-lg shadow-sm p-3 flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {editId === loc.id ? (
              <div className="flex gap-2 flex-1">
                <input
                  autoFocus
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveEdit(loc.id)}
                  className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button onClick={() => saveEdit(loc.id)} className="text-sm text-green-700 font-medium">Save</button>
                <button onClick={() => setEditId(null)} className="text-sm text-gray-500">Cancel</button>
              </div>
            ) : (
              <>
                <span className="flex-1 text-sm font-medium">{loc.name}</span>
                <button
                  onClick={() => { setEditId(loc.id); setEditName(loc.name) }}
                  className="p-1 text-gray-400 hover:text-gray-700"
                  aria-label="Edit"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => deleteLocation(loc.id, loc.name)}
                  className="p-1 text-gray-400 hover:text-red-600"
                  aria-label="Delete"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </>
            )}
          </div>
        ))}

        {adding ? (
          <div className="bg-white rounded-lg shadow-sm p-3 flex gap-2">
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addLocation()}
              placeholder="Location name"
              className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button onClick={addLocation} className="text-sm bg-green-700 text-white px-3 py-1 rounded font-medium hover:bg-green-600">Add</button>
            <button onClick={() => setAdding(false)} className="text-sm text-gray-500 px-2">✕</button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 p-3 text-green-700 font-medium text-sm hover:bg-green-50 rounded-lg transition-colors"
          >
            <span className="text-xl leading-none">+</span> Add location
          </button>
        )}
      </div>
    </div>
  )
}
