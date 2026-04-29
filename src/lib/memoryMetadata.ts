import { Buffer } from 'node:buffer'

export interface MemoryMetadata {
    title: string
    description: string
}

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses'
const OPENAI_METADATA_MODEL = 'gpt-5.4-mini'
const METADATA_TIMEOUT_MS = 90_000
const DEFAULT_DESCRIPTION = 'Generated from photo'
const OPENAI_SUPPORTED_IMAGE_TYPES = new Set([
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
])

const METADATA_PROMPT = `# Role
你是一个专注客观物理痕迹重建的“数字考古分析器”。你的任务是基于图像中物体表面的物理特征（如磨损、断裂、刻划、印记等），逆向推演并重建这些痕迹发生的客观历史经过。

# Task
请分析输入的图像，提取最主要的物理痕迹，并输出结构化的 JSON 数据。描述部分必须严格包含两层信息：
1. **痕迹现状**：客观描述当前的视觉、几何与物理特征。
2. **经过历史**：基于上述特征，按时间顺序陈述导致这些痕迹发生的一系列物理动作与历史过程。

# Output Constraints (严格遵守)
1. **叙事结构**：必须先描述客观看到的痕迹形态，紧接着描述导致该形态的历史经过。
2. **纯粹客观**：语言必须极其克制，只关注材质、外力、几何特征的改变以及动作发生的先后顺序。
3. **禁止总结与升华（FATAL ERROR）**：绝对不允许在描述结尾添加任何哲学、情感或社会学意义的总结！写完历史动作必须立刻停止！
   * ❌ 禁止使用类似：“这不仅是材料的损耗，更是陪伴的证明。”
   * ❌ 禁止使用类似：“它将私人情感强行嵌入了公共空间。”
   * ✅ 正确示范：“皮革面料呈现高频且无规则的网状划痕（痕迹现状）。最初，一只家养猫科动物在此处进行反复的伸展与抓挠，锋利的爪尖切开了皮革表层，随后的长期摩擦导致了切口边缘的进一步起毛与泛白（经过历史）。”
4. **格式要求**：只允许输出合法的 JSON 字符串，不要包含任何 Markdown 格式符号（如 \`\`\`json ），不要包含任何解释性文本。

# JSON 输出格式
{
  "title_en": "<简短、准确的英文标题，例如：Cat Scratches>",
  "description_en": "<必须包含两部分：1. 描述痕迹的视觉/几何特征；2. 按时间顺序重建导致该痕迹的动作历史与经过。写完动作即止，严格遵守禁止升华的约束。>"
}`

const metadataSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['title_en', 'description_en'],
    properties: {
        title_en: {
            type: 'string',
            minLength: 1,
            maxLength: 80,
        },
        description_en: {
            type: 'string',
            minLength: 1,
            maxLength: 1600,
        },
    },
} as const

export function fallbackMemoryMetadata(filename: string): MemoryMetadata {
    return {
        title: filename.replace(/\.[^.]+$/, '') || 'Untitled Memory',
        description: DEFAULT_DESCRIPTION,
    }
}

export async function generateMemoryMetadataFromImage(
    imageBytes: ArrayBuffer,
    contentType: string,
    filename: string
): Promise<MemoryMetadata> {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
        return fallbackMemoryMetadata(filename)
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), METADATA_TIMEOUT_MS)

    try {
        const imageInput = await prepareImageForOpenAI(imageBytes, contentType, filename)
        const imageDataUrl = `data:${imageInput.contentType};base64,${imageInput.buffer.toString('base64')}`
        const response = await fetch(OPENAI_RESPONSES_URL, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: OPENAI_METADATA_MODEL,
                input: [
                    {
                        role: 'user',
                        content: [
                            { type: 'input_text', text: METADATA_PROMPT },
                            { type: 'input_image', image_url: imageDataUrl },
                        ],
                    },
                ],
                text: {
                    format: {
                        type: 'json_schema',
                        name: 'memory_trace_metadata',
                        schema: metadataSchema,
                        strict: true,
                    },
                },
            }),
        })

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error')
            throw new Error(`OpenAI metadata failed (${response.status}): ${errorText.slice(0, 200)}`)
        }

        const payload = await response.json()
        const responseText = extractResponseText(payload)
        if (!responseText) {
            throw new Error('OpenAI metadata response did not contain output text')
        }

        const parsed = JSON.parse(responseText) as Partial<{ title_en: unknown; description_en: unknown }>
        const title = typeof parsed.title_en === 'string' ? parsed.title_en.trim() : ''
        const description = typeof parsed.description_en === 'string' ? parsed.description_en.trim() : ''

        if (!title || !description) {
            throw new Error('OpenAI metadata response was missing title_en or description_en')
        }

        return { title, description }
    } finally {
        clearTimeout(timeout)
    }
}

async function prepareImageForOpenAI(
    imageBytes: ArrayBuffer,
    contentType: string,
    filename: string
): Promise<{ buffer: Buffer; contentType: string }> {
    const normalizedType = normalizeImageContentType(contentType, filename)
    const buffer = Buffer.from(imageBytes)

    if (normalizedType !== 'image/heic' && normalizedType !== 'image/heif') {
        return {
            buffer,
            contentType: OPENAI_SUPPORTED_IMAGE_TYPES.has(normalizedType) ? normalizedType : 'image/jpeg',
        }
    }

    const heicConvertModule = await import('heic-convert')
    const convert = heicConvertModule.default ?? heicConvertModule
    const converted = await convert({
        buffer,
        format: 'JPEG',
        quality: 0.92,
    })

    return {
        buffer: converted instanceof ArrayBuffer
            ? Buffer.from(converted)
            : Buffer.from(converted.buffer, converted.byteOffset, converted.byteLength),
        contentType: 'image/jpeg',
    }
}

function normalizeImageContentType(contentType: string, filename: string): string {
    const lowerType = contentType.toLowerCase().split(';', 1)[0].trim()
    if (lowerType) return lowerType === 'image/jpg' ? 'image/jpeg' : lowerType

    const lowerName = filename.toLowerCase()
    if (lowerName.endsWith('.heic')) return 'image/heic'
    if (lowerName.endsWith('.heif')) return 'image/heif'
    if (lowerName.endsWith('.png')) return 'image/png'
    if (lowerName.endsWith('.webp')) return 'image/webp'
    if (lowerName.endsWith('.gif')) return 'image/gif'
    return 'image/jpeg'
}

function extractResponseText(payload: unknown): string | null {
    if (!payload || typeof payload !== 'object') return null

    const maybeOutputText = (payload as { output_text?: unknown }).output_text
    if (typeof maybeOutputText === 'string') return maybeOutputText

    const output = (payload as { output?: unknown }).output
    if (!Array.isArray(output)) return null

    for (const item of output) {
        if (!item || typeof item !== 'object') continue
        const content = (item as { content?: unknown }).content
        if (!Array.isArray(content)) continue

        for (const part of content) {
            if (!part || typeof part !== 'object') continue
            const text = (part as { text?: unknown }).text
            if (typeof text === 'string') return text
        }
    }

    return null
}
