'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Suspense } from 'react'
import { useStore } from '@/store'
import { PointCloud } from './PointCloud'
import { FpsMonitor } from './FpsMonitor'
import memories from '@/data/memories.json'

function SceneContent() {
    const { activeMemoryId } = useStore((s) => s)
    const activeMemory = memories.find((m) => m.id === activeMemoryId)

    if (!activeMemory) return null

    return (
        <>
            <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
            <PointCloud url={activeMemory.modelSrc} opacity={1} />
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
