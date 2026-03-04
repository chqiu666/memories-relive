'use client'

import { useRef, useEffect, useCallback } from 'react'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useStore } from '@/store'

interface InfoTileProps {
    /** Unique ID for this tile */
    id: string
    /** World-space position where this tile is anchored */
    position: [number, number, number]
    /** Short label for the tile */
    label: string
    /** Description text shown when expanded */
    description?: string
}

/**
 * A 3D-anchored info tile:
 * - Fixed screen size (no distanceFactor → doesn't scale with zoom)
 * - Click to expand / click outside or another tile to collapse
 * - Scrollable description content
 * - Dot-product visibility (front=show, back=hide)
 * - Edge-aware expansion direction
 * - Glass-morphic style with backdrop-blur
 */
export function InfoTile({ id, position, label, description }: InfoTileProps) {
    const groupRef = useRef<THREE.Group>(null)
    const visRef = useRef(1)
    const dirRef = useRef<'right' | 'left'>('right')
    const containerRef = useRef<HTMLDivElement>(null)
    const { camera, size } = useThree()

    const activeTileId = useStore((s) => s.activeTileId)
    const isExpanded = activeTileId === id

    const toggleExpand = useCallback(() => {
        const store = useStore.getState()
        store.set({ activeTileId: store.activeTileId === id ? null : id })
    }, [id])

    // Close when clicking outside
    useEffect(() => {
        if (!isExpanded) return

        const handleOutsideClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                useStore.getState().set({ activeTileId: null })
            }
        }

        // Delay to avoid immediate close from the click that opened it
        const timer = setTimeout(() => {
            document.addEventListener('pointerdown', handleOutsideClick)
        }, 50)

        return () => {
            clearTimeout(timer)
            document.removeEventListener('pointerdown', handleOutsideClick)
        }
    }, [isExpanded])

    // Per-frame: visibility + expansion direction
    useFrame(() => {
        if (!groupRef.current) return

        const tileWorldPos = new THREE.Vector3(...position)
        const camPos = camera.position.clone()
        const toTile = tileWorldPos.clone().sub(camPos).normalize()
        const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
        const dot = camForward.dot(toTile)

        visRef.current = THREE.MathUtils.smoothstep(dot, 0.0, 0.5)

        // Only update direction at edge boundaries
        const projected = tileWorldPos.clone().project(camera)
        const screenX = (projected.x * 0.5 + 0.5) * size.width
        const cur = dirRef.current
        const tileW = 300

        if (cur === 'right' && size.width - screenX < tileW + 80) {
            dirRef.current = 'left'
        } else if (cur === 'left' && screenX < tileW + 80) {
            dirRef.current = 'right'
        }
    })

    const vis = visRef.current
    if (vis < 0.01) return null

    const dir = dirRef.current

    return (
        <group ref={groupRef} position={position}>
            {/* Dot marker */}
            <mesh>
                <sphereGeometry args={[0.015, 8, 8]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={vis * 0.6} />
            </mesh>

            <Html
                center
                // No distanceFactor → constant screen size
                style={{
                    pointerEvents: vis > 0.3 ? 'auto' : 'none',
                    opacity: vis,
                    transition: 'opacity 0.2s ease',
                }}
                zIndexRange={[50, 0]}
            >
                <div
                    ref={containerRef}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        flexDirection: dir === 'right' ? 'row' : 'row-reverse',
                        gap: '0px',
                    }}
                >
                    {/* Connector line */}
                    <div style={{
                        width: '16px',
                        height: '1px',
                        backgroundColor: 'rgba(255,255,255,0.25)',
                        flexShrink: 0,
                    }} />

                    {/* Tile card */}
                    <div
                        onClick={toggleExpand}
                        style={{
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            background: isExpanded
                                ? 'rgba(20, 20, 20, 0.9)'
                                : 'rgba(20, 20, 20, 0.75)',
                            border: `1px solid ${isExpanded
                                ? 'rgba(255,255,255,0.2)'
                                : 'rgba(255,255,255,0.08)'}`,
                            borderRadius: '8px',
                            boxShadow: isExpanded
                                ? '0 8px 32px rgba(0,0,0,0.5)'
                                : '0 2px 8px rgba(0,0,0,0.3)',
                            padding: isExpanded ? '12px 16px' : '5px 10px',
                            width: isExpanded ? '280px' : 'auto',
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
                                : 'rgba(255,255,255,0.75)',
                            fontWeight: 600,
                            letterSpacing: '0.03em',
                            fontSize: isExpanded ? '13px' : '11px',
                            whiteSpace: isExpanded ? 'normal' : 'nowrap',
                            transition: 'all 0.3s ease',
                        }}>
                            {label}
                        </span>

                        {/* Description — expanded only */}
                        {description && (
                            <div style={{
                                overflow: 'hidden',
                                maxHeight: isExpanded ? '300px' : '0px',
                                opacity: isExpanded ? 1 : 0,
                                transition: 'max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease',
                                marginTop: isExpanded ? '8px' : '0px',
                            }}>
                                <div style={{
                                    maxHeight: '120px',
                                    overflowY: 'auto',
                                    paddingRight: '4px',
                                }}>
                                    <p style={{
                                        fontSize: '11px',
                                        lineHeight: '1.7',
                                        color: 'rgba(255,255,255,0.5)',
                                        margin: 0,
                                    }}>
                                        {description}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Html>
        </group>
    )
}
