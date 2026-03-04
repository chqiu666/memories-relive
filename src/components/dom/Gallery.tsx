'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { useStore } from '@/store'
import memories from '@/data/memories.json'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { Upload, X, Trees } from 'lucide-react'

gsap.registerPlugin(useGSAP)

export function Gallery() {
    const { set } = useStore((s) => s)
    const gridRef = useRef<HTMLDivElement>(null)
    const [uploadOpen, setUploadOpen] = useState(false)
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
                onComplete: () => setUploadOpen(false),
            })
        } else {
            setUploadOpen(false)
        }
    }, [])

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
                                src={mem.thumbnail}
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
                        className="w-72 bg-[#1a1a1a] border border-white/10 rounded-xl p-5 shadow-2xl shadow-black/50 origin-bottom-right"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-white/90">Upload Photo</h3>
                            <button
                                onClick={closePopover}
                                className="text-white/30 hover:text-white/70 transition-colors cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="border border-dashed border-white/10 rounded-lg p-6 flex flex-col items-center gap-2 text-white/30">
                            <Upload size={24} strokeWidth={1.5} />
                            <p className="text-xs">Drag or click to select</p>
                            <p className="text-[10px] text-white/15">Coming soon</p>
                        </div>
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
                    className="flex items-center gap-2 px-5 py-3 rounded-full bg-white/90 hover:bg-white text-[#0a0a0a] font-medium text-sm shadow-lg shadow-black/30 transition-all duration-300 hover:scale-105 cursor-pointer"
                >
                    <Upload size={18} strokeWidth={2} />
                    <span>Save Memory</span>
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
            {uploadOpen && (
                <div
                    className="fixed inset-0 z-30"
                    onClick={closePopover}
                />
            )}
        </div>
    )
}
