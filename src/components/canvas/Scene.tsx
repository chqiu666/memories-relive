'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Preload } from '@react-three/drei'
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing'
import { useStore } from '@/store'
import { PointCloud } from './PointCloud'
import { TraceLabel } from './TraceLabel'
import memories from '@/data/memories.json'

export default function Scene() {
    const { viewMode, activeMemoryId, timeState, set } = useStore((state) => state)

    // Gallery Layout Constants
    const GRID_COLS = 3
    const GRID_SPACING = 3

    // Get active memory for detail view
    const activeMemory = memories.find(m => m.id === activeMemoryId)

    // Time Evolution Logic
    // If we have an active memory with timeline, we might need to load multiple models
    const timeline = activeMemory?.timeline || []
    const isEvolution = activeMemory?.type === 'evolution' && timeline.length > 1

    // Helper to get opacity for evolution
    const getOpacity = (index: number) => {
        if (!isEvolution) return 1
        // Simple 2-state crossfade for V1 (Item 0 -> Item 1)
        // If timeState is 0, item 0 is opaque. if 1, item 1 is opaque.
        if (index === 0) return 1 - timeState
        if (index === 1) return timeState
        return 0
    }

    return (
        <Canvas
            camera={{ position: [0, 0, 5], fov: 45 }}
            style={{ background: '#050505' }}
            dpr={[1, 2]}
        >
            <OrbitControls makeDefault enableDamping />

            {/* GALLERY MODE */}
            {viewMode === 'grid' && (
                <group>
                    {memories.map((mem, i) => {
                        const row = Math.floor(i / GRID_COLS)
                        const col = i % GRID_COLS
                        const x = (col - (GRID_COLS - 1) / 2) * GRID_SPACING
                        const y = -(row - (Math.ceil(memories.length / GRID_COLS) - 1) / 2) * GRID_SPACING

                        // Show thumbnail model (last state or first? Let's show last)
                        const modelState = mem.timeline[mem.timeline.length - 1]

                        return (
                            <group key={mem.id} position={[x, y, 0]}>
                                <PointCloud
                                    url={modelState.modelSrc}
                                    scale={0.5}
                                    opacity={0.8}
                                    onClick={() => set({ viewMode: 'detail', activeMemoryId: mem.id })}
                                />
                                {/* Label for grid item? Maybe simple HTML */}
                            </group>
                        )
                    })}
                </group>
            )}

            {/* DETAIL MODE */}
            {viewMode === 'detail' && activeMemory && (
                <group>
                    {/* Render Timeline Models with Cross-fade */}
                    {timeline.map((state, i) => {
                        // Only render relevant states for evolution (first 2 for now as per V1 req)
                        if (isEvolution && i > 1) return null
                        if (!isEvolution && i !== timeline.length - 1) return null // Show only latest if not evolution

                        const opacity = getOpacity(i)
                        if (opacity <= 0.01) return null

                        return (
                            <group key={i}>
                                <PointCloud
                                    url={state.modelSrc}
                                    opacity={opacity}
                                    // Highlight traces only if opaque enough and is the active state?
                                    // Let's show traces for the "dominant" state
                                    traceIndices={opacity > 0.5 && state.traces ? state.traces.flatMap(t => t.pointIndices) : []}
                                />

                                {/* Traces Overlays - Only if visible */}
                                {opacity > 0.5 && state.traces?.map((trace: any, k: number) => (
                                    <TraceLabel
                                        key={`${i}-${k}`}
                                        position={trace.position as [number, number, number]}
                                        label={trace.label}
                                        description={trace.description}
                                    />
                                ))}
                            </group>
                        )
                    })}
                </group>
            )}

            {/* <EffectComposer>
                <Bloom luminanceThreshold={0.2} mipmapBlur intensity={0.5} />
                <Noise opacity={0.05} />
                <Vignette eskil={false} offset={0.1} darkness={1.1} />
            </EffectComposer> */}

            <Preload all />
        </Canvas>
    )
}
