'use client'

import { useState } from 'react'
import { useStore } from '@/store'
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
    const photoLatitude = toFiniteNumber(activeMemory.photo_latitude)
    const photoLongitude = toFiniteNumber(activeMemory.photo_longitude)

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
                            <p className="text-[10px] text-white/30 mt-0.5 tracking-wider uppercase">
                                {activeMemory.description?.slice(0, 50) || 'Memory'}
                            </p>
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
                            {photoLatitude !== null && photoLongitude !== null ? (
                                <MiniLocationMap latitude={photoLatitude} longitude={photoLongitude} />
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

function MiniLocationMap({
    latitude,
    longitude,
}: {
    latitude: number
    longitude: number
}) {
    const x = ((longitude + 180) / 360) * 320
    const y = ((90 - latitude) / 180) * 150

    return (
        <div
            className="rounded-xl overflow-hidden"
            style={{
                background: '#f4f4f0',
                border: '0.5px solid rgba(255,255,255,0.10)',
                boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
            }}
        >
            <svg
                viewBox="0 0 320 150"
                role="img"
                aria-label={`Photo location map at ${formatCoordinate(latitude, 'lat')}, ${formatCoordinate(longitude, 'lon')}`}
                className="block h-[140px] w-full"
                preserveAspectRatio="none"
            >
                <rect width="320" height="150" fill="#f4f4f0" />
                <path d="M0 75H320M160 0V150" stroke="#d4d4ce" strokeWidth="0.8" />
                <path d="M80 0V150M240 0V150M0 37.5H320M0 112.5H320" stroke="#e0e0dc" strokeWidth="0.7" />
                <path
                    d="M52 47C66 31 91 26 112 35C128 42 126 57 111 64C97 70 101 84 87 91C70 100 50 89 43 75C35 61 41 54 52 47Z"
                    fill="#171717"
                    opacity="0.9"
                />
                <path
                    d="M92 97C110 91 130 101 134 116C139 135 115 145 101 132C89 121 78 105 92 97Z"
                    fill="#171717"
                    opacity="0.9"
                />
                <path
                    d="M142 43C158 30 178 31 191 43C204 55 191 69 174 67C156 65 139 58 142 43Z"
                    fill="#171717"
                    opacity="0.88"
                />
                <path
                    d="M178 70C197 62 220 66 232 82C244 99 235 122 215 129C195 136 181 118 186 99C190 84 164 80 178 70Z"
                    fill="#171717"
                    opacity="0.9"
                />
                <path
                    d="M217 43C240 26 275 31 292 50C306 66 286 83 262 77C241 72 223 64 217 43Z"
                    fill="#171717"
                    opacity="0.9"
                />
                <path
                    d="M265 105C278 97 298 103 303 117C309 134 287 141 273 130C263 122 255 112 265 105Z"
                    fill="#171717"
                    opacity="0.85"
                />
                <circle cx={x} cy={y} r="6.5" fill="#f4f4f0" stroke="#171717" strokeWidth="2" />
                <circle cx={x} cy={y} r="3" fill="#171717" />
            </svg>
            <div className="flex items-center justify-between gap-3 px-3 py-2 bg-[#171717]">
                <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-white/65">
                    EXIF GPS
                </span>
                <span className="text-[10px] font-mono text-white/80">
                    {formatCoordinate(latitude, 'lat')} {formatCoordinate(longitude, 'lon')}
                </span>
            </div>
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

function formatCoordinate(value: number, axis: 'lat' | 'lon'): string {
    const direction = axis === 'lat'
        ? value >= 0 ? 'N' : 'S'
        : value >= 0 ? 'E' : 'W'

    return `${Math.abs(value).toFixed(4)}°${direction}`
}
