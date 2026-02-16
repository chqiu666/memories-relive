'use client'

import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useLoader, useFrame, useThree } from '@react-three/fiber'
import { PLYLoader } from 'three-stdlib'

import './MemoryShaderMaterial'

interface PointCloudProps {
    url: string
    traceIndices?: number[]
    position?: [number, number, number]
    scale?: number
    opacity?: number
    onClick?: () => void
}

export function PointCloud({
    url,
    traceIndices = [],
    position = [0, 0, 0],
    scale = 1,
    opacity = 1,
    onClick
}: PointCloudProps) {
    const geometry = useLoader(PLYLoader, url)
    const materialRef = useRef<THREE.ShaderMaterial>(null)
    const { viewport } = useThree()

    // Build a lightweight geometry that shares the heavy position/color buffers
    const { processedGeometry, center } = useMemo(() => {
        const geo = new THREE.BufferGeometry()

        const posAttr = geometry.getAttribute('position')
        if (!posAttr) return { processedGeometry: geometry, center: [0, 0, 0] as [number, number, number] }

        // Share heavy buffers (zero-copy)
        geo.setAttribute('position', posAttr)

        const colorAttr = geometry.getAttribute('color')
        if (colorAttr) {
            geo.setAttribute('color', colorAttr)
        }

        // Lightweight custom attribute
        const count = posAttr.count
        const traceMask = new Float32Array(count) // defaults to 0
        if (traceIndices.length > 0) {
            for (const idx of traceIndices) {
                if (idx < count) traceMask[idx] = 1
            }
        }
        geo.setAttribute('aTraceMask', new THREE.BufferAttribute(traceMask, 1))

        // Compute center offset without mutating the shared buffer
        geo.computeBoundingBox()
        const box = geo.boundingBox!
        const cx = (box.min.x + box.max.x) / 2
        const cy = (box.min.y + box.max.y) / 2
        const cz = (box.min.z + box.max.z) / 2

        return {
            processedGeometry: geo,
            center: [-cx, -cy, -cz] as [number, number, number]
        }
    }, [geometry, traceIndices])

    // Update uniforms every frame
    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime()
            materialRef.current.uniforms.uPixelRatio.value = state.gl.getPixelRatio()
        }
    })

    return (
        <group position={position}>
            <points
                position={center}
                scale={scale}
                onClick={onClick}
                onPointerOver={onClick ? () => { document.body.style.cursor = 'pointer' } : undefined}
                onPointerOut={onClick ? () => { document.body.style.cursor = 'auto' } : undefined}
            >
                <primitive object={processedGeometry} />
                {/* @ts-ignore */}
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
