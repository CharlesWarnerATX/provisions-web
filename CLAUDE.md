# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # local dev server on http://localhost:3000
npm run build    # type-check + production build
npm run lint     # ESLint
cd /mnt/c/projects/provisions-web && vercel deploy --prod --yes   # deploy to production
```

There are no tests. TypeScript (`npm run build`) is the primary correctness check before deploying.

## Architecture

Next.js 15 App Router, TypeScript, Tailwind CSS v4. All pages are `'use client'` — no server components or server actions in use.

**`lib/supabase.ts`** — singleton Supabase client with `db: { schema: 'provisions' }` baked in. Import `supabase` from here for all DB calls; never pass the schema on individual queries.

**`lib/types.ts`** — shared types (`Location`, `LotRow`) and the `CATEGORIES` constant used across add/edit/scan pages.

**`app/page.tsx`** — home screen (inventory list). Fetches `inventory_lots` joined to `items` and `locations`, filters `quantity_remaining > 0`, sorted by `expiration_date`. Location filter chips at top. Two FABs: scan (bottom-right secondary) and + add (bottom-right primary).

**`app/scan/page.tsx`** — barcode scanner. Uses `@zxing/browser` dynamically imported inside `useEffect` (not at module level) to avoid SSR crashes. Flow: rear camera scan → check Supabase `items` by barcode → if found, prompt "Add to Inventory" → `/add?item_id=X`; if not found, call Open Food Facts API then redirect to `/add?barcode=X&name=X&brand=X&size=X&category=X`.

**`app/add/page.tsx`** — add item + lot. Wrapped in `<Suspense>` because it uses `useSearchParams`. If `item_id` param is present (`lotOnly` mode), skips item creation and inserts only an `inventory_lots` row. Pre-fills from scan URL params when present.

**`app/edit/[id]/page.tsx`** — edit lot (and its parent item). Loads lot with `select('*, items(id, name, brand, category, barcode)')`. Saves item fields only if changed. Delete and "Mark as Used Up" both delete the lot row entirely.

**`app/expiring/page.tsx`** — items expiring within 30 days, bucketed into expired / this_week / next_week / within_30. Queries `inventory_lots` directly (not the `expiration_report` view, which lacks location).

**`app/recipes/page.tsx`**, **`app/recipes/add/page.tsx`**, **`app/recipes/[id]/page.tsx`** — recipe list, create form, and detail page. Detail page shows ingredient in-stock status (green dot = item has `quantity_remaining > 0`), inline edit, and delete with confirm banner.

**`app/locations/page.tsx`** — CRUD for the `locations` table.

## Key constraints

**Never use `window.confirm()` for destructive actions** — it is unreliable on iOS Safari in async event handlers. All delete confirmations use an inline red banner pattern: a state flag (`confirmingDelete`) renders a banner with explicit "Delete" / "Cancel" buttons.

**`useSearchParams` requires `<Suspense>`** — any page component that calls `useSearchParams` must be split into an inner component wrapped by `export default function Page() { return <Suspense><Inner /></Suspense> }`.

**`@zxing/browser` must be dynamically imported** — `import('@zxing/browser')` inside `useEffect`, never at the top of the file, or Next.js SSR will crash.

**Supabase schema** — the client has `provisions` schema set globally; queries go directly to table names (`.from('inventory_lots')`). The `recipe_ingredients` table has no single exposed PK; deletes use `.eq('recipe_id', x).eq('item_id', y)`.
