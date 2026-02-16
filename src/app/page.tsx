'use client'

import dynamic from 'next/dynamic'
import { useStore } from '@/store'
import { Gallery } from '@/components/dom/Gallery'
import { UI } from '@/components/dom/UI'
import { AnimatePresence, motion } from 'framer-motion'

const Scene = dynamic(() => import('@/components/canvas/Scene'), { ssr: false })

export default function Home() {
  const viewMode = useStore((s) => s.viewMode)

  return (
    <main className="h-screen w-full bg-[#0a0a0a] text-white relative overflow-hidden">
      {/* 3D Canvas — always mounted but only active in detail */}
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
          >
            <Gallery />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail mode UI */}
      <UI />
    </main>
  )
}
