export interface PhotoLocation {
    latitude: number
    longitude: number
    source: 'exif'
}

const TIFF_HEADER_OFFSET = 6
const GPS_INFO_TAG = 0x8825
const GPS_LATITUDE_REF_TAG = 0x0001
const GPS_LATITUDE_TAG = 0x0002
const GPS_LONGITUDE_REF_TAG = 0x0003
const GPS_LONGITUDE_TAG = 0x0004

const TYPE_SIZES: Record<number, number> = {
    1: 1, // BYTE
    2: 1, // ASCII
    3: 2, // SHORT
    4: 4, // LONG
    5: 8, // RATIONAL
    7: 1, // UNDEFINED
    9: 4, // SLONG
    10: 8, // SRATIONAL
}

interface IfdEntry {
    type: number
    count: number
    valueOffset: number
    entryOffset: number
}

export function extractExifLocation(buffer: ArrayBuffer): PhotoLocation | null {
    const view = new DataView(buffer)
    const tiffStart = findTiffStart(view)

    if (tiffStart === null) return null

    return readGpsLocation(view, tiffStart)
}

export function isValidPhotoLocation(latitude: number, longitude: number): boolean {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return false

    // Some phone/export pipelines preserve a GPS IFD but zero out the values.
    // Treat Null Island as missing metadata for this app instead of a real memory location.
    return latitude !== 0 || longitude !== 0
}

function findTiffStart(view: DataView): number | null {
    if (view.byteLength < 8) return null

    if (isTiffHeader(view, 0)) return 0

    if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null

    let offset = 2
    while (offset + 4 <= view.byteLength) {
        if (view.getUint8(offset) !== 0xff) return null

        const marker = view.getUint8(offset + 1)
        offset += 2

        if (marker === 0xda || marker === 0xd9) break
        if (offset + 2 > view.byteLength) return null

        const segmentLength = view.getUint16(offset)
        const segmentStart = offset + 2
        const segmentEnd = offset + segmentLength

        if (segmentLength < 2 || segmentEnd > view.byteLength) return null

        if (
            marker === 0xe1 &&
            segmentLength >= 8 &&
            readAscii(view, segmentStart, 6) === 'Exif\0\0'
        ) {
            const tiffStart = segmentStart + TIFF_HEADER_OFFSET
            return isTiffHeader(view, tiffStart) ? tiffStart : null
        }

        offset = segmentEnd
    }

    return null
}

function readGpsLocation(view: DataView, tiffStart: number): PhotoLocation | null {
    const littleEndian = readEndian(view, tiffStart)
    if (littleEndian === null) return null
    if (readUint16(view, tiffStart + 2, littleEndian) !== 42) return null

    const firstIfdOffset = readUint32(view, tiffStart + 4, littleEndian)
    const firstIfd = readIfd(view, tiffStart, firstIfdOffset, littleEndian)
    const gpsInfo = firstIfd.get(GPS_INFO_TAG)
    if (!gpsInfo) return null

    const gpsIfdOffset = readLongValue(view, tiffStart, gpsInfo, littleEndian)
    if (gpsIfdOffset === null) return null

    const gpsIfd = readIfd(view, tiffStart, gpsIfdOffset, littleEndian)
    const latRef = readAsciiValue(view, tiffStart, gpsIfd.get(GPS_LATITUDE_REF_TAG))
    const lat = readRationalArray(view, tiffStart, gpsIfd.get(GPS_LATITUDE_TAG), littleEndian)
    const lonRef = readAsciiValue(view, tiffStart, gpsIfd.get(GPS_LONGITUDE_REF_TAG))
    const lon = readRationalArray(view, tiffStart, gpsIfd.get(GPS_LONGITUDE_TAG), littleEndian)

    if (!latRef || !lonRef || lat.length !== 3 || lon.length !== 3) return null

    const latitude = toDecimalDegrees(lat, latRef)
    const longitude = toDecimalDegrees(lon, lonRef)

    if (!isValidPhotoLocation(latitude, longitude)) return null

    return { latitude, longitude, source: 'exif' }
}

