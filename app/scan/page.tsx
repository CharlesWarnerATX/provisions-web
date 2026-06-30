'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function offCategory(tags: string[]): string {
  const t = tags.join(' ')
  if (/dairy|milk|cheese|yogurt/.test(t)) return 'dairy'
  if (/beverage|drink|juice|soda|water/.test(t)) return 'beverages'
  if (/frozen/.test(t)) return 'frozen'
  if (/snack|chip|cookie|cracker/.test(t)) return 'snacks'
  if (/bakery|bread|pastry/.test(t)) return 'bakery'
  if (/meat|poultry|beef|pork|chicken/.test(t)) return 'meat'
  if (/seafood|fish/.test(t)) return 'seafood'
  if (/condiment|sauce|dressing/.test(t)) return 'condiments'
  if (/produce|vegetable|fruit/.test(t)) return 'produce'
  if (/household|cleaning/.test(t)) return 'household'
  if (/personal.care|hygiene|beauty/.test(t)) return 'personal care'
  return 'grocery'
}

type ScanPhase =
  | { phase: 'scanning' }
  | { phase: 'looking' }
  | { phase: 'found'; item: { id: string; name: string }; barcode: string }
  | { phase: 'error'; message: string }

export default function Scan() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [scanState, setScanState] = useState<ScanPhase>({ phase: 'scanning' })
  const [showManual, setShowManual] = useState(false)
  const [manualBarcode, setManualBarcode] = useState('')

  const handleBarcode = useCallback(async (barcode: string) => {
    setScanState({ phase: 'looking' })

    // Check our own DB first
    const { data } = await supabase
      .from('items')
      .select('id, name')
      .eq('barcode', barcode)
      .maybeSingle()

    if (data) {
      setScanState({ phase: 'found', item: data as { id: string; name: string }, barcode })
      return
    }

    // Look up product info from Open Food Facts
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,brands,quantity,categories_tags`
      )
      const json = await res.json()
      const params = new URLSearchParams({ barcode })
      if (json.status === 1 && json.product) {
        const p = json.product
        if (p.product_name) params.set('name', p.product_name)
        if (p.brands) params.set('brand', p.brands.split(',')[0].trim())
        if (p.quantity) params.set('size', p.quantity)
        const cat = offCategory(p.categories_tags ?? [])
        if (cat) params.set('category', cat)
      }
      router.push(`/add?${params}`)
    } catch {
      router.push(`/add?barcode=${encodeURIComponent(barcode)}`)
    }
  }, [router])

  useEffect(() => {
    if (!videoRef.current) return
    let stopped = false
    let stopCamera: (() => void) | null = null

    import('@zxing/browser').then(({ BrowserMultiFormatReader }) => {
      if (stopped || !videoRef.current) return
      const reader = new BrowserMultiFormatReader()
      reader.decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' } } },
        videoRef.current,
        (result, _err, controls) => {
          if (stopped || !result) return
          stopped = true
          stopCamera = null
          controls.stop()
          handleBarcode(result.getText())
        }
      ).then(controls => {
        if (stopped) { controls.stop(); return }
        stopCamera = () => controls.stop()
      }).catch(() => {
        if (!stopped) {
          setScanState({ phase: 'error', message: 'Camera not available.' })
          setShowManual(true)
        }
      })
    })

    return () => {
      stopped = true
      stopCamera?.()
    }
  }, [handleBarcode])

  const isScanning = scanState.phase === 'scanning' || scanState.phase === 'looking'

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 text-white z-10">
        <button onClick={() => router.back()} className="p-1 rounded active:bg-white/10" aria-label="Back">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-lg font-semibold">Scan Barcode</span>
      </div>

      {/* Camera area */}
      <div className="relative flex-1">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover ${isScanning ? '' : 'opacity-20'}`}
        />

        {isScanning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {/* Darkened corners */}
            <div className="absolute inset-0 bg-black/40" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, 10% 25%, 10% 75%, 90% 75%, 90% 25%, 10% 25%)' }} />

            {/* Target box */}
            <div className="relative w-72 h-44">
              <div className="absolute top-0 left-0 w-7 h-7 border-t-[3px] border-l-[3px] border-white rounded-tl-sm" />
              <div className="absolute top-0 right-0 w-7 h-7 border-t-[3px] border-r-[3px] border-white rounded-tr-sm" />
              <div className="absolute bottom-0 left-0 w-7 h-7 border-b-[3px] border-l-[3px] border-white rounded-bl-sm" />
              <div className="absolute bottom-0 right-0 w-7 h-7 border-b-[3px] border-r-[3px] border-white rounded-br-sm" />

              {scanState.phase === 'scanning' && (
                <div
                  className="absolute left-1 right-1 h-0.5 bg-green-400/80"
                  style={{ animation: 'scanline 1.8s ease-in-out infinite', top: '50%' }}
                />
              )}
            </div>

            <p className="text-white/80 text-sm mt-5">
              {scanState.phase === 'looking' ? 'Looking up…' : 'Aim camera at a barcode'}
            </p>
          </div>
        )}

        {scanState.phase === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-white/40 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-white/60">{scanState.message}</p>
          </div>
        )}
      </div>

      {/* Found item sheet */}
      {scanState.phase === 'found' && (
        <div className="bg-white rounded-t-2xl p-6 shadow-2xl">
          <p className="text-xs text-gray-400 font-mono mb-1">{scanState.barcode}</p>
          <h2 className="text-xl font-semibold text-gray-900">{scanState.item.name}</h2>
          <p className="text-sm text-gray-500 mt-1">Already in your items — add a new lot to inventory?</p>
          <div className="flex gap-3 mt-5">
            <button
              onClick={() => router.push(
                `/add?item_id=${scanState.phase === 'found' ? scanState.item.id : ''}&item_name=${scanState.phase === 'found' ? encodeURIComponent(scanState.item.name) : ''}`
              )}
              className="flex-1 bg-green-700 text-white py-3 rounded-xl font-medium active:bg-green-800 transition-colors"
            >
              Add to Inventory
            </button>
            <button
              onClick={() => router.back()}
              className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium active:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Manual entry */}
      {showManual && scanState.phase !== 'found' && (
        <div className="bg-white p-4 flex gap-2">
          <input
            value={manualBarcode}
            onChange={e => setManualBarcode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && manualBarcode.trim() && handleBarcode(manualBarcode.trim())}
            placeholder="Enter barcode number"
            inputMode="numeric"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={() => manualBarcode.trim() && handleBarcode(manualBarcode.trim())}
            className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium active:bg-green-800"
          >
            Go
          </button>
        </div>
      )}

      {!showManual && isScanning && (
        <div className="p-4 flex justify-center">
          <button
            onClick={() => setShowManual(true)}
            className="text-white/50 text-sm underline"
          >
            Enter barcode manually
          </button>
        </div>
      )}

      <style jsx global>{`
        @keyframes scanline {
          0%, 100% { transform: translateY(-20px); opacity: 0.4; }
          50% { transform: translateY(20px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
