import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { extractExifLocation, isValidPhotoLocation, type PhotoLocation } from '@/lib/exif'
import { fallbackMemoryMetadata, generateMemoryMetadataFromImage } from '@/lib/memoryMetadata'
import { addPlySampleSuffix, downsamplePlyBytes } from '@/lib/ply'

/**
 * POST /api/generate
 *
 * Full pipeline: image → OpenAI metadata + Modal ml-sharp in parallel → full PLY
 * → sampled PLYs → Vercel Blob → preview response.
 *
 * DB insert is deferred to POST /api/memories after the user confirms the upload.
 *
 * Request: multipart/form-data with 'image' field
 * Returns: {
 *   title, description, model_url, model_full_url, model_web_url, model_garden_url,
 *   thumbnail_url, photo_latitude, photo_longitude, photo_location_source
 * }
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

        const imageBytes = await imageFile.arrayBuffer()
        const fallbackMetadata = fallbackMemoryMetadata(imageFile.name)
        const metadataPromise = generateMemoryMetadataFromImage(
            imageBytes,
            imageFile.type,
            imageFile.name
        ).catch((error) => {
            console.error('[generate] OpenAI metadata generation failed:', error)
            return fallbackMetadata
        })

        let photoLocation = extractExifLocation(imageBytes)
        if (photoLocation) {
            console.log(
                `[generate] Found EXIF GPS: ${photoLocation.latitude.toFixed(6)}, ${photoLocation.longitude.toFixed(6)}`
            )
        }

        // 1) Send image to Modal web endpoint
        const modalForm = new FormData()
        modalForm.append('image', new Blob([imageBytes], { type: imageFile.type }), imageFile.name)

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

        photoLocation ??= getLocationFromModalHeaders(modalRes.headers)

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
            new Blob([imageBytes], { type: imageFile.type }),
            { access: 'public', addRandomSuffix: true }
        )

        // 4) Await AI-generated metadata
        const metadata = await metadataPromise
        const title = metadata.title || fallbackMetadata.title
        const description = metadata.description || fallbackMetadata.description

        console.log(`[generate] Assets ready — returning for user confirmation`)

        // Return asset URLs + metadata — DB insert deferred to POST /api/memories
        return NextResponse.json({
            title,
            description,
            model_url: webPlyBlob.url,
            model_full_url: fullPlyBlob.url,
            model_web_url: webPlyBlob.url,
            model_garden_url: gardenPlyBlob.url,
            thumbnail_url: thumbBlob.url,
            photo_latitude: photoLocation?.latitude ?? null,
            photo_longitude: photoLocation?.longitude ?? null,
            photo_location_source: photoLocation?.source ?? null,
        }, { status: 200 })

    } catch (error) {
        console.error('POST /api/generate failed:', error)
        const message = error instanceof Error ? error.message : 'Generation failed'
        return NextResponse.json(
            { error: message },
            { status: 500 }
        )
    }
}

function getLocationFromModalHeaders(headers: Headers): PhotoLocation | null {
    const latitude = Number(headers.get('X-Photo-Latitude'))
    const longitude = Number(headers.get('X-Photo-Longitude'))

    if (
        isValidPhotoLocation(latitude, longitude)
    ) {
        return { latitude, longitude, source: 'exif' }
    }

    return null
}
