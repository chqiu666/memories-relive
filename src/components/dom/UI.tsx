'use client'

import { useStore } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import memories from '@/data/memories.json'

export function UI() {
    const { viewMode, activeMemoryId, set } = useStore((s) => s)
    const activeMemory = memories.find((m) => m.id === activeMemoryId)

    return (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8 z-10">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-4xl font-light tracking-widest uppercase opacity-80 text-white">
                        Memories Relive
                    </h1>
                    <p className="text-sm text-gray-400 mt-2 tracking-wide">
                        Prototype V1
                    </p>
                </div>

                {/* Back to Gallery — only show if there are multiple memories */}
                <AnimatePresence>
                    {viewMode === 'detail' && memories.length > 1 && (
                        <motion.button
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            onClick={() => set({ viewMode: 'grid', activeMemoryId: null })}
                            className="pointer-events-auto flex items-center gap-2 text-white/80 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-full backdrop-blur-sm border border-white/10"
                        >
                            <ArrowLeft size={16} />
                            <span className="text-sm uppercase tracking-wider">Gallery</span>
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer – Memory Title */}
            <div className="flex flex-col items-center gap-6 pb-8">
                <AnimatePresence>
                    {viewMode === 'detail' && activeMemory && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-center"
                        >
                            <h2 className="text-2xl text-white font-thin tracking-widest">
                                {activeMemory.title}
                            </h2>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
