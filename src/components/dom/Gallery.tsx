'use client'

import { motion } from 'framer-motion'
import { useStore } from '@/store'
import memories from '@/data/memories.json'

export function Gallery() {
    const { set } = useStore((s) => s)

    return (
        <div className="absolute inset-0 z-20 bg-[#0a0a0a] overflow-y-auto">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                    {memories.map((mem, i) => (
                        <motion.button
                            key={mem.id}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1, duration: 0.5, ease: 'easeOut' }}
                            onClick={() => set({ viewMode: 'detail', activeMemoryId: mem.id })}
                            className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-black/50 border border-white/5 hover:border-white/20 transition-all duration-500 cursor-pointer text-left"
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
                                <h2 className="text-lg font-light tracking-wide text-white/90 group-hover:text-white transition-colors">
                                    {mem.title}
                                </h2>
                                <p className="text-xs text-white/40 mt-1 tracking-wide group-hover:text-white/60 transition-colors">
                                    {mem.description}
                                </p>
                            </div>

                            {/* Hover glow */}
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />
                        </motion.button>
                    ))}
                </div>
            </div>
        </div>
    )
}
