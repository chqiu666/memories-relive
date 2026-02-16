'use client'

import { useMemo, useRef, useLayoutEffect } from 'react'
import * as THREE from 'three'
import { useLoader, useFrame } from '@react-three/fiber'
import { PLYLoader } from 'three-stdlib'

import './MemoryShaderMaterial'

interface PointCloudProps {
    url: string
    traceIndices?: number[] // Indices to highlight
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

    // Process geometry to add custom attributes
    const processedGeometry = useMemo(() => {
        const geo = geometry.clone()

        // Ensure we have position attribute
        if (!geo.attributes.position) return geo

        const count = geo.attributes.position.count
        const traceMask = new Float32Array(count).fill(0)
        const random = new Float32Array(count)

        // Apply trace mask
        if (traceIndices.length > 0) {
            traceIndices.forEach(idx => {
                if (idx < count) traceMask[idx] = 1
            })
        }

        // Mock trace disabled

        // Fill random
        for (let i = 0; i < count; i++) {
            random[i] = Math.random()
        }

        geo.setAttribute('aTraceMask', new THREE.BufferAttribute(traceMask, 1))
        geo.setAttribute('aRandom', new THREE.BufferAttribute(random, 1))

        // Center geometry
        geo.center()

        return geo
    }, [geometry, traceIndices])

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime()
        }
    })

    return (
        <points
            position={position as any}
            scale={scale}
            onClick={onClick}
            onPointerOver={onClick ? () => document.body.style.cursor = 'pointer' : undefined}
            onPointerOut={onClick ? () => document.body.style.cursor = 'auto' : undefined}
        >
            <primitive object={processedGeometry} />
            {/* @ts-ignore */}
            <memoryShaderMaterial
                ref={materialRef}
                transparent
                depthWrite={false}
                opacity={opacity}
                uColor={new THREE.Color(0.1, 0.1, 0.2).multiplyScalar(opacity)} // Dim if transparent? Or just keep color.
                blending={THREE.NormalBlending}
            />
        </points>
    )
}
