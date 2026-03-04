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
    /** Optional forced expansion direction: 'up' | 'down' */
    forceDir?: 'up' | 'down'
}

// Vertical offset from anchor to tile (px)
const LINE_LENGTH = 55

/**
 * 3D-anchored info tile:
 * - Straight vertical connector line (upward)
 * - Glass-morphic style matching Gallery/ⓘ button
 * - Click to expand with scrollable portrait card
 * - Anchor dot in matching glass style
 */
export function InfoTile({ id, position, label, description, forceDir }: InfoTileProps) {
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
            const el = document.querySelector(`[data-tile-id="${id}"]`)
            if (el && !el.contains(e.target as Node)) {
                useStore.getState().set({ activeTileId: null })
            }
        }
        const timer = setTimeout(() => document.addEventListener('pointerdown', handle), 60)
        return () => { clearTimeout(timer); document.removeEventListener('pointerdown', handle) }
    }, [isExpanded, id])

    // Capture wheel inside expanded tile
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

    // Decide direction: forced > auto (up default, down if near top)
    let goUp: boolean
    if (forceDir) {
        goUp = forceDir === 'up'
    } else {
        const projected = new THREE.Vector3(...position).project(camera)
        const sy = (-projected.y * 0.5 + 0.5) * size.height
        goUp = sy > 180
    }

    const dy = goUp ? -LINE_LENGTH : LINE_LENGTH

    // Shared glass style tokens (matching Gallery/ⓘ button)
    const glassStyle = {
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
    }

    const glassStyleHover = {
        ...glassStyle,
        background: 'rgba(255,255,255,0.1)',
    }

    return (
        <group ref={groupRef} position={position}>
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
                    data-tile-id={id}
                    style={{
                        position: 'relative',
                        width: 0,
                        height: 0,
                    }}
                >
                    {/* Glass anchor dot — matching button style */}
                    <div style={{
                        position: 'absolute',
                        left: '-5px',
                        top: '-5px',
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        ...glassStyle,
                        boxShadow: '0 0 6px rgba(255,255,255,0.1)',
                        pointerEvents: 'none',
                    }} />

                    {/* Vertical connector line */}
                    <div style={{
                        position: 'absolute',
                        left: '-0.5px',
                        top: goUp ? `${dy}px` : '0px',
                        width: '1px',
                        height: `${LINE_LENGTH}px`,
                        background: 'rgba(255,255,255,0.15)',
                        pointerEvents: 'none',
                    }} />

                    {/* Tile card — positioned at end of vertical line */}
                    <div
                        style={{
                            position: 'absolute',
                            left: '0px',
                            top: `${dy}px`,
                            transform: `translate(-50%, ${goUp ? '-100%' : '0'})`,
                        }}
                    >
                        <div
                            onClick={toggleExpand}
                            style={{
                                ...(isExpanded ? glassStyleHover : glassStyle),
                                borderRadius: '10px',
                                boxShadow: isExpanded
                                    ? '0 8px 32px rgba(0,0,0,0.4)'
                                    : '0 2px 8px rgba(0,0,0,0.2)',
                                padding: isExpanded ? '12px 14px' : '5px 10px',
                                width: isExpanded ? '190px' : 'auto',
                                cursor: 'pointer',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                userSelect: 'none' as const,
                                color: 'rgba(255,255,255,0.6)',
                            }}
                        >
                            {/* Label */}
                            <span style={{
                                display: 'block',
                                color: isExpanded
                                    ? 'rgba(255,255,255,0.9)'
                                    : 'rgba(255,255,255,0.6)',
                                fontWeight: 500,
                                letterSpacing: '0.04em',
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
                                            maxHeight: '150px',
                                            overflowY: 'auto',
                                            paddingRight: '2px',
                                            scrollbarWidth: 'thin' as const,
                                            scrollbarColor: 'rgba(255,255,255,0.12) transparent',
                                        }}
                                        onWheel={(e) => e.stopPropagation()}
                                    >
                                        <p style={{
                                            fontSize: '10px',
                                            lineHeight: '1.75',
                                            color: 'rgba(255,255,255,0.4)',
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
