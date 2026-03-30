import { NextResponse } from 'next/server'
import { getDb } from '@/db'

/**
 * GET /api/memories/:id
 * 获取单个 memory 详情（含 traces）
 */
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const sql = getDb()

        const memoryRows = await sql`
            SELECT id, title, description, thumbnail_url, model_url, created_at, updated_at
            FROM memories WHERE id = ${id}
        `

        if (memoryRows.length === 0) {
            return NextResponse.json({ error: '未找到该 memory' }, { status: 404 })
        }

        const traceRows = await sql`
            SELECT id, memory_id, position, label, description, expand_dir, sort_order, created_at
            FROM traces WHERE memory_id = ${id}
            ORDER BY sort_order ASC
        `

        const memory = {
            ...memoryRows[0],
            traces: traceRows,
        }

        return NextResponse.json(memory)
    } catch (error) {
        console.error('GET /api/memories/:id 失败:', error)
        return NextResponse.json({ error: '获取失败' }, { status: 500 })
    }
}

/**
 * PATCH /api/memories/:id
 * 更新 memory 的元数据（title, description 等）
 */
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json()
        const sql = getDb()

        // 动态构建更新字段
        const updates: string[] = []
        const values: Record<string, unknown> = {}

        if (body.title !== undefined) {
            values.title = body.title
        }
        if (body.description !== undefined) {
            values.description = body.description
        }
        if (body.thumbnail_url !== undefined) {
            values.thumbnail_url = body.thumbnail_url
        }
        if (body.model_url !== undefined) {
            values.model_url = body.model_url
        }

        if (Object.keys(values).length === 0) {
            return NextResponse.json({ error: '没有需要更新的字段' }, { status: 400 })
        }

        // 使用 tagged template 分别更新每个字段
        // （Neon 的 tagged template 不支持动态列名，所以逐字段更新）
        if (values.title !== undefined) {
            await sql`UPDATE memories SET title = ${values.title as string}, updated_at = now() WHERE id = ${id}`
        }
        if (values.description !== undefined) {
            await sql`UPDATE memories SET description = ${values.description as string}, updated_at = now() WHERE id = ${id}`
        }
        if (values.thumbnail_url !== undefined) {
            await sql`UPDATE memories SET thumbnail_url = ${values.thumbnail_url as string}, updated_at = now() WHERE id = ${id}`
        }
        if (values.model_url !== undefined) {
            await sql`UPDATE memories SET model_url = ${values.model_url as string}, updated_at = now() WHERE id = ${id}`
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('PATCH /api/memories/:id 失败:', error)
        return NextResponse.json({ error: '更新失败' }, { status: 500 })
    }
}

/**
 * DELETE /api/memories/:id
 * 删除 memory（关联的 traces 会被 CASCADE 自动删除）
 */
export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const sql = getDb()
        await sql`DELETE FROM memories WHERE id = ${id}`
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('DELETE /api/memories/:id 失败:', error)
        return NextResponse.json({ error: '删除失败' }, { status: 500 })
    }
}
