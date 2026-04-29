'use client'

import { useStore } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'
import { Info, X, Crosshair, Clipboard } from 'lucide-react'

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
        orbitTarget,
        raycastMode,
        pickedCoord,
        vignetteEnabled,
        vignetteIntensity,
        chromaticEnabled,
        chromaticIntensity,
        edgeBlurEnabled,
        edgeBlurIntensity,
        postFxEnabled,
        hlGlowIntensity,
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
                        className="fixed bottom-20 right-6 z-50 w-72 max-h-[calc(100vh-120px)] overflow-y-auto bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10"
                        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
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

                            {/* Orbit Target radio */}
                            <div className="space-y-1.5">
                                <span className="text-[11px] text-white/40 uppercase tracking-wide">Orbit Target</span>
                                <div className="flex gap-3">
                                    {(['origin', 'bbox'] as const).map((mode) => (
                                        <label key={mode} className="flex items-center gap-1.5 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="orbitTarget"
                                                checked={orbitTarget === mode}
                                                onChange={() => set({ orbitTarget: mode })}
                                                className="w-3 h-3 accent-blue-500 cursor-pointer"
                                            />
                                            <span className="text-[11px] text-white/60">
                                                {mode === 'origin' ? '[0,0,0]' : 'BBox Center'}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Effects */}
                        <div className="px-4 py-3 space-y-4 border-b border-white/5">
                            <span className="text-[10px] text-white/30 uppercase tracking-widest">Effects</span>

                            {/* Post FX master switch */}
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] text-white/40 uppercase tracking-wide">Post FX</span>
                                <button
                                    onClick={() => set({ postFxEnabled: !postFxEnabled })}
                                    className={`w-8 h-4 rounded-full transition-colors duration-200 cursor-pointer ${postFxEnabled ? 'bg-emerald-500/60' : 'bg-white/10'}`}
                                >
                                    <div className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-200 ${postFxEnabled ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                                </button>
                            </div>

                            {/* HL Glow */}
                            <SliderControl
                                label="HL Glow"
                                value={hlGlowIntensity}
                                min={0.1}
                                max={3.0}
                                step={0.05}
                                displayValue={hlGlowIntensity.toFixed(2)}
                                onChange={(v) => set({ hlGlowIntensity: v })}
                            />

                            {/* Vignette */}
                            <EffectControl
                                label="Vignette"
                                enabled={vignetteEnabled}
                                onToggle={() => set({ vignetteEnabled: !vignetteEnabled })}
                                value={vignetteIntensity}
                                min={0.05}
                                max={1.5}
                                step={0.05}
                                displayValue={vignetteIntensity.toFixed(2)}
                                onChange={(v) => set({ vignetteIntensity: v })}
                            />

                            {/* Chromatic Aberration */}
                            <EffectControl
                                label="Chromatic"
                                enabled={chromaticEnabled}
                                onToggle={() => set({ chromaticEnabled: !chromaticEnabled })}
                                value={chromaticIntensity}
                                min={0.0005}
                                max={0.02}
                                step={0.0005}
                                displayValue={chromaticIntensity.toFixed(4)}
                                onChange={(v) => set({ chromaticIntensity: v })}
                            />

                            {/* Edge Blur */}
                            <EffectControl
                                label="Edge Blur"
                                enabled={edgeBlurEnabled}
                                onToggle={() => set({ edgeBlurEnabled: !edgeBlurEnabled })}
                                value={edgeBlurIntensity}
                                min={0.05}
                                max={3.0}
                                step={0.05}
                                displayValue={edgeBlurIntensity.toFixed(2)}
                                onChange={(v) => set({ edgeBlurIntensity: v })}
                            />
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
            <div className={`flex items-center justify-between ${label ? 'mb-1.5' : 'mb-0.5 justify-end'}`}>
                {label && <span className="text-[11px] text-white/40 uppercase tracking-wide">{label}</span>}
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

function EffectControl({
    label, enabled, onToggle, value, min, max, step, displayValue, onChange
}: {
    label: string
    enabled: boolean
    onToggle: () => void
    value: number
    min: number
    max: number
    step: number
    displayValue: string
    onChange: (v: number) => void
}) {
    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/40 uppercase tracking-wide">{label}</span>
                <button
                    onClick={onToggle}
                    className={`w-8 h-4 rounded-full transition-colors duration-200 cursor-pointer ${enabled ? 'bg-emerald-500/60' : 'bg-white/10'}`}
                >
                    <div className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-200 ${enabled ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                </button>
            </div>
            {enabled && (
                <SliderControl
                    label=""
                    value={value}
                    min={min}
                    max={max}
                    step={step}
                    displayValue={displayValue}
                    onChange={onChange}
                />
            )}
        </div>
    )
}

function formatNum(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return n.toString()
}
