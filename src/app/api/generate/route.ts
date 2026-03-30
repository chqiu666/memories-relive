import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { getDb } from '@/db'

/**
 * POST /api/generate
 *
 * Full pipeline: image → Modal ml-sharp → PLY → Vercel Blob → Neon DB
 *
 * Request: multipart/form-data with 'image' field
 * Returns: { id, title, model_url, thumbnail_url }
 */

const MODAL_ENDPOINT_URL = process.env.MODAL_MLSHARP_ENDPOINT_URL

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const imageFile = formData.get('image') as File | null

        if (!imageFile) {
            return NextResponse.json(
                { error: 'Missing image file' },
                { status: 400 }
            )
        }

        if (!MODAL_ENDPOINT_URL) {
            return NextResponse.json(
                { error: 'MODAL_MLSHARP_ENDPOINT_URL not configured' },
                { status: 500 }
            )
        }

        // 1) Send image to Modal web endpoint
        const modalForm = new FormData()
        modalForm.append('image', imageFile)

        const modalRes = await fetch(MODAL_ENDPOINT_URL, {
            method: 'POST',
            body: modalForm,
        })

        if (!modalRes.ok) {
            const errText = await modalRes.text()
            console.error('Modal inference failed:', modalRes.status, errText)
            return NextResponse.json(
                { error: `Model inference failed: ${modalRes.status}` },
                { status: 502 }
            )
        }

        const plyBytes = await modalRes.arrayBuffer()
        const outputFilename =
            modalRes.headers.get('X-Output-Filename') ||
            imageFile.name.replace(/\.[^.]+$/, '.ply')

        // 2) Upload PLY to Vercel Blob
        const plyBlob = await put(
            `models/${outputFilename}`,
            new Blob([plyBytes]),
            { access: 'public' }
        )

        // 3) Upload original image as thumbnail to Vercel Blob
        const thumbBlob = await put(
            `thumbnails/${imageFile.name}`,
            imageFile,
            { access: 'public' }
        )

        // 4) Create memory record in Neon DB
        const memoryId = `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        const title = imageFile.name.replace(/\.[^.]+$/, '') // filename without extension

        const sql = getDb()
        await sql`
            INSERT INTO memories (id, title, description, thumbnail_url, model_url)
            VALUES (${memoryId}, ${title}, ${'Generated from photo'}, ${thumbBlob.url}, ${plyBlob.url})
        `

        return NextResponse.json({
            id: memoryId,
            title,
            model_url: plyBlob.url,
            thumbnail_url: thumbBlob.url,
        }, { status: 201 })

    } catch (error) {
        console.error('POST /api/generate failed:', error)
        return NextResponse.json(
            { error: 'Generation failed' },
            { status: 500 }
        )
    }
}
