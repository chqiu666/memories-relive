'use client'

import { useRef, useState } from 'react'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'

interface InfoTileProps {
    /** World-space position where this tile is anchored */
    position: [number, number, number]
    /** Short label for the tile */
    label: string
    /** Index for styling variation */
    index?: number
}

/**
 * A 3D-anchored info tile that:
 * - Sticks to a specific 3D point on the point cloud
 * - Fades/scales based on camera facing direction (visible from front, hidden from behind)
 * - Auto-expands toward available screen space
 * - Glass-morphic style matching the debug ⓘ button
 */
export function InfoTile({ position, label, index = 0 }: InfoTileProps) {
    const groupRef = useRef<THREE.Group>(null)
    const [hovered, setHovered] = useState(false)
    const [visibility, setVisibility] = useState(1)
    const [expandDir, setExpandDir] = useState<'right' | 'left' | 'up' | 'down'>('right')
    const { camera, size } = useThree()

    // Every frame: compute visibility (dot product) and best expansion direction
    useFrame(() => {
        if (!groupRef.current) return

        // Get world position of the tile
        const tileWorldPos = new THREE.Vector3(...position)

        // Camera to tile direction
        const camPos = camera.position.clone()
        const toTile = tileWorldPos.clone().sub(camPos).normalize()

        // Camera forward direction
        const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)

        // Dot product: 1 = directly ahead, -1 = behind
        const dot = camForward.dot(toTile)

        // Smooth visibility: fully visible above 0.3, fading between 0 and 0.3, hidden below 0
        const newVis = THREE.MathUtils.smoothstep(dot, 0.0, 0.5)
        setVisibility(newVis)

        // Project tile position to screen to determine expansion direction
        const projected = tileWorldPos.clone().project(camera)
        const screenX = (projected.x * 0.5 + 0.5) * size.width
        const screenY = (-projected.y * 0.5 + 0.5) * size.height

        // Choose direction based on available space
        const midX = size.width / 2
        const midY = size.height / 2

        // Primary: horizontal, secondary: vertical
        if (screenX < midX * 0.6) {
            setExpandDir('right')
        } else if (screenX > midX * 1.4) {
            setExpandDir('left')
        } else if (screenY < midY) {
            setExpandDir('down')
        } else {
            setExpandDir('up')
        }
    })

    // Don't render at all when fully hidden
    if (visibility < 0.01) return null

    // Transform classes based on expand direction
    const expandOffset = {
        right: 'left-5 top-1/2 -translate-y-1/2',
        left: 'right-5 top-1/2 -translate-y-1/2',
        down: 'top-5 left-1/2 -translate-x-1/2',
        up: 'bottom-5 left-1/2 -translate-x-1/2',
    }

    // Line connector direction
    const lineClass = {
        right: 'w-4 h-px left-0 top-1/2 -translate-x-full -translate-y-1/2',
        left: 'w-4 h-px right-0 top-1/2 translate-x-full -translate-y-1/2',
        down: 'h-4 w-px top-0 left-1/2 -translate-y-full -translate-x-1/2',
        up: 'h-4 w-px bottom-0 left-1/2 translate-y-full -translate-x-1/2',
    }

    return (
        <group ref={groupRef} position={position}>
            {/* Small dot marker at the anchor point */}
            <mesh>
                <sphereGeometry args={[0.015, 8, 8]} />
                <meshBasicMaterial
                    color="#ffffff"
                    transparent
                    opacity={visibility * 0.6}
                />
            </mesh>

            <Html
                center
                distanceFactor={8}
                style={{
                    pointerEvents: visibility > 0.3 ? 'auto' : 'none',
                    opacity: visibility,
                    transform: `scale(${0.5 + visibility * 0.5})`,
                    transition: 'opacity 0.15s ease, transform 0.15s ease',
                }}
                zIndexRange={[50, 0]}
            >
                <div className="relative" style={{ width: 0, height: 0 }}>
                    {/* Connector line */}
                    <div
                        className={`absolute bg-white/30 ${lineClass[expandDir]}`}
                    />

                    {/* The glass tile */}
                    <div
                        className={`absolute ${expandOffset[expandDir]} whitespace-nowrap`}
                        onMouseEnter={() => setHovered(true)}
                        onMouseLeave={() => setHovered(false)}
                    >
                        <div
                            className={`
                                backdrop-blur-md border rounded-lg shadow-xl
                                transition-all duration-300 ease-out cursor-default
                                ${hovered
                                    ? 'bg-white/15 border-white/25 shadow-white/5'
                                    : 'bg-white/5 border-white/10'
                                }
                            `}
                            style={{ padding: hovered ? '8px 14px' : '6px 12px' }}
                        >
                            <span className={`
                                text-white/80 font-medium tracking-wide
                                transition-all duration-300
                                ${hovered ? 'text-xs text-white/90' : 'text-[10px]'}
                            `}>
                                {label}
                            </span>
                        </div>
                    </div>
                </div>
            </Html>
        </group>
    )
}
