const PLY_TYPE_SIZES: Record<string, number> = {
    char: 1,
    int8: 1,
    uchar: 1,
    uint8: 1,
    short: 2,
    int16: 2,
    ushort: 2,
    uint16: 2,
    int: 4,
    int32: 4,
    uint: 4,
    uint32: 4,
    float: 4,
    float32: 4,
    double: 8,
    float64: 8,
}

function findHeaderEnd(bytes: Uint8Array) {
    const needle = new TextEncoder().encode('end_header')

    for (let i = 0; i <= bytes.length - needle.length; i++) {
        let match = true
        for (let j = 0; j < needle.length; j++) {
            if (bytes[i + j] !== needle[j]) {
                match = false
                break
            }
        }

        if (!match) continue

        let end = i + needle.length
        if (bytes[end] === 13) end++
        if (bytes[end] === 10) end++
        return end
    }

    throw new Error('Invalid PLY: missing end_header')
}

function getBinaryVertexLayout(header: string) {
    const lines = header.split(/\r?\n/)
    const vertexElementIndex = lines.findIndex((line) => line.startsWith('element vertex '))

    if (vertexElementIndex === -1) {
        throw new Error('Invalid PLY: missing vertex element')
    }

    const vertexCount = Number(lines[vertexElementIndex].split(/\s+/)[2])
    if (!Number.isFinite(vertexCount) || vertexCount < 0) {
        throw new Error('Invalid PLY: invalid vertex count')
    }

    let vertexRecordSize = 0
    for (let i = vertexElementIndex + 1; i < lines.length; i++) {
        const line = lines[i]
        if (line.startsWith('element ')) break
        if (!line.startsWith('property ')) continue
        if (line.startsWith('property list ')) {
            throw new Error('Unsupported PLY: list properties in vertex element')
        }

        const [, type] = line.split(/\s+/)
        const size = PLY_TYPE_SIZES[type]
        if (!size) {
            throw new Error(`Unsupported PLY property type: ${type}`)
        }
        vertexRecordSize += size
    }

    if (vertexRecordSize === 0 && vertexCount > 0) {
        throw new Error('Invalid PLY: vertex element has no scalar properties')
    }

    return { lines, vertexElementIndex, vertexCount, vertexRecordSize }
}

function replaceVertexCount(headerLines: string[], vertexElementIndex: number, vertexCount: number) {
    const lines = [...headerLines]
    lines[vertexElementIndex] = `element vertex ${vertexCount}`
    return `${lines.join('\n').replace(/\n*$/, '')}\n`
}

export function addPlySampleSuffix(filename: string, samplePercent: number) {
    return filename.replace(/\.ply$/i, `-sample${samplePercent}.ply`)
}

export function downsamplePlyBytes(buffer: ArrayBuffer, samplePercent: number) {
    if (samplePercent >= 100) return buffer
    if (samplePercent <= 0 || samplePercent > 100) {
        throw new Error(`Invalid PLY sample percent: ${samplePercent}`)
    }

    const source = new Uint8Array(buffer)
    const headerEnd = findHeaderEnd(source)
    const header = new TextDecoder().decode(source.slice(0, headerEnd))

    if (!header.includes('format binary_little_endian 1.0')) {
        throw new Error('Unsupported PLY format: expected binary_little_endian 1.0')
    }

    const { lines, vertexElementIndex, vertexCount, vertexRecordSize } = getBinaryVertexLayout(header)
    const stride = Math.max(1, Math.round(100 / samplePercent))
    const sampledCount = Math.ceil(vertexCount / stride)
    const sampledHeader = replaceVertexCount(lines, vertexElementIndex, sampledCount)
    const sampledHeaderBytes = new TextEncoder().encode(sampledHeader)

    const vertexDataStart = headerEnd
    const vertexDataEnd = vertexDataStart + vertexCount * vertexRecordSize
    if (vertexDataEnd > source.length) {
        throw new Error('Invalid PLY: vertex data is shorter than declared')
    }

    const tail = source.slice(vertexDataEnd)
    const sampledVertexBytes = new Uint8Array(sampledCount * vertexRecordSize)

    let out = 0
    for (let i = 0; i < vertexCount; i += stride) {
        const inStart = vertexDataStart + i * vertexRecordSize
        const inEnd = inStart + vertexRecordSize
        sampledVertexBytes.set(source.slice(inStart, inEnd), out * vertexRecordSize)
        out++
    }

    const result = new Uint8Array(sampledHeaderBytes.length + sampledVertexBytes.length + tail.length)
    result.set(sampledHeaderBytes, 0)
    result.set(sampledVertexBytes, sampledHeaderBytes.length)
    result.set(tail, sampledHeaderBytes.length + sampledVertexBytes.length)

    return result.buffer
}
