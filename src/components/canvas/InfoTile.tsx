'use client'

import { useRef, useEffect, useCallback } from 'react'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useStore } from '@/store'

interface InfoTileProps {
    id: string
    position: [number, number, number]
    label: string
    description?: string
}

// Offset distance from anchor point to tile (px)
const LINE_LENGTH = 60

/**
 * 3D-anchored info tile with:
 * - Corner expansion (upper-left default, edge-aware)
 * - Connector line with distance from anchor
 * - Portrait ratio card (height > width)
 * - Click to expand, scrollable content (wheel captured)
 * - Glass-morphic backdrop-blur
 * - Constant screen size
 */
export function InfoTile({ id, position, label, description }: InfoTileProps) {
    const groupRef = useRef<THREE.Group>(null)
    const visRef = useRef(1)
    const scrollRef = useRef<HTMLDivElement>(null)
    const { camera, size } = useThree()

    const activeTileId = useStore((s) => s.activeTileId)
    const isExpanded = activeTileId === id

    const toggleExpand = useCallback((e: React.MouseEvent) => {
        e.stopPropagation()
        const store = useStore.getState()
        store.set({ activeTileId: store.activeTileId === id ? null : id })
    }, [id])

    // Close on outside click
    useEffect(() => {
        if (!isExpanded) return
        const handle = (e: MouseEvent) => {
            const el = scrollRef.current?.closest('[data-tile-root]')
            if (el && !el.contains(e.target as Node)) {
                useStore.getState().set({ activeTileId: null })
            }
        }
        const timer = setTimeout(() => document.addEventListener('pointerdown', handle), 60)
        return () => { clearTimeout(timer); document.removeEventListener('pointerdown', handle) }
    }, [isExpanded])

    // Capture wheel inside expanded tile to prevent 3D zoom
    useEffect(() => {
        const el = scrollRef.current
        if (!el || !isExpanded) return
        const stop = (e: WheelEvent) => e.stopPropagation()
        el.addEventListener('wheel', stop, { passive: false })
        return () => el.removeEventListener('wheel', stop)
    }, [isExpanded])

    // Per-frame visibility
    useFrame(() => {
        if (!groupRef.current) return
        const tileWorldPos = new THREE.Vector3(...position)
        const toTile = tileWorldPos.clone().sub(camera.position).normalize()
        const camFwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
        visRef.current = THREE.MathUtils.smoothstep(camFwd.dot(toTile), 0.0, 0.5)
    })

    const vis = visRef.current
    if (vis < 0.01) return null

    // Determine corner direction based on screen position
    const projected = new THREE.Vector3(...position).project(camera)
    const sx = (projected.x * 0.5 + 0.5) * size.width
    const sy = (-projected.y * 0.5 + 0.5) * size.height

    // Pick corner: prefer upper-left, but flip if too close to edges
    const goLeft = sx > 200
    const goUp = sy > 200

    // Offset in px from anchor point
    const dx = goLeft ? -LINE_LENGTH : LINE_LENGTH
    const dy = goUp ? -LINE_LENGTH : LINE_LENGTH

    // Diagonal angle for the connector line
    const angle = Math.atan2(dy, dx)
    const lineLen = Math.sqrt(dx * dx + dy * dy)

    return (
        <group ref={groupRef} position={position}>
            {/* Anchor dot */}
            <mesh>
                <sphereGeometry args={[0.012, 8, 8]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={vis * 0.5} />
            </mesh>

            <Html
                center
                style={{
                    pointerEvents: vis > 0.3 ? 'auto' : 'none',
                    opacity: vis,
                    transition: 'opacity 0.2s ease',
                }}
                zIndexRange={[50, 0]}
            >
                <div
                    data-tile-root
                    style={{
                        position: 'relative',
                        width: 0,
                        height: 0,
                    }}
                >
                    {/* Diagonal connector line */}
                    <div style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: `${lineLen}px`,
                        height: '1px',
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        transformOrigin: '0 0',
                        transform: `rotate(${angle}rad)`,
                        pointerEvents: 'none',
                    }} />

                    {/* Tile card — offset at end of connector */}
                    <div
                        style={{
                            position: 'absolute',
                            left: `${dx}px`,
                            top: `${dy}px`,
                            // Align tile corner to line endpoint
                            transform: `translate(${goLeft ? '-100%' : '0'}, ${goUp ? '-100%' : '0'})`,
                            transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1), padding 0.3s ease',
                        }}
                    >
                        <div
                            onClick={toggleExpand}
                            style={{
                                backdropFilter: 'blur(14px)',
                                WebkitBackdropFilter: 'blur(14px)',
                                background: isExpanded
                                    ? 'rgba(15, 15, 15, 0.92)'
                                    : 'rgba(18, 18, 18, 0.8)',
                                border: `1px solid ${isExpanded
                                    ? 'rgba(255,255,255,0.18)'
                                    : 'rgba(255,255,255,0.08)'}`,
                                borderRadius: '8px',
                                boxShadow: isExpanded
                                    ? '0 12px 40px rgba(0,0,0,0.6)'
                                    : '0 2px 10px rgba(0,0,0,0.3)',
                                padding: isExpanded ? '14px 14px' : '5px 10px',
                                width: isExpanded ? '200px' : 'auto',
                                cursor: 'pointer',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                userSelect: 'none' as const,
                            }}
                        >
                            {/* Label */}
                            <span style={{
                                display: 'block',
                                color: isExpanded
                                    ? 'rgba(255,255,255,0.95)'
                                    : 'rgba(255,255,255,0.7)',
                                fontWeight: 600,
                                letterSpacing: '0.03em',
                                fontSize: isExpanded ? '12px' : '10px',
                                whiteSpace: isExpanded ? 'normal' : 'nowrap',
                                transition: 'all 0.3s ease',
                            }}>
                                {label}
                            </span>

                            {/* Description — scrollable */}
                            {description && (
                                <div style={{
                                    overflow: 'hidden',
                                    maxHeight: isExpanded ? '500px' : '0px',
                                    opacity: isExpanded ? 1 : 0,
                                    transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease',
                                    marginTop: isExpanded ? '8px' : '0px',
                                }}>
                                    <div
                                        ref={scrollRef}
                                        style={{
                                            maxHeight: '160px',
                                            overflowY: 'auto',
                                            paddingRight: '2px',
                                            // Thin scrollbar styling
                                            scrollbarWidth: 'thin' as const,
                                            scrollbarColor: 'rgba(255,255,255,0.15) transparent',
                                        }}
                                        onWheel={(e) => e.stopPropagation()}
                                    >
                                        <p style={{
                                            fontSize: '10px',
                                            lineHeight: '1.75',
                                            color: 'rgba(255,255,255,0.45)',
                                            margin: 0,
                                        }}>
                                            {description}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Html>
        </group>
    )
}
