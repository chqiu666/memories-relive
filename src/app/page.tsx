'use client'

import dynamic from 'next/dynamic'

// Dynamically import Scene to avoid SSR issues with R3F
const Scene = dynamic(() => import('@/components/canvas/Scene'), { ssr: false })

import { UI } from '@/components/dom/UI'

export default function Home() {
  return (
    <main className="h-screen w-full bg-black text-white relative">
      <div className="absolute inset-0 z-0">
        <Scene />
      </div>

      <UI />
    </main>
  )
}
