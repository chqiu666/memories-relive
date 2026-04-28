'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useStore } from '@/store'
import { Gallery } from '@/components/dom/Gallery'
import { AnimatePresence, motion } from 'framer-motion'
import { LayoutGrid, Map, Trees, type LucideIcon } from 'lucide-react'

const GardenScene = dynamic(() => import('@/components/canvas/GardenScene'), { ssr: false })

type HomeViewMode = 'garden' | 'grid' | 'spatial' | 'about'

const HOME_TABS: Array<{
  id: HomeViewMode
  label: string
  Icon?: LucideIcon
}> = [
  { id: 'garden', label: 'garden', Icon: Trees },
  { id: 'grid', label: 'grid', Icon: LayoutGrid },
  { id: 'spatial', label: 'spatial', Icon: Map },
  { id: 'about', label: 'about' },
]

export default function Home() {
  const { viewMode, memories, fetchMemories, set } = useStore((s) => s)

  useEffect(() => {
    if (memories.length === 0) fetchMemories()
  }, [memories.length, fetchMemories])

  const activeHomeView: HomeViewMode = viewMode === 'detail' ? 'grid' : viewMode

  return (
    <main className="h-screen w-full bg-[#0a0a0a] text-white flex flex-col overflow-hidden">
      <header className="z-40 border-b border-white/5 bg-[#0a0a0a]/85 px-6 py-5 backdrop-blur-md sm:px-8">
        <h1
          className="text-3xl text-white/90"
          style={{ fontFamily: 'VcrEas, sans-serif' }}
        >
          memories relived
        </h1>
        <nav
          className="mt-4 flex w-full gap-1 overflow-x-auto rounded-lg border border-white/10 bg-white/[0.03] p-1 sm:w-fit"
          aria-label="Layout modes"
        >
          {HOME_TABS.map(({ id, label, Icon }) => {
            const active = activeHomeView === id

            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => set({ viewMode: id })}
                className={`flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm tracking-wide transition-colors ${
                  active
                    ? 'bg-white/90 text-[#0a0a0a]'
                    : 'text-white/50 hover:bg-white/[0.06] hover:text-white/85'
                }`}
              >
                {Icon && <Icon size={15} strokeWidth={1.7} aria-hidden="true" />}
                <span>{label}</span>
              </button>
            )
          })}
        </nav>
      </header>

      <section className="relative min-h-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeHomeView === 'grid' && (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="absolute inset-0 z-20"
            >
              <Gallery />
            </motion.div>
          )}

          {activeHomeView === 'garden' && (
            <motion.div
              key="garden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0 z-10"
            >
              <GardenScene />
            </motion.div>
          )}

          {activeHomeView === 'spatial' && (
            <motion.div
              key="spatial"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="absolute inset-0 bg-[#0a0a0a]"
            />
          )}

          {activeHomeView === 'about' && (
            <motion.div
              key="about"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="absolute inset-0 bg-[#0a0a0a]"
            />
          )}
        </AnimatePresence>
      </section>
    </main>
  )
}
