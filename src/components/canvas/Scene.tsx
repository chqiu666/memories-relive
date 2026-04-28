'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Suspense, Component, type ReactNode } from 'react'
import { useStore } from '@/store'
import { PointCloud } from './PointCloud'
import { HighlightPointCloud } from './HighlightPointCloud'
import { CoordPicker } from './CoordPicker'
import { InfoTile } from './InfoTile'
import { FpsMonitor } from './FpsMonitor'

/** Swallows render errors from children (e.g. missing PLY files) */
class R3FErrorBoundary extends Component<
    { children: ReactNode; fallback?: ReactNode },
    { hasError: boolean }
> {
    state = { hasError: false }
    static getDerivedStateFromError() {
        return { hasError: true }
    }
    componentDidCatch(err: Error) {
        console.warn('Scene error caught:', err.message)
    }
    render() {
        if (this.state.hasError) return this.props.fallback ?? null
        return this.props.children
    }
}

/** Derive the hl- URL from a base model URL, e.g. /models/foo.ply → /models/hl-foo.ply */
function getHlUrl(baseUrl: string): string {
    const parts = baseUrl.split('/')
    const filename = parts.pop()!
    return [...parts, `hl-${filename}`].join('/')
}

function SceneContent() {
    const { activeMemoryId, memories } = useStore((s) => s)
    const activeMemory = memories.find((m) => m.id === activeMemoryId)

    if (!activeMemory || !activeMemory.model_url) return null

    const hlUrl = getHlUrl(activeMemory.model_url)

    const tiles = activeMemory.traces?.map((t) => ({
        position: t.position,
        label: t.label,
        description: t.description,
        expandDir: t.expand_dir as 'up' | 'down' | undefined,
    }))

    return (
        <>
            <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
            <PointCloud url={activeMemory.model_url!} opacity={1} />
            <R3FErrorBoundary>
                <HighlightPointCloud url={hlUrl} />
            </R3FErrorBoundary>
            {tiles?.map((tile, i) => (
                <InfoTile
                    key={`${activeMemory.id}-tile-${i}`}
                    id={`${activeMemory.id}-tile-${i}`}
                    position={tile.position}
                    label={tile.label}
                    description={tile.description}
                    forceDir={tile.expandDir}
                />
            ))}
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
                <R3FErrorBoundary>
                    <SceneContent />
                </R3FErrorBoundary>
            </Suspense>
        </Canvas>
    )
}
