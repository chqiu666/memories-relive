'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useStore } from '@/store'
import { Gallery } from '@/components/dom/Gallery'
import { UI } from '@/components/dom/UI'
import { DebugPanel } from '@/components/dom/DebugPanel'
import { AnimatePresence, motion } from 'framer-motion'

const Scene = dynamic(() => import('@/components/canvas/Scene'), { ssr: false })

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
      {/* 3D Canvas — only mounts in detail mode */}
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
