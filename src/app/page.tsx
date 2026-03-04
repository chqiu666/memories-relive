'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useStore } from '@/store'
import { Gallery } from '@/components/dom/Gallery'
import { UI } from '@/components/dom/UI'
import { DebugPanel } from '@/components/dom/DebugPanel'
import { AnimatePresence, motion } from 'framer-motion'

const Scene = dynamic(() => import('@/components/canvas/Scene'), { ssr: false })
const GardenScene = dynamic(() => import('@/components/canvas/GardenScene'), { ssr: false })

export default function Home() {
  const viewMode = useStore((s) => s.viewMode)
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch: render nothing until client is ready
  useEffect(() => { setMounted(true) }, [])

  if (!mounted) {
    return <main className="h-screen w-full bg-[#0a0a0a]" />
  }

  return (
    <main className="h-screen w-full bg-[#0a0a0a] text-white relative overflow-hidden">
      {/* 3D Canvas — detail mode */}
      <AnimatePresence>
        {viewMode === 'detail' && (
          <motion.div
            key="scene"
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

      {/* 3D Canvas — garden mode */}
      <AnimatePresence>
        {viewMode === 'garden' && (
          <motion.div
            key="garden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 z-0"
          >
            <GardenScene />
            {/* Back to list button */}
            <div className="absolute top-6 right-8 z-10">
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => useStore.getState().set({ viewMode: 'grid' })}
                className="flex items-center gap-2 text-white/60 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-full backdrop-blur-sm border border-white/10 hover:bg-white/10 cursor-pointer"
              >
                <span className="text-sm tracking-wider">← Gallery</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gallery overlay */}
      <AnimatePresence>
        {viewMode === 'grid' && (
          <motion.div
            key="gallery"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 z-20"
          >
            <Gallery />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail mode UI */}
      <UI />

      {/* Debug panel */}
      <DebugPanel />
    </main>
  )
}
