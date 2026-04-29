import { neon } from '@neondatabase/serverless'

let memoryAssetColumnsReady: Promise<void> | null = null

/**
 * 获取 Neon SQL 客户端
 * 使用 DATABASE_URL 环境变量（Vercel 自动注入，本地从 .env.local 读取）
 */
export function getDb() {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
        throw new Error('DATABASE_URL 环境变量未设置。请检查 .env.local 或 Vercel 环境变量。')
    }
    return neon(databaseUrl)
}

export async function ensureMemoryAssetColumns(sql: ReturnType<typeof getDb>) {
    memoryAssetColumnsReady ??= (async () => {
        await sql`ALTER TABLE memories ADD COLUMN IF NOT EXISTS model_full_url TEXT`
        await sql`ALTER TABLE memories ADD COLUMN IF NOT EXISTS model_web_url TEXT`
        await sql`ALTER TABLE memories ADD COLUMN IF NOT EXISTS model_garden_url TEXT`
    })().catch((error) => {
        memoryAssetColumnsReady = null
        throw error
    })

    return memoryAssetColumnsReady
}

// ─── 类型定义 ───

export interface MemoryRow {
    id: string
    title: string
    description: string
    thumbnail_url: string | null
    model_url: string | null
    model_full_url: string | null
    model_web_url: string | null
    model_garden_url: string | null
    created_at: string
    updated_at: string
}

export interface TraceRow {
    id: number
    memory_id: string
    position: [number, number, number]
    label: string
    description: string
    expand_dir: string | null
    sort_order: number
    created_at: string
}

// 前端使用的聚合类型
export interface MemoryWithTraces extends MemoryRow {
    traces: TraceRow[]
}
