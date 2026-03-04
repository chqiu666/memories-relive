'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { Suspense } from 'react'
import { useStore } from '@/store'
import { PointCloud } from './PointCloud'
import { HighlightPointCloud } from './HighlightPointCloud'
import { CoordPicker } from './CoordPicker'
import { InfoTile } from './InfoTile'
import { FpsMonitor } from './FpsMonitor'
import memories from '@/data/memories.json'

/** Derive the hl- URL from a base model URL, e.g. /models/foo.ply → /models/hl-foo.ply */
function getHlUrl(baseUrl: string): string {
    const parts = baseUrl.split('/')
    const filename = parts.pop()!
    return [...parts, `hl-${filename}`].join('/')
}

function SceneContent() {
    const { activeMemoryId } = useStore((s) => s)
    const activeMemory = memories.find((m) => m.id === activeMemoryId)

    if (!activeMemory) return null

    const hlUrl = getHlUrl(activeMemory.modelSrc)
    const tiles = (activeMemory as any).tiles as { position: [number, number, number]; label: string }[] | undefined

    return (
        <>
            <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
            <PointCloud url={activeMemory.modelSrc} opacity={1} />
            <HighlightPointCloud url={hlUrl} />
            {tiles?.map((tile, i) => (
                <InfoTile
                    key={`tile-${i}`}
                    position={tile.position}
                    label={tile.label}
                    index={i}
                />
            ))}
            <EffectComposer>
                <Bloom
                    intensity={0.4}
                    luminanceThreshold={0.6}
                    luminanceSmoothing={0.4}
                    mipmapBlur
                />
            </EffectComposer>
            <CoordPicker />
            <FpsMonitor />
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
