'use client'

import { useStore } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import memories from '@/data/memories.json'

export function UI() {
    const { viewMode, activeMemoryId, set } = useStore((s) => s)
    const activeMemory = memories.find((m) => m.id === activeMemoryId)

    // Only show UI overlay in detail mode
    if (viewMode !== 'detail') return null

    return (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8 z-10">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-extralight tracking-[0.3em] uppercase text-white/90">
                        Memories Relive
                    </h1>
                </div>

                {/* Back to Gallery */}
                <motion.button
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => set({ viewMode: 'grid', activeMemoryId: null })}
                    className="pointer-events-auto flex items-center gap-2 text-white/60 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-full backdrop-blur-sm border border-white/10 hover:bg-white/10"
                >
                    <ArrowLeft size={16} />
                    <span className="text-sm uppercase tracking-wider">Gallery</span>
                </motion.button>
            </div>

            {/* Footer – Memory Title */}
            <div className="flex flex-col items-center pb-8">
                <AnimatePresence>
                    {activeMemory && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="text-center"
                        >
                            <h2 className="text-2xl text-white font-thin tracking-widest uppercase">
                                {activeMemory.title}
                            </h2>
                            <p className="text-xs text-white/30 mt-2 tracking-wide">
                                {activeMemory.description}
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
