declare module 'heic-convert' {
    import type { Buffer } from 'node:buffer'

    type ConvertFormat = 'JPEG' | 'PNG'
    type ConvertInput = Buffer | ArrayBuffer | Uint8Array

    interface ConvertOptions {
        buffer: ConvertInput
        format: ConvertFormat
        quality?: number
    }

    function convert(options: ConvertOptions): Promise<ArrayBuffer | Uint8Array>

    namespace convert {
        function all(options: ConvertOptions): Promise<ArrayBuffer[] | Uint8Array[]>
    }

    export = convert
}
