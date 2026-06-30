'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Location, LotRow } from '@/lib/types'

function expiryStyle(date: string | null): string {
  if (!date) return 'bg-white'
  const days = Math.floor((new Date(date).getTime() - Date.now()) / 86400000)
  if (days < 0) return 'bg-red-100 border-l-4 border-red-400'
  if (days <= 7) return 'bg-orange-100 border-l-4 border-orange-400'
  if (days <= 30) return 'bg-yellow-50 border-l-4 border-yellow-300'
  return 'bg-white'
}

function expiryLabel(date: string | null): string {
  if (!date) return ''
  const days = Math.floor((new Date(date).getTime() - Date.now()) / 86400000)
  if (days < 0) return `Expired ${Math.abs(days)}d ago`
  if (days === 0) return 'Expires today'
  if (days === 1) return 'Expires tomorrow'
  return `Exp ${date}`
}

function expiryColor(date: string | null): string {
  if (!date) return 'text-gray-500'
  const days = Math.floor((new Date(date).getTime() - Date.now()) / 86400000)
  if (days < 0) return 'text-red-600 font-medium'
  if (days <= 7) return 'text-orange-600 font-medium'
  return 'text-gray-500'
}

export default function Home() {
  const router = useRouter()
  const [lots, setLots] = useState<LotRow[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [filterLocId, setFilterLocId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [locRes, lotRes] = await Promise.all([
        supabase
          .from('locations')
          .select('*')
          .order('sort_order', { nullsFirst: false })
          .order('name'),
        supabase
          .from('inventory_lots')
          .select(
            'id, quantity_remaining, canonical_unit, size_label, expiration_date, location_id, items(name, brand, category), locations(name)'
          )
          .gt('quantity_remaining', 0)
          .order('expiration_date', { nullsFirst: false }),
      ])
      if (locRes.error) throw locRes.error
      if (lotRes.error) throw lotRes.error
      setLocations(locRes.data as Location[])
      setLots(lotRes.data as unknown as LotRow[])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const visible = filterLocId ? lots.filter(l => l.location_id === filterLocId) : lots

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-green-700 text-white shadow-md">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-semibold">Provisions</h1>
          <div className="flex items-center gap-1">
            <Link href="/recipes" className="p-1 rounded hover:bg-green-600 active:bg-green-800" aria-label="Recipes">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </Link>
            <Link href="/expiring" className="relative p-1 rounded hover:bg-green-600 active:bg-green-800" aria-label="Expiring soon">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {lots.some(l => {
                if (!l.expiration_date) return false
                return Math.floor((new Date(l.expiration_date).getTime() - Date.now()) / 86400000) <= 7
              }) && (
                <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-green-700" />
              )}
            </Link>
            <Link href="/locations" className="p-1 rounded hover:bg-green-600 active:bg-green-800" aria-label="Manage locations">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
          </div>
        </div>
        {locations.length > 0 && (
          <div className="flex gap-2 overflow-x-auto px-4 pb-3" style={{ scrollbarWidth: 'none' }}>
            <button
              onClick={() => setFilterLocId(null)}
              className={`shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors ${filterLocId === null ? 'bg-white text-green-700' : 'bg-green-600 text-white'}`}
            >
              All
            </button>
            {locations.map(loc => (
              <button
                key={loc.id}
                onClick={() => setFilterLocId(filterLocId === loc.id ? null : loc.id)}
                className={`shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors ${filterLocId === loc.id ? 'bg-white text-green-700' : 'bg-green-600 text-white'}`}
              >
                {loc.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="pb-24 px-3 pt-3">
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
          </div>
        )}
        {error && <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
        {!loading && !error && visible.length === 0 && (
          <p className="text-center text-gray-500 py-16 text-sm">
            {filterLocId ? 'No items at this location.' : 'No inventory yet. Tap + to add an item.'}
          </p>
        )}
        <div className="flex flex-col gap-2">
          {!loading && visible.map(lot => {
            const qty = lot.quantity_remaining % 1 === 0
              ? lot.quantity_remaining.toString()
              : lot.quantity_remaining.toFixed(1)
            const subtitle = [lot.items.brand, lot.items.category, lot.size_label].filter(Boolean).join(' · ')
            return (
              <button
                key={lot.id}
                onClick={() => router.push(`/edit/${lot.id}`)}
                className={`w-full text-left rounded-lg p-3 shadow-sm active:opacity-70 transition-opacity ${expiryStyle(lot.expiration_date)}`}
              >
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900">{lot.items.name}</p>
                    {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
                    <p className={`text-xs mt-1 ${expiryColor(lot.expiration_date)}`}>
                      {qty} {lot.canonical_unit}
                      {lot.expiration_date && <span> · {expiryLabel(lot.expiration_date)}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {lot.locations && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full whitespace-nowrap">
                        {lot.locations.name}
                      </span>
                    )}
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <Link
        href="/scan"
        className="fixed bottom-6 right-24 w-12 h-12 bg-white text-green-700 border-2 border-green-700 rounded-full shadow-lg flex items-center justify-center hover:bg-green-50 active:scale-95 transition-all"
        aria-label="Scan barcode"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
      </Link>
      <Link
        href="/add"
        className="fixed bottom-6 right-6 w-14 h-14 bg-green-700 text-white rounded-full shadow-lg flex items-center justify-center text-3xl leading-none hover:bg-green-600 active:scale-95 transition-all"
        aria-label="Add item"
      >
        +
      </Link>
    </div>
  )
}
