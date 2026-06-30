'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CATEGORIES } from '@/lib/types'
import type { Location } from '@/lib/types'

function AddItemForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const paramItemId = searchParams.get('item_id')
  const paramItemName = searchParams.get('item_name')
  const paramBarcode = searchParams.get('barcode') ?? ''
  const paramName = searchParams.get('name') ?? ''
  const paramBrand = searchParams.get('brand') ?? ''
  const paramSize = searchParams.get('size') ?? ''
  const paramCategory = searchParams.get('category') ?? 'grocery'
  const lotOnly = !!paramItemId
  const fromScan = !!paramBarcode && !!(paramName || paramBrand || paramSize)

  const [locations, setLocations] = useState<Location[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(paramName)
  const [brand, setBrand] = useState(paramBrand)
  const [category, setCategory] = useState(paramCategory)
  const [barcode, setBarcode] = useState(paramBarcode)
  const [locationId, setLocationId] = useState('')
  const [sizeLabel, setSizeLabel] = useState(paramSize)
  const [expirationDate, setExpirationDate] = useState('')
  const [newLocName, setNewLocName] = useState('')
  const [addingLoc, setAddingLoc] = useState(false)

  useEffect(() => {
    supabase
      .from('locations')
      .select('*')
      .order('sort_order', { nullsFirst: false })
      .order('name')
      .then(({ data }) => { if (data) setLocations(data as Location[]) })
  }, [])

  async function addLocation() {
    if (!newLocName.trim()) return
    const { data, error } = await supabase
      .from('locations')
      .insert({ name: newLocName.trim() })
      .select()
      .single()
    if (error) { setError(error.message); return }
    const loc = data as Location
    setLocations(prev => [...prev, loc])
    setLocationId(loc.id)
    setNewLocName('')
    setAddingLoc(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!lotOnly && !name.trim()) return
    setSaving(true)
    setError(null)
    try {
      let finalItemId = paramItemId

      if (!lotOnly) {
        const { data: itemRow, error: itemErr } = await supabase
          .from('items')
          .insert({
            name: name.trim(),
            ...(brand.trim() && { brand: brand.trim() }),
            category,
            ...(barcode.trim() && { barcode: barcode.trim() }),
          })
          .select()
          .single()
        if (itemErr) throw itemErr
        finalItemId = itemRow.id
      }

      const lotData: Record<string, unknown> = {
        item_id: finalItemId,
        quantity_remaining: 1,
        canonical_unit: 'unit',
        ...(sizeLabel.trim() && { size_label: sizeLabel.trim() }),
        ...(expirationDate && { expiration_date: expirationDate }),
        ...(locationId && { location_id: locationId }),
      }
      const { error: lotErr } = await supabase.from('inventory_lots').insert(lotData)
      if (lotErr) throw lotErr

      router.push('/')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
      setSaving(false)
    }
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
          <h1 className="text-lg font-semibold">
            {lotOnly ? `Add Stock — ${paramItemName}` : 'Add Item'}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
        {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        {fromScan && !lotOnly && (
          <div className="p-3 bg-blue-50 rounded-lg flex items-center gap-2 text-sm text-blue-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Pre-filled from barcode lookup — review and edit before saving.
          </div>
        )}

        {lotOnly && (
          <div className="p-3 bg-green-50 rounded-lg flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm text-green-800 font-medium">{paramItemName}</p>
          </div>
        )}

        {!lotOnly && (
          <>
            <Field label="Name *">
              <input
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Chicken Broth"
                className="input"
              />
            </Field>

            <Field label="Brand">
              <input value={brand} onChange={e => setBrand(e.target.value)} placeholder="Optional" className="input" />
            </Field>

            <Field label="Category">
              <select value={category} onChange={e => setCategory(e.target.value)} className="input">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>

            <Field label="Barcode">
              <input
                value={barcode}
                onChange={e => setBarcode(e.target.value)}
                placeholder="Optional — scan or type"
                inputMode="numeric"
                className="input"
              />
            </Field>
          </>
        )}

        <Field label="Location">
          <select value={locationId} onChange={e => {
            if (e.target.value === '__add__') setAddingLoc(true)
            else setLocationId(e.target.value)
          }} className="input">
            <option value="">No location</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            <option value="__add__">+ Add new location…</option>
          </select>
        </Field>

        {addingLoc && (
          <div className="flex gap-2">
            <input
              autoFocus
              value={newLocName}
              onChange={e => setNewLocName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addLocation())}
              placeholder="Location name"
              className="input flex-1"
            />
            <button type="button" onClick={addLocation} className="btn-primary px-4">Add</button>
            <button type="button" onClick={() => setAddingLoc(false)} className="btn-ghost px-3">✕</button>
          </div>
        )}

        <Field label="Size Label">
          <input value={sizeLabel} onChange={e => setSizeLabel(e.target.value)} placeholder="e.g. 12 oz, 1 lb" className="input" />
        </Field>

        <Field label="Expiration Date">
          <input type="date" value={expirationDate} onChange={e => setExpirationDate(e.target.value)} className="input" />
        </Field>

        <button type="submit" disabled={saving} className="btn-primary py-3 text-base mt-2">
          {saving ? 'Saving…' : lotOnly ? 'Add to Inventory' : 'Save Item'}
        </button>
      </form>

      <style jsx>{`
        .input { @apply w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500; }
        .btn-primary { @apply bg-green-700 text-white rounded-lg font-medium hover:bg-green-600 active:bg-green-800 disabled:opacity-50 transition-colors; }
        .btn-ghost { @apply bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors; }
      `}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  )
}

export default function AddItem() {
  return (
    <Suspense>
      <AddItemForm />
    </Suspense>
  )
}
