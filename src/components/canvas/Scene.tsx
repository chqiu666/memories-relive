'use client'

import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { Canvas, useLoader } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Vignette, ChromaticAberration, TiltShift } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { Suspense, Component, type ReactNode } from 'react'
import { PLYLoader } from 'three-stdlib'
import { useStore } from '@/store'
import { PointCloud } from './PointCloud'
import { HighlightPointCloud } from './HighlightPointCloud'
import { CoordPicker } from './CoordPicker'
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

function getHlUrl(baseUrl: string): string {
    const parts = baseUrl.split('/')
    const filename = parts.pop()!
    return [...parts, `hl-${filename}`].join('/')
}

/**
 * Syncs OrbitControls.target to either [0,0,0] or the model's bounding-box center.
 * Does NOT move the model — only changes where the camera looks/orbits around.
 */
function OrbitTargetSync({ url, controlsRef }: {
    url: string
    controlsRef: React.RefObject<any>
}) {
    const geometry = useLoader(PLYLoader, url)
    const orbitTarget = useStore((s) => s.orbitTarget)

    useEffect(() => {
        const controls = controlsRef.current
        if (!controls) return

        if (orbitTarget === 'origin') {
            controls.target.set(0, 0, 0)
        } else {
            const posAttr = geometry.getAttribute('position')
            if (posAttr) {
                const geo = new THREE.BufferGeometry()
                geo.setAttribute('position', posAttr)
                geo.computeBoundingBox()
                const box = geo.boundingBox!
                const cx = (box.min.x + box.max.x) / 2
                const cy = (box.min.y + box.max.y) / 2
                const cz = (box.min.z + box.max.z) / 2
                controls.target.set(cx, cy, cz)
                geo.dispose()
            }
        }
        controls.update()
    }, [geometry, orbitTarget, controlsRef])

    return null
}

function SceneContent() {
    const { activeMemoryId, memories } = useStore((s) => s)
    const vignetteEnabled = useStore((s) => s.vignetteEnabled)
    const vignetteIntensity = useStore((s) => s.vignetteIntensity)
    const chromaticEnabled = useStore((s) => s.chromaticEnabled)
    const chromaticIntensity = useStore((s) => s.chromaticIntensity)
    const edgeBlurEnabled = useStore((s) => s.edgeBlurEnabled)
    const edgeBlurIntensity = useStore((s) => s.edgeBlurIntensity)
    const activeMemory = memories.find((m) => m.id === activeMemoryId)
    const controlsRef = useRef<any>(null)

    if (!activeMemory || !activeMemory.model_url) return null

    const hlUrl = getHlUrl(activeMemory.model_url)

    return (
        <>
            <OrbitControls ref={controlsRef} makeDefault enableDamping dampingFactor={0.05} />
            <PointCloud url={activeMemory.model_url!} opacity={1} />
            <OrbitTargetSync url={activeMemory.model_url!} controlsRef={controlsRef} />
            <R3FErrorBoundary>
                <HighlightPointCloud url={hlUrl} />
            </R3FErrorBoundary>
            {/* InfoTiles temporarily disabled — coords need re-picking */}
            <EffectComposer>
                <Vignette
                    offset={0.3}
                    darkness={vignetteEnabled ? vignetteIntensity : 0}
                    blendFunction={BlendFunction.NORMAL}
                />
                <ChromaticAberration
                    offset={new THREE.Vector2(
                        chromaticEnabled ? chromaticIntensity : 0,
                        chromaticEnabled ? chromaticIntensity : 0
                    )}
                    radialModulation
                    modulationOffset={0.2}
                />
                <TiltShift
                    blur={edgeBlurEnabled ? edgeBlurIntensity : 0}
                    focusArea={0.5}
                    feather={0.3}
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
                <R3FErrorBoundary>
                    <SceneContent />
                </R3FErrorBoundary>
            </Suspense>
        </Canvas>
    )
}
