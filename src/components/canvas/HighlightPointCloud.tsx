'use client'

import { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useLoader, useFrame } from '@react-three/fiber'
import { PLYLoader } from 'three-stdlib'
import { useStore } from '@/store'

import './HighlightShaderMaterial'

interface HighlightPointCloudProps {
    url: string
    position?: [number, number, number]
    scale?: number
}

export function HighlightPointCloud({
    url,
    position = [0, 0, 0],
    scale = 1,
}: HighlightPointCloudProps) {
    const geometry = useLoader(PLYLoader, url)
    const materialRef = useRef<THREE.ShaderMaterial>(null)

    const hlFullSample = useStore((s) => s.hlFullSample)
    const samplePercent = useStore((s) => s.samplePercent)
    const pointSize = useStore((s) => s.pointSize)
    const hlGlowIntensity = useStore((s) => s.hlGlowIntensity)


    const effectiveSample = hlFullSample ? 100 : samplePercent

    const processedGeometry = useMemo(() => {
        const posAttr = geometry.getAttribute('position')
        if (!posAttr) return geometry

        const totalCount = posAttr.count
        const stride = effectiveSample >= 100 ? 1 : Math.max(1, Math.round(100 / effectiveSample))
        const sampledCount = Math.ceil(totalCount / stride)

        const geo = new THREE.BufferGeometry()

        if (stride === 1) {
            geo.setAttribute('position', posAttr)
            const colorAttr = geometry.getAttribute('color')
            if (colorAttr) geo.setAttribute('color', colorAttr)
        } else {
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

        return geo
    }, [geometry, effectiveSample])

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
            materialRef.current.uniforms.uBrightness.value = hlGlowIntensity
        }
    })

    return (
        <group position={position}>
            <points
                scale={scale}
                renderOrder={1}
            >
                <primitive object={processedGeometry} />
                {/* @ts-ignore */}
                <highlightShaderMaterial
                    ref={materialRef}
                    transparent
                    depthWrite={false}
                    depthTest
                    vertexColors
                    blending={THREE.NormalBlending}
                />
            </points>
        </group>
    )
}
