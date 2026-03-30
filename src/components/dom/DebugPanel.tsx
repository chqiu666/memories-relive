'use client'

import { useStore } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'
import { Info, X, Crosshair, Clipboard, Loader2 } from 'lucide-react'

export function DebugPanel() {
    const {
        debugOpen,
        fps,
        totalPoints,
        renderedPoints,
        rendererType,
        pointSize,
        samplePercent,
        hlFullSample,
        loadedLod,
        lodLoading,
        lodFallback,
        raycastMode,
        pickedCoord,
        set,
        requestLod,
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
                        <div className="px-4 py-3 space-y-4 border-b border-white/5">
                            {/* LOD Quality slider with breakpoints */}
                            <LodSlider />

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
                            {/* HL Full Sample toggle */}
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] text-white/40 uppercase tracking-wide">HL Full Sample</span>
                                <button
                                    onClick={() => set({ hlFullSample: !hlFullSample })}
                                    className={`w-8 h-4 rounded-full transition-colors duration-200 cursor-pointer ${hlFullSample ? 'bg-emerald-500/60' : 'bg-white/10'
                                        }`}
                                >
                                    <div className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-200 ${hlFullSample ? 'translate-x-4.5' : 'translate-x-0.5'
                                        }`} />
                                </button>
                            </div>
                        </div>

                        {/* Coord Picker */}
                        <div className="px-4 py-3 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <Crosshair size={12} className="text-white/40" />
                                    <span className="text-[11px] text-white/40 uppercase tracking-wide">Coord Picker</span>
                                </div>
                                <button
                                    onClick={() => set({ raycastMode: !raycastMode, pickedCoord: null })}
                                    className={`w-8 h-4 rounded-full transition-colors duration-200 cursor-pointer ${raycastMode ? 'bg-blue-500/60' : 'bg-white/10'
                                        }`}
                                >
                                    <div className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-200 ${raycastMode ? 'translate-x-4.5' : 'translate-x-0.5'
                                        }`} />
                                </button>
                            </div>

                            {raycastMode && (
                                <div className="space-y-1.5">
                                    <p className="text-[10px] text-blue-400/60">Click on point cloud to pick coordinates</p>
                                    {pickedCoord && (
                                        <button
                                            onClick={() => {
                                                const s = `[${pickedCoord[0]}, ${pickedCoord[1]}, ${pickedCoord[2]}]`
                                                navigator.clipboard.writeText(s)
                                            }}
                                            className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer group"
                                        >
                                            <span className="text-[11px] font-mono text-white/70">
                                                [{pickedCoord[0]}, {pickedCoord[1]}, {pickedCoord[2]}]
                                            </span>
                                            <Clipboard size={12} className="text-white/30 group-hover:text-white/70 transition-colors flex-shrink-0" />
                                        </button>
                                    )}
                                </div>
                            )}
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

const LOD_BREAKPOINTS = [30, 60, 100] as const

function LodSlider() {
    const {
        samplePercent,
        loadedLod,
        lodLoading,
        lodFallback,
        set,
        requestLod,
    } = useStore((s) => s)

    // In fallback mode (no LOD files), show a simple unrestricted slider
    if (lodFallback) {
        return (
            <SliderControl
                label="Quality %"
                value={samplePercent}
                min={1}
                max={100}
                step={1}
                displayValue={`${samplePercent}%`}
                onChange={(v) => set({ samplePercent: v })}
            />
        )
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-white/40 uppercase tracking-wide">Quality</span>
                <span className="text-xs font-mono text-white/70">{samplePercent}%</span>
            </div>

            {/* Slider + breakpoints */}
            <div className="relative">
                {/* Range input — max capped to loaded LOD */}
                <input
                    type="range"
                    min={1}
                    max={loadedLod}
                    step={1}
                    value={Math.min(samplePercent, loadedLod)}
                    onChange={(e) => set({ samplePercent: Number(e.target.value) })}
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

                {/* Breakpoint dots */}
                <div className="absolute inset-0 pointer-events-none" style={{ top: '-3px' }}>
                    {LOD_BREAKPOINTS.map((bp) => {
                        const pct = ((bp - 1) / 99) * 100  // position on track (1-100 range)
                        const isLoaded = bp <= loadedLod
                        const isLoadingThis = lodLoading && bp > loadedLod  // next one being loaded
                        const isActive = bp === loadedLod

                        return (
                            <button
                                key={bp}
                                onClick={() => {
                                    if (bp <= loadedLod) {
                                        // Already loaded — snap slider to this level
                                        set({ samplePercent: bp })
                                    } else if (!lodLoading) {
                                        // Request higher LOD
                                        requestLod(bp)
                                    }
                                }}
                                disabled={lodLoading}
                                className="absolute pointer-events-auto group"
                                style={{
                                    left: `${pct}%`,
                                    transform: 'translateX(-50%)',
                                    top: '-2px',
                                }}
                                title={`${bp}%${isLoaded ? ' (loaded)' : ''}`}
                            >
                                {isLoadingThis ? (
                                    <Loader2 size={10} className="animate-spin text-blue-400" />
                                ) : (
                                    <div
                                        className={`w-2.5 h-2.5 rounded-full border transition-all duration-200 ${
                                            isActive
                                                ? 'bg-blue-400 border-blue-400 scale-110'
                                                : isLoaded
                                                    ? 'bg-white/40 border-white/40 group-hover:bg-white/60'
                                                    : 'bg-transparent border-white/20 group-hover:border-white/40'
                                        }`}
                                    />
                                )}
                                {/* Label below dot */}
                                <span className={`absolute top-3.5 left-1/2 -translate-x-1/2 text-[8px] font-mono whitespace-nowrap ${
                                    isActive ? 'text-blue-400/70' : 'text-white/20'
                                }`}>
                                    {bp}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Spacer for breakpoint labels */}
            <div className="h-3" />
        </div>
    )
}

function formatNum(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return n.toString()
}
