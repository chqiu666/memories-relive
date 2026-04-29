import { NextResponse } from 'next/server'
import { ensureMemoryAssetColumns, getDb, type MemoryWithTraces, type TraceRow } from '@/db'

/**
 * GET /api/memories
 * 获取所有 memories（含 traces）
 */
export async function GET() {
    try {
        const sql = getDb()
        await ensureMemoryAssetColumns(sql)

        // 查询所有 memories
        const memoryRows = await sql`
            SELECT
                id,
                title,
                description,
                thumbnail_url,
                model_url,
                model_full_url,
                model_web_url,
                model_garden_url,
                created_at,
                updated_at
            FROM memories
            ORDER BY created_at ASC
        `

        // 查询所有 traces
        const traceRows = await sql`
            SELECT id, memory_id, position, label, description, expand_dir, sort_order, created_at
            FROM traces
            ORDER BY sort_order ASC
        `

        // 按 memory_id 分组 traces
        const traceMap = new Map<string, TraceRow[]>()
        for (const row of traceRows) {
            const traces = traceMap.get(row.memory_id as string) || []
            traces.push({
                id: row.id as number,
                memory_id: row.memory_id as string,
                position: row.position as [number, number, number],
                label: row.label as string,
                description: row.description as string,
                expand_dir: row.expand_dir as string | null,
                sort_order: row.sort_order as number,
                created_at: row.created_at as string,
            })
            traceMap.set(row.memory_id as string, traces)
        }

        // 合并结果
        const memories: MemoryWithTraces[] = memoryRows.map((row) => ({
            id: row.id as string,
            title: row.title as string,
            description: row.description as string,
            thumbnail_url: row.thumbnail_url as string | null,
            model_url: row.model_url as string | null,
            model_full_url: row.model_full_url as string | null,
            model_web_url: row.model_web_url as string | null,
            model_garden_url: row.model_garden_url as string | null,
            created_at: row.created_at as string,
            updated_at: row.updated_at as string,
            traces: traceMap.get(row.id as string) || [],
        }))

        return NextResponse.json(memories)
    } catch (error) {
        console.error('GET /api/memories 失败:', error)
        return NextResponse.json(
            { error: '获取 memories 失败' },
            { status: 500 }
        )
    }
}

/**
 * POST /api/memories
 * 创建新 memory
 */
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const {
            id,
            title,
            description,
            thumbnail_url,
            model_url,
            model_full_url,
            model_web_url,
            model_garden_url,
        } = body

        if (!id || !title) {
            return NextResponse.json(
                { error: '缺少必填字段: id, title' },
                { status: 400 }
            )
        }

        const sql = getDb()
        await ensureMemoryAssetColumns(sql)
        await sql`
            INSERT INTO memories (
                id,
                title,
                description,
                thumbnail_url,
                model_url,
                model_full_url,
                model_web_url,
                model_garden_url
            )
            VALUES (
                ${id},
                ${title},
                ${description || ''},
                ${thumbnail_url || null},
                ${model_url || model_web_url || null},
                ${model_full_url || null},
                ${model_web_url || model_url || null},
                ${model_garden_url || null}
            )
        `

        return NextResponse.json({ success: true, id }, { status: 201 })
    } catch (error) {
        console.error('POST /api/memories 失败:', error)
        return NextResponse.json(
            { error: '创建 memory 失败' },
            { status: 500 }
        )
    }
}
