'use client'

import { useStore } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'
import { Info, X } from 'lucide-react'

export function DebugPanel() {
    const {
        debugOpen,
        fps,
        totalPoints,
        renderedPoints,
        rendererType,
        pointSize,
        samplePercent,
        set,
    } = useStore((s) => s)

    const viewMode = useStore((s) => s.viewMode)

    // Only show in detail mode
    if (viewMode !== 'detail') return null

    return (
        <>
            {/* ⓘ Toggle Button */}
            <button
                onClick={() => set({ debugOpen: !debugOpen })}
                className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/25 backdrop-blur-md flex items-center justify-center text-white/50 hover:text-white transition-all duration-300"
                title="Debug Info"
            >
                {debugOpen ? <X size={16} /> : <Info size={16} />}
            </button>

            {/* Panel */}
            <AnimatePresence>
                {debugOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="fixed bottom-20 right-6 z-50 w-72 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl"
                    >
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                            <span className="text-xs font-medium text-white/70 uppercase tracking-widest">Debug</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${rendererType === 'WebGPU'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                }`}>
                                {rendererType}
                            </span>
                        </div>

                        {/* Stats */}
                        <div className="px-4 py-3 space-y-2 border-b border-white/5">
                            <StatRow label="FPS" value={fps.toString()} highlight={fps < 30} />
                            <StatRow label="Total Points" value={formatNum(totalPoints)} />
                            <StatRow label="Rendered" value={formatNum(renderedPoints)} />
                            <StatRow
                                label="Draw %"
                                value={totalPoints > 0 ? `${Math.round((renderedPoints / totalPoints) * 100)}%` : '—'}
                            />
                        </div>

                        {/* Controls */}
                        <div className="px-4 py-3 space-y-4">
                            {/* Sampling slider */}
                            <SliderControl
                                label="Sample %"
                                value={samplePercent}
                                min={1}
                                max={100}
                                step={1}
                                displayValue={`${samplePercent}%`}
                                onChange={(v) => set({ samplePercent: v })}
                            />

                            {/* Point size slider */}
                            <SliderControl
                                label="Point Size"
                                value={pointSize}
                                min={0.01}
                                max={1.00}
                                step={0.01}
                                displayValue={pointSize.toFixed(2)}
                                onChange={(v) => set({ pointSize: v })}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}

function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-[11px] text-white/40 uppercase tracking-wide">{label}</span>
            <span className={`text-sm font-mono ${highlight ? 'text-red-400' : 'text-white/80'}`}>
                {value}
            </span>
        </div>
    )
}

function SliderControl({
    label, value, min, max, step, displayValue, onChange
}: {
    label: string
    value: number
    min: number
    max: number
    step: number
    displayValue: string
    onChange: (v: number) => void
}) {
    return (
        <div>
            <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-white/40 uppercase tracking-wide">{label}</span>
                <span className="text-xs font-mono text-white/70">{displayValue}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-3
                    [&::-webkit-slider-thumb]:h-3
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-white/80
                    [&::-webkit-slider-thumb]:hover:bg-white
                    [&::-webkit-slider-thumb]:transition-colors
                    [&::-webkit-slider-thumb]:shadow-md"
            />
        </div>
    )
}

function formatNum(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return n.toString()
}
