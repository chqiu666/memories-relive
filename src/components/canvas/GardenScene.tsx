'use client'

import { useMemo, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { Canvas, useLoader, useFrame, useThree, ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import { PLYLoader } from 'three-stdlib'
import { useStore } from '@/store'
import memories from '@/data/memories.json'

import '../canvas/MemoryShaderMaterial'

/** Single draggable point cloud in the garden */
function GardenCloud({
    url,
    initialPosition,
    memId,
    title,
    onDragStart,
    onDragEnd,
}: {
    url: string
    initialPosition: [number, number, number]
    memId: string
    title: string
    onDragStart: () => void
    onDragEnd: () => void
}) {
    const geometry = useLoader(PLYLoader, url)
    const materialRef = useRef<THREE.ShaderMaterial>(null)
    const groupRef = useRef<THREE.Group>(null)
    const [pos, setPos] = useState<[number, number, number]>(initialPosition)
    const isDragging = useRef(false)
    const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0))
    const dragOffset = useRef(new THREE.Vector3())
    const { camera, raycaster } = useThree()

    const { processedGeometry, center } = useMemo(() => {
        const posAttr = geometry.getAttribute('position')
        if (!posAttr) return { processedGeometry: geometry, center: [0, 0, 0] as [number, number, number] }

        const totalCount = posAttr.count
        const stride = 10
        const sampledCount = Math.ceil(totalCount / stride)

        const geo = new THREE.BufferGeometry()
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

        const traceMask = new Float32Array(out)
        geo.setAttribute('aTraceMask', new THREE.BufferAttribute(traceMask, 1))

        geo.computeBoundingBox()
        const box = geo.boundingBox!
        const cx = (box.min.x + box.max.x) / 2
        const cy = (box.min.y + box.max.y) / 2
        const cz = (box.min.z + box.max.z) / 2

        return {
            processedGeometry: geo,
            center: [-cx, -cy, -cz] as [number, number, number],
        }
    }, [geometry])

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime()
            materialRef.current.uniforms.uPixelRatio.value = state.gl.getPixelRatio()
            materialRef.current.uniforms.uSize.value = 0.08
        }
    })

    const handleNavigate = useCallback(() => {
        useStore.getState().set({ viewMode: 'detail', activeMemoryId: memId })
    }, [memId])

    // Drag handlers
    const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        isDragging.current = true
        onDragStart()

        // Set drag plane at the object's Y height
        dragPlane.current.set(new THREE.Vector3(0, 1, 0), -pos[1])

        // Calculate offset between intersection point and object position
        const intersect = new THREE.Vector3()
        raycaster.ray.intersectPlane(dragPlane.current, intersect)
        dragOffset.current.set(pos[0] - intersect.x, 0, pos[2] - intersect.z)

            // Capture pointer
            ; (e.target as HTMLElement)?.setPointerCapture?.(e.nativeEvent.pointerId)
    }, [pos, raycaster, onDragStart])

    const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
        if (!isDragging.current) return
        e.stopPropagation()

        const intersect = new THREE.Vector3()
        raycaster.ray.intersectPlane(dragPlane.current, intersect)

        setPos([
            intersect.x + dragOffset.current.x,
            pos[1],
            intersect.z + dragOffset.current.z,
        ])
    }, [pos, raycaster])

    const handlePointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
        if (!isDragging.current) return
        isDragging.current = false
        onDragEnd()
    }, [onDragEnd])

    return (
        <group
            ref={groupRef}
            position={pos}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
        >
            {/* Invisible drag hitbox — larger than the point cloud for easier grabbing */}
            <mesh visible={false}>
                <boxGeometry args={[5, 4, 5]} />
                <meshBasicMaterial />
            </mesh>

            <points position={center}>
                <primitive object={processedGeometry} />
                {/* @ts-ignore */}
                <memoryShaderMaterial
                    ref={materialRef}
                    transparent
                    depthWrite={false}
                    vertexColors
                    opacity={1}
                    blending={THREE.NormalBlending}
                />
            </points>

            {/* Floating glass button */}
            <Html
                center
                position={[0, 2.5, 0]}
                zIndexRange={[50, 0]}
            >
                <button
                    onClick={handleNavigate}
                    style={{
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '20px',
                        padding: '6px 16px',
                        color: 'rgba(255,255,255,0.6)',
                        fontSize: '11px',
                        fontWeight: 500,
                        letterSpacing: '0.04em',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.3s ease',
                        userSelect: 'none',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                        e.currentTarget.style.color = 'rgba(255,255,255,0.9)'
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                        e.currentTarget.style.color = 'rgba(255,255,255,0.6)'
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                    }}
                >
                    {title}
                </button>
            </Html>
        </group>
    )
}

/** Tighter positions — closer together */
const GARDEN_POSITIONS: [number, number, number][] = [
    [-4, 0, -1],
    [0, 0, 2],
    [4, 0, -1],
]

function GardenContent() {
    const controlsRef = useRef<any>(null)

    const disableOrbit = useCallback(() => {
        if (controlsRef.current) controlsRef.current.enabled = false
    }, [])

    const enableOrbit = useCallback(() => {
        if (controlsRef.current) controlsRef.current.enabled = true
    }, [])

    return (
        <>
            <OrbitControls ref={controlsRef} makeDefault enableDamping dampingFactor={0.05} />
            {memories.map((mem, i) => (
                <GardenCloud
                    key={mem.id}
                    url={mem.modelSrc}
                    initialPosition={GARDEN_POSITIONS[i] || [i * 5, 0, 0]}
                    memId={mem.id}
                    title={mem.title}
                    onDragStart={disableOrbit}
                    onDragEnd={enableOrbit}
                />
            ))}
        </>
    )
}

export default function GardenScene() {
    return (
        <Canvas
            camera={{ position: [0, 5, 20], fov: 50, near: 0.1, far: 1000 }}
            style={{ background: '#0a0a0a' }}
            dpr={[1, 2]}
        >
            <GardenContent />
        </Canvas>
    )
}
