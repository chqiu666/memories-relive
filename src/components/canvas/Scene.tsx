'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Suspense } from 'react'
import { useStore } from '@/store'
import { PointCloud } from './PointCloud'
import memories from '@/data/memories.json'

function SceneContent() {
    const { viewMode, activeMemoryId, set } = useStore((s) => s)
    const activeMemory = memories.find((m) => m.id === activeMemoryId)

    // Gallery layout
    const GRID_COLS = 3
    const GRID_SPACING = 3

    return (
        <>
            <OrbitControls makeDefault enableDamping dampingFactor={0.05} />

            {/* GALLERY MODE */}
            {viewMode === 'grid' && (
                <group>
                    {memories.map((mem, i) => {
                        const row = Math.floor(i / GRID_COLS)
                        const col = i % GRID_COLS
                        const x = (col - (GRID_COLS - 1) / 2) * GRID_SPACING
                        const y = -(row - (Math.ceil(memories.length / GRID_COLS) - 1) / 2) * GRID_SPACING
                        const modelSrc = mem.timeline[mem.timeline.length - 1].modelSrc

                        return (
                            <group key={mem.id} position={[x, y, 0]}>
                                <PointCloud
                                    url={modelSrc}
                                    scale={0.3}
                                    opacity={0.9}
                                    onClick={() => set({ viewMode: 'detail', activeMemoryId: mem.id })}
                                />
                            </group>
                        )
                    })}
                </group>
            )}

            {/* DETAIL MODE */}
            {viewMode === 'detail' && activeMemory && (
                <group>
                    <PointCloud
                        url={activeMemory.timeline[activeMemory.timeline.length - 1].modelSrc}
                        opacity={1}
                    />
                </group>
            )}
        </>
    )
}

export default function Scene() {
    return (
        <Canvas
            camera={{ position: [0, 0, 15], fov: 50, near: 0.1, far: 1000 }}
            style={{ background: '#0a0a0a' }}
            dpr={[1, 2]}
            gl={{ antialias: true }}
        >
            <Suspense fallback={null}>
                <SceneContent />
            </Suspense>
        </Canvas>
    )
}
