# Memories Relive — Project Context

> Attach at the start of each agent session for a quick project overview.

## Conventions

- **All written output must be in English** — code comments, commit messages, documentation, variable names, and UI-facing strings (unless explicitly told otherwise).
- Use the existing tech stack. Do not introduce new frameworks without asking.
- Follow the file/folder structure outlined below.

## What Is This

A 3D point cloud visualization web app. Users upload photos → AI reconstructs them into 3D point clouds → browse and annotate "memory traces" in the browser.

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router) |
| 3D | React Three Fiber + Three.js + drei |
| Post-processing | @react-three/postprocessing (Bloom) |
| State | Zustand |
| Animation | GSAP + Framer Motion |
| Styling | Tailwind CSS 4 |
| Database | Neon Postgres (via `@neondatabase/serverless`) |
| File Storage | Vercel Blob |
| AI Backend | Modal (Python, GPU) — `modal_backend/` |
| Deployment | Vercel |

## Directory Structure

```
src/
├── app/
│   ├── page.tsx              # Main page, switches between grid/detail/garden views
│   └── api/
│       ├── memories/         # GET list / POST create
│       │   └── [id]/         # GET detail / PATCH update / DELETE remove
│       └── upload/           # POST file upload to Vercel Blob
├── components/
│   ├── canvas/               # R3F 3D components
│   │   ├── Scene.tsx         # Single-model detail scene (PointCloud + HighlightPointCloud + InfoTile)
│   │   ├── GardenScene.tsx   # Multi-model "memory garden" scene
│   │   ├── PointCloud.tsx    # PLY loading + custom shader + sampling
│   │   ├── HighlightPointCloud.tsx  # Highlight layer (trace mask)
│   │   ├── InfoTile.tsx      # Floating annotation cards in 3D space
│   │   └── CoordPicker.tsx   # Raycaster coordinate picker tool
│   └── dom/                  # 2D UI overlays
│       ├── Gallery.tsx       # Card grid + upload button
│       ├── UI.tsx            # Detail mode title / inline edit / back nav
│       └── DebugPanel.tsx    # FPS / point count / sample rate debug panel
├── store/index.ts            # Zustand store (view state + memories data + debug controls)
├── db/
│   ├── index.ts              # Neon client + type definitions (MemoryRow, TraceRow, MemoryWithTraces)
│   ├── schema.sql            # Table creation SQL (memories + traces)
│   └── seed.ts               # JSON → Postgres data migration script
└── data/memories.json        # Original seed data (used only by seed script, not at runtime)

modal_backend/
├── mlsharp_app.py            # Modal GPU: photo → 3D point cloud (ml-sharp)
└── mvdust3r_app.py           # Modal GPU: multi-view 3D reconstruction (MV-DUSt3R)

docs/                         # Project documentation (you are here)
```

## Data Model

```
memories (Neon Postgres)
├── id: TEXT PK
├── title, description: TEXT
├── thumbnail_url, model_url: TEXT (Vercel Blob URL or /public relative path)
└── created_at, updated_at: TIMESTAMPTZ

traces (FK → memories.id, CASCADE)
├── position: JSONB [x, y, z]
├── label, description: TEXT
├── expand_dir: 'up' | 'down' | null
└── sort_order: INT
```

## Key Data Flows

```
Gallery mount → store.fetchMemories() → GET /api/memories → Postgres
Click card   → store.set({ viewMode: 'detail', activeMemoryId }) → Scene loads PLY
Edit name    → store.updateMemory() → PATCH /api/memories/:id → Postgres
Upload photo → /api/generate (WIP) → Modal ml-sharp → PLY → Blob + DB
```

## Environment Variables

Pulled locally via `npx vercel env pull .env.local`. Key variables:
- `DATABASE_URL` — Neon Postgres connection string
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob read/write token

## Three View Modes

- **grid** — Gallery card list
- **detail** — Single memory 3D point cloud viewer + trace annotations
- **garden** — All memories displayed side by side in a "memory garden"

## In Progress / Planned

See individual docs in `docs/` for details:
- `frontend-integration-plan.md` — Photo upload → Modal → new memory creation flow
- `vercel-backend-integration.md` — Completed backend migration record
