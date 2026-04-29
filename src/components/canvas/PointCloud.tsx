'use client'

import { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useLoader, useFrame } from '@react-three/fiber'
import { PLYLoader } from 'three-stdlib'
import { useStore } from '@/store'

import './MemoryShaderMaterial'

interface PointCloudProps {
    url: string
    traceIndices?: number[]
    position?: [number, number, number]
    scale?: number
    opacity?: number
    disableClientSampling?: boolean
    onClick?: () => void
}

export function PointCloud({
    url,
    traceIndices = [],
    position = [0, 0, 0],
    scale = 1,
    opacity = 1,
    disableClientSampling = false,
    onClick
}: PointCloudProps) {
    const geometry = useLoader(PLYLoader, url)
    const materialRef = useRef<THREE.ShaderMaterial>(null)

    // Read sampling and point size from store
    const samplePercent = useStore((s) => s.samplePercent)
    const effectiveSamplePercent = disableClientSampling ? 100 : samplePercent
    const pointSize = useStore((s) => s.pointSize)

    // Build geometry, applying sampling if needed
    const { processedGeometry, totalCount, renderedCount } = useMemo(() => {
        const posAttr = geometry.getAttribute('position')
        if (!posAttr) return {
            processedGeometry: geometry,
            center: [0, 0, 0] as [number, number, number],
            totalCount: 0,
            renderedCount: 0,
        }

        const totalCount = posAttr.count
        const stride = effectiveSamplePercent >= 100 ? 1 : Math.max(1, Math.round(100 / effectiveSamplePercent))
        const sampledCount = Math.ceil(totalCount / stride)

        const geo = new THREE.BufferGeometry()

        if (stride === 1) {
            // Full resolution — share buffers (zero copy)
            geo.setAttribute('position', posAttr)
            const colorAttr = geometry.getAttribute('color')
            if (colorAttr) geo.setAttribute('color', colorAttr)
        } else {
            // Subsampled — create new smaller buffers
            const srcPos = posAttr.array as Float32Array
            const newPos = new Float32Array(sampledCount * 3)

            const colorAttr = geometry.getAttribute('color')
            const srcColor = colorAttr ? (colorAttr.array as Float32Array) : null
            const newColor = srcColor ? new Float32Array(sampledCount * 3) : null

            let out = 0
            for (let i = 0; i < totalCount; i += stride) {
                newPos[out * 3] = srcPos[i * 3]
                newPos[out * 3 + 1] = srcPos[i * 3 + 1]
                newPos[out * 3 + 2] = srcPos[i * 3 + 2]
                if (newColor && srcColor) {
                    newColor[out * 3] = srcColor[i * 3]
                    newColor[out * 3 + 1] = srcColor[i * 3 + 1]
                    newColor[out * 3 + 2] = srcColor[i * 3 + 2]
                }
                out++
            }

            geo.setAttribute('position', new THREE.BufferAttribute(newPos, 3))
            if (newColor) geo.setAttribute('color', new THREE.BufferAttribute(newColor, 3))
        }

        // Trace mask
        const count = geo.getAttribute('position').count
        const traceMask = new Float32Array(count)
        if (traceIndices.length > 0) {
            for (const idx of traceIndices) {
                if (idx < count) traceMask[idx] = 1
            }
        }
        geo.setAttribute('aTraceMask', new THREE.BufferAttribute(traceMask, 1))

        return {
            processedGeometry: geo,
            totalCount,
            renderedCount: count,
        }
    }, [geometry, traceIndices, effectiveSamplePercent])

    // Update stats in store (in effect, not during render)
    useEffect(() => {
        useStore.getState().set({ totalPoints: totalCount, renderedPoints: renderedCount })
    }, [totalCount, renderedCount])

    // Dispose sampled geometry on unmount or change
    useEffect(() => {
        return () => {
            if (processedGeometry !== geometry) {
                processedGeometry.dispose()
            }
        }
    }, [processedGeometry, geometry])

    // Update uniforms every frame
    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime()
            materialRef.current.uniforms.uPixelRatio.value = state.gl.getPixelRatio()
            materialRef.current.uniforms.uSize.value = pointSize
        }
    })

    return (
        <group position={position}>
            <points
                scale={scale}
                onClick={onClick}
                onPointerOver={onClick ? () => { document.body.style.cursor = 'pointer' } : undefined}
                onPointerOut={onClick ? () => { document.body.style.cursor = 'auto' } : undefined}
            >
                <primitive object={processedGeometry} />
                {/* @ts-expect-error Custom shader material is registered at runtime. */}
                <memoryShaderMaterial
                    ref={materialRef}
                    transparent
                    depthWrite={false}
                    vertexColors
                    opacity={opacity}
                    blending={THREE.NormalBlending}
                />
            </points>
        </group>
    )
}
