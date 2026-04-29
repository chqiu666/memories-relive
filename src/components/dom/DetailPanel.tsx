'use client'

import { useState } from 'react'
import { useStore } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, FileText, Image, MapPin, Clock } from 'lucide-react'

/**
 * Full-height detail description panel on the right side of the detail page.
 * Apple HIG-inspired glassmorphic design with expandable sections.
 */
export function DetailPanel() {
    const { viewMode, activeMemoryId, memories } = useStore((s) => s)
    const activeMemory = memories.find((m) => m.id === activeMemoryId)
    const [collapsed, setCollapsed] = useState(true)

    if (viewMode !== 'detail' || !activeMemory) return null

    // Placeholder dates derived from memory data
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

    return (
        <>
            {/* Toggle tab — always visible on right edge */}
            <motion.button
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.3 }}
                onClick={() => setCollapsed(!collapsed)}
                className="fixed right-0 top-1/2 -translate-y-1/2 z-40 pointer-events-auto
                    w-6 h-16 flex items-center justify-center
                    bg-white/5 hover:bg-white/10 backdrop-blur-md
                    border border-r-0 border-white/10 hover:border-white/20
                    rounded-l-lg transition-all duration-300
                    text-white/40 hover:text-white/70"
                title={collapsed ? 'Show details' : 'Hide details'}
            >
                {collapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </motion.button>

            {/* Panel */}
            <AnimatePresence>
                {!collapsed && (
                    <motion.aside
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                        className="fixed right-0 top-0 bottom-0 z-30 pointer-events-auto
                            w-[340px] flex flex-col
                            bg-black/60 backdrop-blur-2xl
                            border-l border-white/8"
                        style={{
                            WebkitBackdropFilter: 'blur(40px)',
                            backdropFilter: 'blur(40px)',
                        }}
                    >
                        {/* Header */}
                        <div className="flex-shrink-0 px-6 pt-8 pb-4 border-b border-white/6">
                            <h3 className="text-[13px] font-semibold text-white/90 tracking-wide uppercase">
                                Details
                            </h3>
                            <p className="text-[11px] text-white/35 mt-1 tracking-wide">
                                {activeMemory.title}
                            </p>
                        </div>

                        {/* Scrollable content */}
                        <div
                            className="flex-1 overflow-y-auto px-6 py-5 space-y-5"
                            style={{
                                scrollbarWidth: 'thin',
                                scrollbarColor: 'rgba(255,255,255,0.08) transparent',
                            }}
                        >
                            {/* ── Overview ── */}
                            <Section icon={<FileText size={14} />} title="Overview">
                                <p className="text-[12px] leading-[1.8] text-white/45">
                                    {activeMemory.description || 'No description available.'}
                                </p>
                            </Section>

                            {/* ── Original Image ── */}
                            <Section icon={<Image size={14} />} title="Original Image">
                                {activeMemory.thumbnail_url ? (
                                    <div className="rounded-lg overflow-hidden border border-white/8">
                                        <img
                                            src={activeMemory.thumbnail_url}
                                            alt={activeMemory.title}
                                            className="w-full h-auto object-cover"
                                            style={{ maxHeight: '200px' }}
                                        />
                                    </div>
                                ) : (
                                    <Placeholder text="No original image" />
                                )}
                            </Section>

                            {/* ── Additional Images ── */}
                            <Section icon={<Image size={14} />} title="Additional Images">
                                <Placeholder text="No additional images" />
                            </Section>

                            {/* ── Location ── */}
                            <Section icon={<MapPin size={14} />} title="Location">
                                <div className="rounded-lg overflow-hidden border border-white/8 bg-white/3 h-[160px] flex items-center justify-center">
                                    <div className="text-center">
                                        <MapPin size={20} className="text-white/15 mx-auto mb-2" />
                                        <p className="text-[11px] text-white/25">
                                            EXIF geolocation not available
                                        </p>
                                    </div>
                                </div>
                            </Section>

                            {/* ── Timestamps ── */}
                            <Section icon={<Clock size={14} />} title="Timestamps">
                                <div className="space-y-3">
                                    <MetaRow label="Photo taken" value="—" />
                                    <MetaRow label="Created" value={createdAt} />
                                    <MetaRow label="Modified" value={updatedAt} />
                                </div>
                            </Section>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>
        </>
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
            <div className="flex items-center gap-2 mb-3">
                <span className="text-white/30">{icon}</span>
                <span className="text-[11px] font-medium text-white/50 uppercase tracking-widest">
                    {title}
                </span>
            </div>
            <div className="pl-0.5">{children}</div>
        </div>
    )
}

function MetaRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-start justify-between gap-3">
            <span className="text-[11px] text-white/35 flex-shrink-0">{label}</span>
            <span className="text-[11px] text-white/60 text-right font-mono">{value}</span>
        </div>
    )
}

function Placeholder({ text }: { text: string }) {
    return (
        <div className="rounded-lg border border-dashed border-white/8 bg-white/2 px-4 py-5 flex items-center justify-center">
            <p className="text-[11px] text-white/20">{text}</p>
        </div>
    )
}
