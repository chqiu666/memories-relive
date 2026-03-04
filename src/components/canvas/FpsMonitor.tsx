'use client'

import { useRef, useEffect } from 'react'
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

    // Detect renderer type once — in useEffect, not during render
    useEffect(() => {
        const isWebGPU = !!(gl as any).isWebGPURenderer
        useStore.getState().set({ rendererType: isWebGPU ? 'WebGPU' : 'WebGL' })
    }, [gl])

    useFrame(() => {
        frames.current++
        const now = performance.now()
        const elapsed = now - lastTime.current

        // Update FPS every 500ms
        if (elapsed >= 500) {
            const fps = Math.round((frames.current * 1000) / elapsed)
            useStore.getState().set({ fps })
            frames.current = 0
            lastTime.current = now
        }
    })

    return null
}
