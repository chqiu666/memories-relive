'use client'

import { useMemo, useState } from 'react'
import { useStore } from '@/store'
import { MapboxMemoryMap } from '@/components/dom/MapboxMemoryMap'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Image as ImageIcon, MapPin, Clock, Info } from 'lucide-react'

/**
 * macOS 26 / Apple "Special UI" floating detail panel.
 * Rounded-corner island that floats detached from all edges.
 * Collapsed state: small pill in the top-right corner.
 * Expanded state: grows vertically to near-full page height.
 */
export function DetailPanel() {
    const { viewMode, activeMemoryId, memories } = useStore((s) => s)
    const activeMemory = memories.find((m) => m.id === activeMemoryId)
    const activeMemoryList = useMemo(() => activeMemory ? [activeMemory] : [], [activeMemory])
    const [expanded, setExpanded] = useState(true)

    if (viewMode !== 'detail' || !activeMemory) return null

    const createdAt = activeMemory.created_at
        ? new Date(activeMemory.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
        : '—'
    const updatedAt = activeMemory.updated_at
        ? new Date(activeMemory.updated_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
        : '—'
    const hasPhotoLocation =
        toFiniteNumber(activeMemory.photo_latitude) !== null &&
        toFiniteNumber(activeMemory.photo_longitude) !== null

    return (
        <AnimatePresence mode="wait">
            {!expanded ? (
                /* ── Collapsed pill ── */
                <motion.button
                    key="collapsed"
                    layoutId="detail-panel"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                    onClick={() => setExpanded(true)}
                    className="fixed top-5 right-5 z-40 pointer-events-auto
                        flex items-center gap-2.5 px-4 py-2.5
                        rounded-2xl cursor-pointer
                        text-white/50 hover:text-white/80
                        transition-colors duration-200"
                    style={{
                        background: 'rgba(30, 30, 30, 0.55)',
                        backdropFilter: 'blur(40px) saturate(1.8)',
                        WebkitBackdropFilter: 'blur(40px) saturate(1.8)',
                        border: '0.5px solid rgba(255,255,255,0.12)',
                        boxShadow:
                            '0 8px 32px rgba(0,0,0,0.35), inset 0 0.5px 0 rgba(255,255,255,0.08)',
                    }}
                    title="Show details"
                >
                    <Info size={14} strokeWidth={1.8} />
                    <span className="text-[12px] font-medium tracking-wide">
                        {activeMemory.title}
                    </span>
                </motion.button>
            ) : (
                /* ── Expanded floating panel ── */
                <motion.aside
                    key="expanded"
                    layoutId="detail-panel"
                    initial={{ opacity: 0, scaleY: 0.3, scaleX: 0.92, originX: 1, originY: 0 }}
                    animate={{ opacity: 1, scaleY: 1, scaleX: 1 }}
                    exit={{ opacity: 0, scaleY: 0.3, scaleX: 0.92 }}
                    transition={{ type: 'spring', damping: 32, stiffness: 350 }}
                    className="fixed z-40 pointer-events-auto
                        flex flex-col overflow-hidden"
                    style={{
                        top: '20px',
                        right: '20px',
                        bottom: '20px',
                        width: '320px',
                        borderRadius: '20px',
                        background: 'rgba(22, 22, 22, 0.62)',
                        backdropFilter: 'blur(60px) saturate(1.8)',
                        WebkitBackdropFilter: 'blur(60px) saturate(1.8)',
                        border: '0.5px solid rgba(255,255,255,0.10)',
                        boxShadow:
                            '0 24px 80px rgba(0,0,0,0.45), 0 2px 12px rgba(0,0,0,0.3), inset 0 0.5px 0 rgba(255,255,255,0.06)',
                        transformOrigin: 'top right',
                    }}
                >
                    {/* ── Header ── */}
                    <div className="flex-shrink-0 px-5 pt-5 pb-4 flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-[14px] font-semibold text-white/90 tracking-wide truncate">
                                {activeMemory.title}
                            </h3>
                        </div>
                        <button
                            onClick={() => setExpanded(false)}
                            className="flex-shrink-0 w-7 h-7 rounded-full
                                flex items-center justify-center
                                bg-white/5 hover:bg-white/10
                                text-white/35 hover:text-white/70
                                transition-all duration-200 cursor-pointer ml-3"
                            style={{
                                border: '0.5px solid rgba(255,255,255,0.08)',
                            }}
                            title="Close"
                        >
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                            </svg>
                        </button>
                    </div>

                    {/* ── Thin separator ── */}
                    <div className="mx-5 h-px bg-white/6" />

                    {/* ── Scrollable content ── */}
                    <div
                        className="flex-1 overflow-y-auto px-5 py-4 space-y-5"
                        style={{
                            scrollbarWidth: 'none',
                        }}
                    >
                        {/* Overview */}
                        <Section icon={<FileText size={13} />} title="Overview">
                            <p className="text-[12px] leading-[1.85] text-white/40">
                                {activeMemory.description || 'No description available.'}
                            </p>
                        </Section>

                        {/* Original Image */}
                        <Section icon={<ImageIcon size={13} />} title="Original Image">
                            {activeMemory.thumbnail_url ? (
                                <div
                                    className="rounded-xl overflow-hidden"
                                    style={{
                                        border: '0.5px solid rgba(255,255,255,0.06)',
                                    }}
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={activeMemory.thumbnail_url}
                                        alt={activeMemory.title}
                                        className="w-full h-auto object-cover"
                                        style={{ maxHeight: '180px' }}
                                    />
                                </div>
                            ) : (
                                <Placeholder text="No original image" />
                            )}
                        </Section>

                        {/* Additional Images */}
                        <Section icon={<ImageIcon size={13} />} title="Additional Images">
                            <Placeholder text="No additional images" />
                        </Section>

                        {/* Location */}
                        <Section icon={<MapPin size={13} />} title="Location">
                            {hasPhotoLocation ? (
                                <MapboxMemoryMap
                                    memories={activeMemoryList}
                                    variant="detail"
                                    activeMemoryId={activeMemory.id}
                                    className="h-[170px] rounded-xl"
                                />
                            ) : (
                                <div
                                    className="rounded-xl overflow-hidden h-[140px] flex items-center justify-center"
                                    style={{
                                        background: 'rgba(255,255,255,0.02)',
                                        border: '0.5px solid rgba(255,255,255,0.06)',
                                    }}
                                >
                                    <div className="text-center">
                                        <MapPin size={18} className="text-white/12 mx-auto mb-2" />
                                        <p className="text-[10px] text-white/20">
                                            EXIF geolocation not available
                                        </p>
                                    </div>
                                </div>
                            )}
                        </Section>

                        {/* Timestamps */}
                        <Section icon={<Clock size={13} />} title="Timestamps">
                            <div className="space-y-2.5">
                                <MetaRow label="Photo taken" value="—" />
                                <MetaRow label="Created" value={createdAt} />
                                <MetaRow label="Modified" value={updatedAt} />
                            </div>
                        </Section>
                    </div>
                </motion.aside>
            )}
        </AnimatePresence>
    )
}

/* ── Sub-components ── */

function Section({
    icon,
    title,
    children,
}: {
    icon: React.ReactNode
    title: string
    children: React.ReactNode
}) {
    return (
        <div>
            <div className="flex items-center gap-2 mb-2.5">
                <span className="text-white/25">{icon}</span>
                <span className="text-[10px] font-medium text-white/40 uppercase tracking-[0.08em]">
                    {title}
                </span>
            </div>
            <div>{children}</div>
        </div>
    )
}

function MetaRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-start justify-between gap-3">
            <span className="text-[11px] text-white/30 flex-shrink-0">{label}</span>
            <span className="text-[11px] text-white/55 text-right font-mono">{value}</span>
        </div>
    )
}

function Placeholder({ text }: { text: string }) {
    return (
        <div
            className="rounded-xl px-4 py-5 flex items-center justify-center"
            style={{
                border: '0.5px dashed rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.015)',
            }}
        >
            <p className="text-[10px] text-white/18">{text}</p>
        </div>
    )
}

function toFiniteNumber(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined) return null

    const numberValue = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(numberValue) ? numberValue : null
}
