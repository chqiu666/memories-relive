'use client'

import { useStore } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Clock } from 'lucide-react'
import memories from '@/data/memories.json'

export function UI() {
    const { viewMode, activeMemoryId, timeState, set } = useStore((state) => state)
    const activeMemory = memories.find(m => m.id === activeMemoryId)

    const isEvolution = activeMemory?.type === 'evolution' && (activeMemory.timeline?.length || 0) > 1

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

                {/* Back Button */}
                <AnimatePresence>
                    {viewMode === 'detail' && (
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

            {/* Footer / Controls */}
            <div className="flex flex-col items-center gap-6 pb-8">
                <AnimatePresence>
                    {viewMode === 'detail' && isEvolution && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="pointer-events-auto bg-black/40 backdrop-blur-md p-6 rounded-2xl border border-white/10 w-full max-w-md"
                        >
                            <div className="flex items-center justify-between mb-4 text-white/90">
                                <span className="flex items-center gap-2 text-sm uppercase tracking-wider">
                                    <Clock size={16} /> Time Evolution
                                </span>
                                <span className="text-xs font-mono text-white/50">
                                    {Math.round(timeState * 100)}%
                                </span>
                            </div>

                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={timeState}
                                onChange={(e) => set({ timeState: parseFloat(e.target.value) })}
                                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                            />

                            <div className="flex justify-between mt-2 text-xs text-white/40 font-mono">
                                <span>{activeMemory?.timeline[0]?.label}</span>
                                <span>{activeMemory?.timeline[1]?.label}</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Title in Detail Mode */}
                <AnimatePresence>
                    {viewMode === 'detail' && activeMemory && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-center"
                        >
                            <h2 className="text-2xl text-white font-thin tracking-widest">{activeMemory.title}</h2>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