function readIfd(
    view: DataView,
    tiffStart: number,
    ifdOffset: number,
    littleEndian: boolean
): Map<number, IfdEntry> {
    const entries = new Map<number, IfdEntry>()
    const start = tiffStart + ifdOffset
    if (start < 0 || start + 2 > view.byteLength) return entries

    const count = readUint16(view, start, littleEndian)
    for (let i = 0; i < count; i++) {
        const entryOffset = start + 2 + i * 12
        if (entryOffset + 12 > view.byteLength) break

        entries.set(readUint16(view, entryOffset, littleEndian), {
            type: readUint16(view, entryOffset + 2, littleEndian),
            count: readUint32(view, entryOffset + 4, littleEndian),
            valueOffset: readUint32(view, entryOffset + 8, littleEndian),
            entryOffset,
        })
    }

    return entries
}

function readLongValue(
    view: DataView,
    tiffStart: number,
    entry: IfdEntry,
    littleEndian: boolean
): number | null {
    if (entry.type === 3 && entry.count === 1) {
        return readUint16(view, entry.entryOffset + 8, littleEndian)
    }
    if (entry.type === 4 && entry.count === 1) {
        return entry.valueOffset
    }

    const valueOffset = resolveValueOffset(view, tiffStart, entry)
    return valueOffset === null ? null : readUint32(view, valueOffset, littleEndian)
}

function readAsciiValue(
    view: DataView,
    tiffStart: number,
    entry: IfdEntry | undefined
): string | null {
    if (!entry || entry.type !== 2 || entry.count < 1) return null

    const valueOffset = resolveValueOffset(view, tiffStart, entry)
    if (valueOffset === null) return null

    return readAscii(view, valueOffset, entry.count).replace(/\0+$/, '').trim().toUpperCase()
}

function readRationalArray(
    view: DataView,
    tiffStart: number,
    entry: IfdEntry | undefined,
    littleEndian: boolean
): number[] {
    if (!entry || entry.type !== 5 || entry.count < 1) return []

    const valueOffset = resolveValueOffset(view, tiffStart, entry)
    if (valueOffset === null) return []

    const values: number[] = []
    for (let i = 0; i < entry.count; i++) {
        const offset = valueOffset + i * 8
        if (offset + 8 > view.byteLength) break

        const numerator = readUint32(view, offset, littleEndian)
        const denominator = readUint32(view, offset + 4, littleEndian)
        values.push(denominator === 0 ? Number.NaN : numerator / denominator)
    }

    return values
}

function resolveValueOffset(view: DataView, tiffStart: number, entry: IfdEntry): number | null {
    const typeSize = TYPE_SIZES[entry.type]
    if (!typeSize) return null

    const totalSize = typeSize * entry.count
    const valueOffset = totalSize <= 4 ? entry.entryOffset + 8 : tiffStart + entry.valueOffset

    if (valueOffset < 0 || valueOffset + totalSize > view.byteLength) return null
    return valueOffset
}

function toDecimalDegrees(parts: number[], ref: string): number {
    const sign = ref === 'S' || ref === 'W' ? -1 : 1
    return sign * (parts[0] + parts[1] / 60 + parts[2] / 3600)
}

function isTiffHeader(view: DataView, offset: number): boolean {
    if (offset + 4 > view.byteLength) return false
    const endian = readAscii(view, offset, 2)
    return (endian === 'II' && view.getUint16(offset + 2, true) === 42) ||
        (endian === 'MM' && view.getUint16(offset + 2, false) === 42)
}

function readEndian(view: DataView, tiffStart: number): boolean | null {
    const endian = readAscii(view, tiffStart, 2)
    if (endian === 'II') return true
    if (endian === 'MM') return false
    return null
}

function readAscii(view: DataView, offset: number, length: number): string {
    if (offset < 0 || offset + length > view.byteLength) return ''

    let value = ''
    for (let i = 0; i < length; i++) {
        value += String.fromCharCode(view.getUint8(offset + i))
    }
    return value
}

function readUint16(view: DataView, offset: number, littleEndian: boolean): number {
    return view.getUint16(offset, littleEndian)
}

function readUint32(view: DataView, offset: number, littleEndian: boolean): number {
    return view.getUint32(offset, littleEndian)
}
