# Vercel Postgres + Blob Backend Integration

Migrated memories metadata from static `memories.json` to Neon Postgres (Vercel Storage), and wired file uploads through Vercel Blob. All data is now served via API routes — no more static JSON imports at runtime.

## New Files

### Database Layer

#### [NEW] [schema.sql](file:///Users/astra/Documents/GitHub/memories-relive/src/db/schema.sql)
Two tables:
- `memories` — id, title, description, thumbnail_url, model_url, created_at, updated_at
- `traces` — id, memory_id (FK), position (JSONB), label, description, expand_dir, sort_order

#### [NEW] [db/index.ts](file:///Users/astra/Documents/GitHub/memories-relive/src/db/index.ts)
Neon serverless client wrapper + `MemoryRow`, `TraceRow`, `MemoryWithTraces` type definitions. Uses `DATABASE_URL` env var.

#### [NEW] [db/seed.ts](file:///Users/astra/Documents/GitHub/memories-relive/src/db/seed.ts)
One-time script to import `memories.json` data into Postgres. Run with: `npx tsx src/db/seed.ts`

---

### API Routes

#### [NEW] [/api/memories](file:///Users/astra/Documents/GitHub/memories-relive/src/app/api/memories/route.ts)
- `GET` — List all memories (with aggregated traces)
- `POST` — Create a new memory

#### [NEW] [/api/memories/[id]](file:///Users/astra/Documents/GitHub/memories-relive/src/app/api/memories/%5Bid%5D/route.ts)
- `GET` — Single memory detail (with traces)
- `PATCH` — Update fields (title / description / thumbnail_url / model_url)
- `DELETE` — Remove memory (traces auto-CASCADE)

#### [NEW] [/api/upload](file:///Users/astra/Documents/GitHub/memories-relive/src/app/api/upload/route.ts)
- `POST` — Upload file to Vercel Blob, returns public URL

---

## Modified Files

### [MODIFY] [store/index.ts](file:///Users/astra/Documents/GitHub/memories-relive/src/store/index.ts)
- Added `memories: MemoryWithTraces[]` + `memoriesLoading` state
- Added `fetchMemories()` — calls `GET /api/memories` to load all data
- Added `updateMemory(id, data)` — calls `PATCH /api/memories/:id` + optimistic local update
- All existing debug/rendering state preserved

### [MODIFY] [Gallery.tsx](file:///Users/astra/Documents/GitHub/memories-relive/src/components/dom/Gallery.tsx)
- Removed `import memories from '@/data/memories.json'`
- Calls `fetchMemories()` on mount, reads `memories` from store
- `thumbnail` → `thumbnail_url`

### [MODIFY] [Scene.tsx](file:///Users/astra/Documents/GitHub/memories-relive/src/components/canvas/Scene.tsx)
- Reads `memories` + `activeMemoryId` from store to locate active memory
- `modelSrc` → `model_url`, `tiles` → `traces`

### [MODIFY] [GardenScene.tsx](file:///Users/astra/Documents/GitHub/memories-relive/src/components/canvas/GardenScene.tsx)
- Same as above — reads `memories` from store, field names aligned with DB schema

### [MODIFY] [UI.tsx](file:///Users/astra/Documents/GitHub/memories-relive/src/components/dom/UI.tsx)
- Reads memory data from store
- Restored inline name editing: pencil icon (borderless) → click to edit → Enter/blur saves → `PATCH /api/memories/:id` writes to Postgres
- Escape cancels, switching memories auto-exits edit mode

---

## Dependency Changes

```diff
+ @neondatabase/serverless   — Neon Postgres client
+ @vercel/blob               — Vercel Blob file storage
+ tsx (devDep)               — Run seed script
+ dotenv (devDep)            — Load .env.local in seed script
```

## Environment Variables

Auto-injected by Vercel; pulled locally via `npx vercel env pull .env.local`:
- `DATABASE_URL` — Neon Postgres connection string (pooled)
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob read/write token
- Additional `POSTGRES_*` / `PG*` variables

## Data Flow Architecture

```
Frontend (React + Zustand)
  ├─ Gallery mount → fetchMemories() → GET /api/memories → Neon Postgres
  ├─ Detail view → store.memories.find(activeMemoryId) → model_url / traces
  ├─ Name edit → updateMemory() → PATCH /api/memories/:id → Neon Postgres
  └─ File upload → POST /api/upload → Vercel Blob → returns URL

Modal Backend (future)
  └─ Processing complete → POST webhook → /api/memories (write DB + Blob) → frontend polls for update
```

## Vercel Dashboard Manual Steps

1. Storage → Create Postgres (Neon) database
2. Storage → Create Blob Store
3. Connect both to the memories-relive project
4. Locally run `vercel link` + `vercel env pull .env.local`
5. Run `npx tsx src/db/seed.ts` to import initial data (3 memories + 4 traces)

## Verification Results

- `npm run build` ✅ Zero errors, 3 API routes correctly marked as `ƒ (Dynamic)`
- `GET /api/memories` ✅ Returns 3 complete records (with traces)
- `PATCH /api/memories/:id` ✅ Title update successful, `updated_at` auto-refreshed
- Browser Gallery → Detail → Edit name → Back to Gallery full flow ✅
