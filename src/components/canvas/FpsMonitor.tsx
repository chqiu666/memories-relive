'use client'

import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useStore } from '@/store'

/**
 * Invisible component that runs every frame to track FPS
 * and detect renderer type.
 */
export function FpsMonitor() {
    const { gl } = useThree()
    const frames = useRef(0)
    const lastTime = useRef(performance.now())
    const store = useStore

    // Detect renderer type once
    const detectedRef = useRef(false)
    if (!detectedRef.current) {
        detectedRef.current = true
        // WebGPURenderer has .isWebGPURenderer flag
        const isWebGPU = !!(gl as any).isWebGPURenderer
        store.getState().set({ rendererType: isWebGPU ? 'WebGPU' : 'WebGL' })
    }

    useFrame(() => {
        frames.current++
        const now = performance.now()
        const elapsed = now - lastTime.current

        // Update FPS every 500ms
        if (elapsed >= 500) {
            const fps = Math.round((frames.current * 1000) / elapsed)
            store.getState().set({ fps })
            frames.current = 0
            lastTime.current = now
        }
    })

    return null
}
