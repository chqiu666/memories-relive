import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'

/**
 * POST /api/upload
 * 上传文件到 Vercel Blob（模型、缩略图等）
 * 
 * 请求：multipart/form-data，包含一个 'file' 字段
 * 可选 query param: ?filename=custom_name.ply
 */
export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File | null

        if (!file) {
            return NextResponse.json(
                { error: '缺少文件' },
                { status: 400 }
            )
        }

        // 使用自定义文件名或原始文件名
        const url = new URL(request.url)
        const filename = url.searchParams.get('filename') || file.name

        // 上传到 Vercel Blob
        const blob = await put(filename, file, {
            access: 'public',
        })

        return NextResponse.json({
            url: blob.url,
            pathname: blob.pathname,
            size: file.size,
        })
    } catch (error) {
        console.error('POST /api/upload 失败:', error)
        return NextResponse.json(
            { error: '上传失败' },
            { status: 500 }
        )
    }
}
