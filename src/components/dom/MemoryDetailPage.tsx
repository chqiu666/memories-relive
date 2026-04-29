'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useStore } from '@/store'
import { UI } from '@/components/dom/UI'
import { DebugPanel } from '@/components/dom/DebugPanel'
import { DetailPanel } from '@/components/dom/DetailPanel'
import { AnimatePresence, motion } from 'framer-motion'

const Scene = dynamic(() => import('@/components/canvas/Scene'), { ssr: false })

export function MemoryDetailPage({ memoryId }: { memoryId: string }) {
    const { memories, memoriesLoading, fetchMemories, set } = useStore((s) => s)
    const activeMemory = memories.find((memory) => memory.id === memoryId)

    useEffect(() => {
        set({
            viewMode: 'detail',
            activeMemoryId: memoryId,
            activeTileId: null,
        })
    }, [memoryId, set])

    useEffect(() => {
        if (memories.length === 0) fetchMemories()
    }, [memories.length, fetchMemories])

    return (
        <main className="h-screen w-full bg-[#0a0a0a] text-white relative overflow-hidden">
            <AnimatePresence>
                {(activeMemory || memoriesLoading) && (
                    <motion.div
                        key={memoryId}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8 }}
                        className="absolute inset-0 z-0"
                    >
                        <Scene />
                    </motion.div>
                )}
            </AnimatePresence>

            {!activeMemory && !memoriesLoading && memories.length > 0 && (
                <div className="absolute inset-0 z-10 flex items-center justify-center text-sm text-white/45">
                    Memory not found
                </div>
            )}

            <UI />
            <DebugPanel />
            <DetailPanel />
        </main>
    )
}
