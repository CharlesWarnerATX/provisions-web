'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CATEGORIES } from '@/lib/types'
import type { Location } from '@/lib/types'

type LotDetail = {
  id: string
  quantity_remaining: number
  canonical_unit: string
  size_label: string | null
  expiration_date: string | null
  location_id: string | null
  items: { id: string; name: string; brand: string | null; category: string; barcode: string | null }
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-1 ${className ?? ''}`}>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  )
}

export default function EditLot() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [lot, setLot] = useState<LotDetail | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [itemName, setItemName] = useState('')
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState('grocery')
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState('unit')
  const [sizeLabel, setSizeLabel] = useState('')
  const [expirationDate, setExpirationDate] = useState('')
  const [locationId, setLocationId] = useState('')

  useEffect(() => {
    Promise.all([
      supabase
        .from('inventory_lots')
        .select('*, items(id, name, brand, category, barcode)')
        .eq('id', id)
        .single(),
      supabase
        .from('locations')
        .select('*')
        .order('sort_order', { nullsFirst: false })
        .order('name'),
    ]).then(([lotRes, locRes]) => {
      if (lotRes.error) { setError(lotRes.error.message); setLoading(false); return }
      if (locRes.data) setLocations(locRes.data as Location[])
      const l = lotRes.data as LotDetail
      setLot(l)
      setItemName(l.items.name)
      setBrand(l.items.brand ?? '')
      setCategory(l.items.category)
      setQuantity(String(l.quantity_remaining))
      setUnit(l.canonical_unit)
      setSizeLabel(l.size_label ?? '')
      setExpirationDate(l.expiration_date ?? '')
      setLocationId(l.location_id ?? '')
      setLoading(false)
    })
  }, [id])

  async function handleSave() {
    if (!lot) return
    setSaving(true)
    setError(null)
    try {
      const itemUpdates: Record<string, unknown> = {}
      if (itemName.trim() !== lot.items.name) itemUpdates.name = itemName.trim()
      if ((brand.trim() || null) !== lot.items.brand) itemUpdates.brand = brand.trim() || null
      if (category !== lot.items.category) itemUpdates.category = category
      if (Object.keys(itemUpdates).length > 0) {
        const { error } = await supabase.from('items').update(itemUpdates).eq('id', lot.items.id)
        if (error) throw error
      }

      const { error } = await supabase
        .from('inventory_lots')
        .update({
          quantity_remaining: parseFloat(quantity) || 1,
          canonical_unit: unit.trim() || 'unit',
          size_label: sizeLabel.trim() || null,
          expiration_date: expirationDate || null,
          location_id: locationId || null,
        })
        .eq('id', id)
      if (error) throw error

      router.push('/')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
      setSaving(false)
    }
  }

  async function handleMarkUsed() {
    const { error } = await supabase.from('inventory_lots').delete().eq('id', id)
    if (error) { setError(error.message); return }
    router.push('/')
  }

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    const { error } = await supabase.from('inventory_lots').delete().eq('id', id)
    if (error) {
      setError(error.message)
      setDeleting(false)
      setConfirmingDelete(false)
      return
    }
    router.push('/')
  }

  if (loading) return (
    <div className="flex justify-center py-24">
      <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-lg mx-auto">
      <div className="sticky top-0 z-10 bg-green-700 text-white shadow-md">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="p-1 hover:bg-green-600 active:bg-green-800 rounded" aria-label="Back">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold flex-1">Edit</h1>
          <button
            onClick={() => { setConfirmingDelete(true); setError(null) }}
            className="p-2 hover:bg-red-500 active:bg-red-600 rounded transition-colors"
            aria-label="Delete"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Delete confirmation banner */}
      {confirmingDelete && (
        <div className="bg-red-600 text-white px-4 py-3 flex items-center gap-3">
          <p className="flex-1 text-sm font-medium">Delete this lot?</p>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="bg-white text-red-600 font-semibold text-sm px-4 py-1.5 rounded-lg active:opacity-80 disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
          <button
            onClick={() => setConfirmingDelete(false)}
            className="text-white/80 text-sm px-2 py-1.5 active:text-white"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="p-4 flex flex-col gap-4">
        {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Item</p>

        <Field label="Name">
          <input value={itemName} onChange={e => setItemName(e.target.value)} className="input" />
        </Field>

        <Field label="Brand">
          <input value={brand} onChange={e => setBrand(e.target.value)} placeholder="Optional" className="input" />
        </Field>

        <Field label="Category">
          <select value={category} onChange={e => setCategory(e.target.value)} className="input">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>

        <div className="border-t border-gray-200 pt-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">This Lot</p>
        </div>

        <div className="flex gap-3">
          <Field label="Quantity" className="flex-1">
            <input
              type="number"
              min="0"
              step="0.1"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              className="input"
              inputMode="decimal"
            />
          </Field>
          <Field label="Unit" className="flex-1">
            <input value={unit} onChange={e => setUnit(e.target.value)} className="input" />
          </Field>
        </div>

        <Field label="Size Label">
          <input value={sizeLabel} onChange={e => setSizeLabel(e.target.value)} placeholder="e.g. 12 oz, 1 gal" className="input" />
        </Field>

        <Field label="Expiration Date">
          <input type="date" value={expirationDate} onChange={e => setExpirationDate(e.target.value)} className="input" />
        </Field>

        <Field label="Location">
          <select value={locationId} onChange={e => setLocationId(e.target.value)} className="input">
            <option value="">No location</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </Field>

        <button onClick={handleSave} disabled={saving} className="btn-primary py-3 text-base mt-2">
          {saving ? 'Saving…' : 'Save Changes'}
        </button>

        <button onClick={handleMarkUsed} className="btn-ghost py-3 text-sm">
          Mark as Used Up
        </button>
      </div>

      <style jsx>{`
        .input { @apply w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500; }
        .btn-primary { @apply bg-green-700 text-white rounded-lg font-medium hover:bg-green-600 active:bg-green-800 disabled:opacity-50 transition-colors; }
        .btn-ghost { @apply bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 active:bg-gray-300 transition-colors; }
      `}</style>
    </div>
  )
}
