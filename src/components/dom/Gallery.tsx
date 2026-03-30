'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { useStore } from '@/store'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { Upload, X, Trees, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

gsap.registerPlugin(useGSAP)

export function Gallery() {
    const { memories, fetchMemories, set, generating, generatingProgress, generateMemory } = useStore((s) => s)
    const gridRef = useRef<HTMLDivElement>(null)

    // 挂载时从 API 加载 memories
    useEffect(() => {
        if (memories.length === 0) fetchMemories()
    }, [memories.length, fetchMemories])
    const [uploadOpen, setUploadOpen] = useState(false)
    const [dragOver, setDragOver] = useState(false)
    const [uploadError, setUploadError] = useState<string | null>(null)
    const [uploadSuccess, setUploadSuccess] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const popoverRef = useRef<HTMLDivElement>(null)

    useGSAP(() => {
        const tiles = gridRef.current?.querySelectorAll('.tile')
        if (!tiles) return

        gsap.from(tiles, {
            opacity: 0,
            scale: 0.95,
            duration: 0.6,
            stagger: 0.08,
            ease: 'power2.out',
            clearProps: 'all',
        })
    }, { scope: gridRef })

    // GSAP animate popover in
    useEffect(() => {
        if (uploadOpen && popoverRef.current) {
            gsap.fromTo(popoverRef.current,
                { opacity: 0, scale: 0.9, y: 12 },
                { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: 'back.out(1.4)' }
            )
        }
    }, [uploadOpen])

    // Close popover with GSAP out animation
    const closePopover = useCallback(() => {
        if (popoverRef.current) {
            gsap.to(popoverRef.current, {
                opacity: 0, scale: 0.9, y: 12,
                duration: 0.2, ease: 'power2.in',
                onComplete: () => {
                    setUploadOpen(false)
                    setUploadError(null)
                    setUploadSuccess(false)
                },
            })
        } else {
            setUploadOpen(false)
            setUploadError(null)
            setUploadSuccess(false)
        }
    }, [])

    // Handle file selection
    const handleFile = useCallback(async (file: File) => {
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/bmp', 'image/tiff']
        if (!validTypes.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|heic|heif|bmp|tiff)$/i)) {
            setUploadError('Unsupported image format')
            return
        }

        setUploadError(null)
        setUploadSuccess(false)

        try {
            await generateMemory(file)
            setUploadSuccess(true)
            // Auto-close popover after brief success state
            setTimeout(() => closePopover(), 800)
        } catch (err) {
            setUploadError(err instanceof Error ? err.message : 'Generation failed')
        }
    }, [generateMemory, closePopover])

    // Drag-drop handlers
    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(true)
    }, [])

    const onDragLeave = useCallback(() => {
        setDragOver(false)
    }, [])

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files[0]
        if (file) handleFile(file)
    }, [handleFile])

    return (
        <div className="absolute inset-0 bg-[#0a0a0a] overflow-y-auto">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/5 px-8 py-6">
                <h1
                    className="text-3xl text-white/90"
                    style={{ fontFamily: 'VcrEas, sans-serif' }}
                >
                    memories relived
                </h1>
            </header>

            {/* Grid */}
            <div className="px-8 py-10">
                <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                    {memories.map((mem) => (
                        <button
                            key={mem.id}
                            onClick={() => set({ viewMode: 'detail', activeMemoryId: mem.id })}
                            className="tile group relative aspect-[4/3] overflow-hidden rounded-lg bg-black/50 border border-white/5 hover:border-white/20 transition-all duration-500 cursor-pointer text-left"
                        >
                            {/* Thumbnail Image */}
                            <img
                                src={mem.thumbnail_url || ''}
                                alt={mem.title}
                                className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 ease-out"
                            />

                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                            {/* Label */}
                            <div className="absolute bottom-0 left-0 right-0 p-5">
                                <h2
                                    className="text-lg font-medium tracking-wide text-white/90 group-hover:text-white transition-colors"
                                    style={{ fontFamily: 'var(--font-space-grotesk), sans-serif' }}
                                >
                                    {mem.title}
                                </h2>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <div className="w-3.5 h-3.5 rounded-full bg-white/20 flex-shrink-0" />
                                    <span className="text-[11px] text-white/40 group-hover:text-white/60 transition-colors">
                                        Anonymous
                                    </span>
                                </div>
                            </div>

                            {/* Hover glow */}
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />
                        </button>
                    ))}
                </div>
            </div>

            {/* Save Memory FAB + Popover */}
            <div className="fixed bottom-8 right-8 z-40 flex flex-col items-end gap-3">
                {/* Popover — appears above button */}
                {uploadOpen && (
                    <div
                        ref={popoverRef}
                        className="w-80 bg-[#1a1a1a] border border-white/10 rounded-xl p-5 shadow-2xl shadow-black/50 origin-bottom-right"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-white/90">
                                {generating ? 'Generating...' : 'Upload Photo'}
                            </h3>
                            {!generating && (
                                <button
                                    onClick={closePopover}
                                    className="text-white/30 hover:text-white/70 transition-colors cursor-pointer"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        {/* Generating state */}
                        {generating && (
                            <div className="flex flex-col items-center gap-3 py-6">
                                <Loader2 size={28} className="animate-spin text-blue-400" />
                                <p className="text-xs text-white/50 text-center">{generatingProgress}</p>
                                <p className="text-[10px] text-white/25 text-center">This may take 30-60 seconds</p>
                            </div>
                        )}

                        {/* Success state */}
                        {!generating && uploadSuccess && (
                            <div className="flex flex-col items-center gap-2 py-6">
                                <CheckCircle2 size={28} className="text-green-400" />
                                <p className="text-xs text-white/70">Memory created!</p>
                            </div>
                        )}

                        {/* Upload area — default state */}
                        {!generating && !uploadSuccess && (
                            <>
                                <div
                                    onDragOver={onDragOver}
                                    onDragLeave={onDragLeave}
                                    onDrop={onDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`border border-dashed rounded-lg p-6 flex flex-col items-center gap-2 cursor-pointer transition-all duration-200 ${
                                        dragOver
                                            ? 'border-blue-400/50 bg-blue-500/10 text-blue-300/70'
                                            : 'border-white/10 text-white/30 hover:border-white/20 hover:text-white/50'
                                    }`}
                                >
                                    <Upload size={24} strokeWidth={1.5} />
                                    <p className="text-xs">Drag or click to select</p>
                                    <p className="text-[10px] text-white/15">JPG, PNG, WEBP, HEIC</p>
                                </div>

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/heic,.heic,.heif"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) handleFile(file)
                                        e.target.value = '' // reset for re-upload
                                    }}
                                />

                                {/* Error message */}
                                {uploadError && (
                                    <div className="flex items-center gap-2 mt-3 text-red-400/80">
                                        <AlertCircle size={14} />
                                        <p className="text-xs">{uploadError}</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* Button */}
                <button
                    onClick={() => {
                        if (uploadOpen) {
                            closePopover()
                        } else {
                            setUploadOpen(true)
                        }
                    }}
                    disabled={generating}
                    className={`flex items-center gap-2 px-5 py-3 rounded-full font-medium text-sm shadow-lg shadow-black/30 transition-all duration-300 cursor-pointer ${
                        generating
                            ? 'bg-white/50 text-[#0a0a0a]/70'
                            : 'bg-white/90 hover:bg-white text-[#0a0a0a] hover:scale-105'
                    }`}
                >
                    {generating ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            <span>Generating...</span>
                        </>
                    ) : (
                        <>
                            <Upload size={18} strokeWidth={2} />
                            <span>Save Memory</span>
                        </>
                    )}
                </button>
            </div>

            {/* Memory Garden toggle — bottom left */}
            <div className="fixed bottom-8 left-8 z-40">
                <button
                    onClick={() => set({ viewMode: 'garden' })}
                    className="flex items-center gap-2 text-white/60 hover:text-white transition-all duration-300 bg-white/5 px-4 py-2 rounded-full backdrop-blur-sm border border-white/10 hover:bg-white/10 cursor-pointer"
                >
                    <Trees size={16} strokeWidth={1.5} />
                    <span className="text-sm tracking-wider">Memory Garden</span>
                </button>
            </div>

            {/* Click-away backdrop for popover */}
            {uploadOpen && !generating && (
                <div
                    className="fixed inset-0 z-30"
                    onClick={closePopover}
                />
            )}
        </div>
    )
}
