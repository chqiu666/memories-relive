import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { put } from '@vercel/blob'
import { ensureMemoryAssetColumns, getDb } from '@/db'
import { addPlySampleSuffix, downsamplePlyBytes } from '@/lib/ply'

/**
 * POST /api/generate
 *
 * Full pipeline: image → Modal ml-sharp → full PLY → sampled PLYs → Vercel Blob → Neon DB
 *
 * Request: multipart/form-data with 'image' field
 * Returns: { id, title, model_url, model_full_url, model_web_url, model_garden_url, thumbnail_url }
 */

// Increase Vercel function timeout (default is 10s, ml-sharp needs ~60s)
// Requires Vercel Pro/Enterprise for >60s; Hobby supports up to 60s
export const maxDuration = 300

const MODAL_ENDPOINT_URL = process.env.MODAL_MLSHARP_ENDPOINT_URL

export async function POST(request: Request) {
    try {
        let formData: FormData
        try {
            formData = await request.formData()
        } catch {
            return NextResponse.json(
                { error: 'Invalid form data. Send multipart/form-data with an "image" field.' },
                { status: 400 }
            )
        }

        const imageFile = formData.get('image') as File | null

        if (!imageFile) {
            return NextResponse.json(
                { error: 'Missing image file' },
                { status: 400 }
            )
        }

        if (!MODAL_ENDPOINT_URL) {
            return NextResponse.json(
                { error: 'MODAL_MLSHARP_ENDPOINT_URL not configured. Set it in .env.local or Vercel env vars.' },
                { status: 500 }
            )
        }

        console.log(`[generate] Processing ${imageFile.name} (${(imageFile.size / 1024).toFixed(0)} KB)`)

        // 1) Send image to Modal web endpoint
        const modalForm = new FormData()
        modalForm.append('image', imageFile)

        const modalRes = await fetch(MODAL_ENDPOINT_URL, {
            method: 'POST',
            body: modalForm,
        })

        if (!modalRes.ok) {
            const errText = await modalRes.text().catch(() => 'Unknown error')
            console.error('Modal inference failed:', modalRes.status, errText)
            return NextResponse.json(
                { error: `Model inference failed (${modalRes.status}): ${errText.slice(0, 200)}` },
                { status: 502 }
            )
        }

        const plyBytes = await modalRes.arrayBuffer()
        console.log(`[generate] Received PLY: ${(plyBytes.byteLength / 1024).toFixed(0)} KB`)

        const outputFilename =
            modalRes.headers.get('X-Output-Filename') ||
            imageFile.name.replace(/\.[^.]+$/, '.ply')

        const webFilename = addPlySampleSuffix(outputFilename, 30)
        const gardenFilename = addPlySampleSuffix(outputFilename, 10)
        const webPlyBytes = downsamplePlyBytes(plyBytes, 30)
        const gardenPlyBytes = downsamplePlyBytes(plyBytes, 10)

        console.log(
            `[generate] Sampled PLYs: web30=${(webPlyBytes.byteLength / 1024).toFixed(0)} KB, garden10=${(gardenPlyBytes.byteLength / 1024).toFixed(0)} KB`
        )

        // 2) Upload full + sampled PLY files to Vercel Blob.
        // Full stays as the backup/source of truth; UI loads the smaller files.
        const [fullPlyBlob, webPlyBlob, gardenPlyBlob] = await Promise.all([
            put(
                `models/full/${outputFilename}`,
                new Blob([plyBytes]),
                { access: 'public', addRandomSuffix: true }
            ),
            put(
                `models/web/${webFilename}`,
                new Blob([webPlyBytes]),
                { access: 'public', addRandomSuffix: true }
            ),
            put(
                `models/garden/${gardenFilename}`,
                new Blob([gardenPlyBytes]),
                { access: 'public', addRandomSuffix: true }
            ),
        ])

        // 3) Upload original image as thumbnail to Vercel Blob
        const thumbBlob = await put(
            `thumbnails/${imageFile.name}`,
            imageFile,
            { access: 'public', addRandomSuffix: true }
        )

        // 4) Create memory record in Neon DB
        const memoryId = `mem_${randomUUID().replaceAll('-', '').slice(0, 20)}`
        const title = imageFile.name.replace(/\.[^.]+$/, '') // filename without extension

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
                ${memoryId},
                ${title},
                ${'Generated from photo'},
                ${thumbBlob.url},
                ${webPlyBlob.url},
                ${fullPlyBlob.url},
                ${webPlyBlob.url},
                ${gardenPlyBlob.url}
            )
        `

        console.log(`[generate] Created memory ${memoryId}: ${title}`)

        return NextResponse.json({
            id: memoryId,
            title,
            model_url: webPlyBlob.url,
            model_full_url: fullPlyBlob.url,
            model_web_url: webPlyBlob.url,
            model_garden_url: gardenPlyBlob.url,
            thumbnail_url: thumbBlob.url,
        }, { status: 201 })

    } catch (error) {
        console.error('POST /api/generate failed:', error)
        const message = error instanceof Error ? error.message : 'Generation failed'
        return NextResponse.json(
            { error: message },
            { status: 500 }
        )
    }
}
