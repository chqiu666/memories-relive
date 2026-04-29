'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Canvas, useLoader } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { PLYLoader } from 'three-stdlib'
import * as THREE from 'three'
import { useStore, type PendingMemory } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2 } from 'lucide-react'

/* ── Mini point cloud preview ── */
function PreviewPointCloud({ url }: { url: string }) {
    const geometry = useLoader(PLYLoader, url)

    useEffect(() => {
        if (!geometry) return
        geometry.computeBoundingBox()
        const box = geometry.boundingBox!
        const center = new THREE.Vector3()
        box.getCenter(center)
        geometry.translate(-center.x, -center.y, -center.z)
    }, [geometry])

    return (
        <points>
            <primitive object={geometry} />
            <pointsMaterial
                size={0.02}
                vertexColors
                sizeAttenuation
                transparent
                opacity={0.9}
            />
        </points>
    )
}

function PreviewCanvas({ url }: { url: string }) {
    return (
        <Canvas
            camera={{ position: [0, 0, 5], fov: 50, near: 0.01, far: 500 }}
            style={{ background: '#0a0a0a' }}
            dpr={[1, 1.5]}
            gl={{ antialias: true }}
        >
            <color attach="background" args={['#0a0a0a']} />
            <Suspense fallback={null}>
                <PreviewPointCloud url={url} />
            </Suspense>
            <OrbitControls enableDamping dampingFactor={0.08} />
        </Canvas>
    )
}

/* ── Modal ── */
interface UploadPreviewModalProps {
    pending: PendingMemory
    onClose: () => void
}

export function UploadPreviewModal({ pending, onClose }: UploadPreviewModalProps) {
    const { confirmMemory, discardPendingMemory } = useStore((s) => s)
    const router = useRouter()
    const [title, setTitle] = useState(pending.title)
    const [creatorName, setCreatorName] = useState('')
    const [visibility, setVisibility] = useState<'public' | 'private'>('public')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const titleInputRef = useRef<HTMLInputElement>(null)

    const modelUrl = pending.model_web_url || pending.model_url

    const handleConfirm = async () => {
        if (!title.trim()) return
        setSaving(true)
        setError(null)
        try {
            const memoryId = await confirmMemory(pending, {
                title: title.trim(),
                creator_name: creatorName.trim(),
                visibility,
            })
            router.push(`/${encodeURIComponent(memoryId)}`)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save')
            setSaving(false)
        }
    }

    const handleCancel = () => {
        discardPendingMemory()
        onClose()
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)' }}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.88, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: 10 }}
                    transition={{ type: 'spring', damping: 30, stiffness: 350 }}
                    className="relative w-[420px] max-h-[85vh] flex flex-col overflow-hidden pointer-events-auto"
                    style={{
                        borderRadius: '20px',
                        background: 'rgba(22, 22, 22, 0.72)',
                        backdropFilter: 'blur(60px) saturate(1.8)',
                        WebkitBackdropFilter: 'blur(60px) saturate(1.8)',
                        border: '0.5px solid rgba(255,255,255,0.10)',
                        boxShadow:
                            '0 32px 100px rgba(0,0,0,0.55), 0 2px 12px rgba(0,0,0,0.3), inset 0 0.5px 0 rgba(255,255,255,0.06)',
                    }}
                >
                    {/* 3D Preview */}
                    <div
                        className="flex-shrink-0 overflow-hidden"
                        style={{
                            height: 240,
                            borderBottom: '0.5px solid rgba(255,255,255,0.06)',
                        }}
                    >
                        {modelUrl ? (
                            <PreviewCanvas url={modelUrl} />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <p className="text-[11px] text-white/20">No preview available</p>
                            </div>
                        )}
                    </div>

                    {/* Form */}
                    <div
                        className="flex-1 overflow-y-auto px-6 py-5 space-y-5"
                        style={{ scrollbarWidth: 'none' }}
                    >
                        {/* Title */}
                        <div>
                            <label className="block text-[10px] text-white/35 uppercase tracking-[0.08em] mb-2">
                                Name
                            </label>
                            <input
                                ref={titleInputRef}
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                                className="w-full bg-white/5 text-white/90 text-[13px] px-3.5 py-2.5 rounded-xl outline-none
                                    placeholder:text-white/20 transition-colors duration-200
                                    focus:bg-white/8 focus:ring-1 focus:ring-white/15"
                                style={{ border: '0.5px solid rgba(255,255,255,0.08)' }}
                                placeholder="Memory name"
                            />
                        </div>

                        {/* Visibility */}
                        <div>
                            <label className="block text-[10px] text-white/35 uppercase tracking-[0.08em] mb-2">
                                Visibility
                            </label>
                            <div
                                className="flex rounded-xl overflow-hidden"
                                style={{ border: '0.5px solid rgba(255,255,255,0.08)' }}
                            >
                                {(['public', 'private'] as const).map((mode) => (
                                    <button
                                        key={mode}
                                        onClick={() => setVisibility(mode)}
                                        className="flex-1 py-2 text-[12px] font-medium tracking-wide capitalize transition-all duration-200 cursor-pointer"
                                        style={{
                                            background: visibility === mode
                                                ? 'rgba(255,255,255,0.10)'
                                                : 'rgba(255,255,255,0.02)',
                                            color: visibility === mode
                                                ? 'rgba(255,255,255,0.90)'
                                                : 'rgba(255,255,255,0.30)',
                                        }}
                                    >
                                        {mode}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Creator */}
                        <div>
                            <label className="block text-[10px] text-white/35 uppercase tracking-[0.08em] mb-2">
                                Creator
                            </label>
                            <input
                                type="text"
                                value={creatorName}
                                onChange={(e) => setCreatorName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                                className="w-full bg-white/5 text-white/90 text-[13px] px-3.5 py-2.5 rounded-xl outline-none
                                    placeholder:text-white/20 transition-colors duration-200
                                    focus:bg-white/8 focus:ring-1 focus:ring-white/15"
                                style={{ border: '0.5px solid rgba(255,255,255,0.08)' }}
                                placeholder="Anonymous"
                            />
                        </div>

                        {/* Error */}
                        {error && (
                            <p className="text-[11px] text-red-400/80">{error}</p>
                        )}
                    </div>

                    {/* Actions */}
                    <div
                        className="flex-shrink-0 flex items-center justify-between px-6 py-4"
                        style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)' }}
                    >
                        <button
                            onClick={handleCancel}
                            disabled={saving}
                            className="text-[12px] text-white/40 hover:text-white/70 transition-colors duration-200 cursor-pointer px-3 py-1.5"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={saving || !title.trim()}
                            className="flex items-center gap-2 px-5 py-2 rounded-xl text-[12px] font-semibold tracking-wide
                                transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{
                                background: saving
                                    ? 'rgba(59,130,246,0.3)'
                                    : 'rgba(59,130,246,0.85)',
                                color: 'rgba(255,255,255,0.95)',
                                boxShadow: saving
                                    ? 'none'
                                    : '0 4px 16px rgba(59,130,246,0.25), inset 0 0.5px 0 rgba(255,255,255,0.15)',
                            }}
                        >
                            {saving ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    Saving…
                                </>
                            ) : (
                                'Upload'
                            )}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
