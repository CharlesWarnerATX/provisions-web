'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type ExpiringLot = {
  id: string
  expiration_date: string
  quantity_remaining: number
  canonical_unit: string
  size_label: string | null
  location_id: string | null
  items: { name: string; brand: string | null }
  locations: { name: string } | null
}

type Bucket = 'expired' | 'this_week' | 'next_week' | 'within_30'

function getBucket(date: string): Bucket | null {
  const days = Math.floor((new Date(date).getTime() - Date.now()) / 86400000)
  if (days < 0) return 'expired'
  if (days <= 7) return 'this_week'
  if (days <= 14) return 'next_week'
  if (days <= 30) return 'within_30'
  return null
}

function daysLabel(date: string): string {
  const days = Math.floor((new Date(date).getTime() - Date.now()) / 86400000)
  if (days < 0) return `Expired ${Math.abs(days)}d ago`
  if (days === 0) return 'Expires today'
  if (days === 1) return 'Expires tomorrow'
  return `Expires in ${days}d`
}

const BUCKET_META: Record<Bucket, { label: string; bg: string; text: string; border: string; badge: string }> = {
  expired:    { label: 'Expired',         bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',   badge: 'bg-red-600' },
  this_week:  { label: 'This Week',       bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200',badge: 'bg-orange-500' },
  next_week:  { label: 'Next Two Weeks',  bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200',badge: 'bg-yellow-500' },
  within_30:  { label: 'Within 30 Days', bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',  badge: 'bg-blue-400' },
}

const BUCKET_ORDER: Bucket[] = ['expired', 'this_week', 'next_week', 'within_30']

export default function ExpiringPage() {
  const router = useRouter()
  const [lots, setLots] = useState<ExpiringLot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('inventory_lots')
      .select('id, expiration_date, quantity_remaining, canonical_unit, size_label, location_id, items(name, brand), locations(name)')
      .gt('quantity_remaining', 0)
      .not('expiration_date', 'is', null)
      .lte('expiration_date', new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10))
      .order('expiration_date')
    if (error) { setError(error.message); setLoading(false); return }
    setLots((data ?? []) as unknown as ExpiringLot[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const grouped = BUCKET_ORDER.reduce<Record<Bucket, ExpiringLot[]>>((acc, b) => {
    acc[b] = lots.filter(l => getBucket(l.expiration_date) === b)
    return acc
  }, { expired: [], this_week: [], next_week: [], within_30: [] })

  const counts = BUCKET_ORDER.map(b => grouped[b].length)
  const total = counts.reduce((a, b) => a + b, 0)

  return (
    <div className="max-w-lg mx-auto">
      <div className="sticky top-0 z-10 bg-green-700 text-white shadow-md">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="p-1 hover:bg-green-600 active:bg-green-800 rounded" aria-label="Back">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold flex-1">Expiring Soon</h1>
          {!loading && total === 0 && (
            <span className="text-green-200 text-sm">All clear</span>
          )}
        </div>

        {/* Summary chips */}
        {!loading && total > 0 && (
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {BUCKET_ORDER.map(b => {
              const count = grouped[b].length
              if (count === 0) return null
              const meta = BUCKET_META[b]
              return (
                <a key={b} href={`#${b}`} className={`shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-white/15 hover:bg-white/25 transition-colors`}>
                  <span className={`w-2 h-2 rounded-full ${meta.badge}`} />
                  {count} {meta.label}
                </a>
              )
            })}
          </div>
        )}
      </div>

      <div className="pb-8">
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
          </div>
        )}

        {error && <div className="m-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        {!loading && total === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-14 h-14 text-green-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-500 text-base font-medium">Nothing expiring in the next 30 days</p>
            <p className="text-gray-400 text-sm mt-1">Items without an expiry date are not shown here</p>
          </div>
        )}

        {!loading && BUCKET_ORDER.map(bucket => {
          const items = grouped[bucket]
          if (items.length === 0) return null
          const meta = BUCKET_META[bucket]
          return (
            <div key={bucket} id={bucket} className="mt-4">
              <div className={`flex items-center gap-2 px-4 py-2 ${meta.bg} border-y ${meta.border}`}>
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${meta.badge}`} />
                <span className={`text-xs font-bold uppercase tracking-wider ${meta.text}`}>{meta.label}</span>
                <span className={`text-xs ${meta.text} opacity-70`}>· {items.length} item{items.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex flex-col gap-0 divide-y divide-gray-100">
                {items.map(lot => {
                  const qty = lot.quantity_remaining % 1 === 0
                    ? lot.quantity_remaining.toString()
                    : lot.quantity_remaining.toFixed(1)
                  return (
                    <button
                      key={lot.id}
                      onClick={() => router.push(`/edit/${lot.id}`)}
                      className="w-full text-left px-4 py-3 bg-white flex items-center gap-3 active:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm">{lot.items.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {[lot.items.brand, lot.size_label, `${qty} ${lot.canonical_unit}`].filter(Boolean).join(' · ')}
                        </p>
                        <p className={`text-xs font-medium mt-0.5 ${meta.text}`}>{daysLabel(lot.expiration_date)}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {lot.locations && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                            {lot.locations.name}
                          </span>
                        )}
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
