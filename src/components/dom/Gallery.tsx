'use client'

import { useRef, useState } from 'react'
import { useStore } from '@/store'
import memories from '@/data/memories.json'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { Upload, X } from 'lucide-react'

gsap.registerPlugin(useGSAP)

export function Gallery() {
    const { set } = useStore((s) => s)
    const gridRef = useRef<HTMLDivElement>(null)
    const [uploadOpen, setUploadOpen] = useState(false)

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

            {/* Upload FAB */}
            <button
                onClick={() => setUploadOpen(true)}
                className="fixed bottom-8 right-8 z-40 flex items-center gap-2 px-5 py-3 rounded-full bg-white/90 hover:bg-white text-[#0a0a0a] font-medium text-sm shadow-lg shadow-black/30 transition-all duration-300 hover:scale-105 cursor-pointer"
            >
                <Upload size={18} strokeWidth={2} />
                <span>Upload</span>
            </button>

            {/* Upload Modal */}
            {uploadOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="relative bg-[#141414] border border-white/10 rounded-2xl w-full max-w-md p-8 shadow-2xl">
                        {/* Close */}
                        <button
                            onClick={() => setUploadOpen(false)}
                            className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors cursor-pointer"
                        >
                            <X size={20} />
                        </button>

                        <h2 className="text-xl font-medium text-white/90 mb-6">上传照片</h2>

                        {/* Placeholder drop zone */}
                        <div className="border-2 border-dashed border-white/10 rounded-xl p-10 flex flex-col items-center gap-3 text-white/30">
                            <Upload size={32} strokeWidth={1.5} />
                            <p className="text-sm">拖拽或点击选择文件</p>
                            <p className="text-xs text-white/20">功能开发中，敬请期待</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
