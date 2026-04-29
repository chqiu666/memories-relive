'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type mapboxgl from 'mapbox-gl'
import type { MemoryWithTraces } from '@/db'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
const MAPBOX_STYLE = 'mapbox://styles/mapbox/dark-v11'

type MapVariant = 'detail' | 'spatial'

interface MapboxMemoryMapProps {
    memories: MemoryWithTraces[]
    variant: MapVariant
    activeMemoryId?: string | null
    className?: string
    onSelectMemory?: (id: string) => void
}

interface LocatedMemory {
    id: string
    title: string
    thumbnailUrl: string | null
    latitude: number
    longitude: number
}

interface HoverPoint {
    x: number
    y: number
}

export function MapboxMemoryMap({
    memories,
    variant,
    activeMemoryId,
    className = '',
    onSelectMemory,
}: MapboxMemoryMapProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const mapRef = useRef<mapboxgl.Map | null>(null)
    const mapboxRef = useRef<typeof mapboxgl | null>(null)
    const markersRef = useRef<mapboxgl.Marker[]>([])
    const locatedMemoriesRef = useRef<LocatedMemory[]>([])
    const hoveredRef = useRef<LocatedMemory | null>(null)
    const [mapLoaded, setMapLoaded] = useState(false)
    const [mapError, setMapError] = useState<string | null>(null)
    const [showFallback, setShowFallback] = useState(false)
    const [hovered, setHovered] = useState<LocatedMemory | null>(null)
    const [hoverPoint, setHoverPoint] = useState<HoverPoint | null>(null)

    const locatedMemories = useMemo(
        () => memories
            .map((memory) => {
                const latitude = toFiniteNumber(memory.photo_latitude)
                const longitude = toFiniteNumber(memory.photo_longitude)

                if (latitude === null || longitude === null) return null

                return {
                    id: memory.id,
                    title: memory.title,
                    thumbnailUrl: memory.thumbnail_url,
                    latitude,
                    longitude,
                }
            })
            .filter((memory): memory is LocatedMemory => memory !== null),
        [memories]
    )

    useEffect(() => {
        locatedMemoriesRef.current = locatedMemories
    }, [locatedMemories])

    const updateHoverPosition = useCallback((memory: LocatedMemory | null) => {
        if (!memory || !mapRef.current || !containerRef.current) {
            setHoverPoint(null)
            return
        }

        const projected = mapRef.current.project([memory.longitude, memory.latitude])
        const bounds = containerRef.current.getBoundingClientRect()
        setHoverPoint({
            x: clamp(projected.x, 116, Math.max(116, bounds.width - 116)),
            y: clamp(projected.y - 18, 82, Math.max(82, bounds.height - 92)),
        })
    }, [])

    useEffect(() => {
        let disposed = false
        let resizeObserver: ResizeObserver | null = null
        let fallbackTimer: ReturnType<typeof setTimeout> | null = null

        async function initializeMap() {
            if (!containerRef.current) return

            setMapLoaded(false)
            setMapError(null)
            setShowFallback(false)

            try {
                if (!MAPBOX_TOKEN) {
                    setShowFallback(true)
                    return
                }

                const mapboxModule = await import('mapbox-gl')
                if (disposed || !containerRef.current) return

                const mapbox = mapboxModule.default
                mapbox.accessToken = MAPBOX_TOKEN
                mapboxRef.current = mapbox

                const initialPoint = locatedMemoriesRef.current[0]
                const map = new mapbox.Map({
                    container: containerRef.current,
                    style: MAPBOX_STYLE,
                    center: initialPoint
                        ? [initialPoint.longitude, initialPoint.latitude]
                        : [-73.987, 40.748],
                    zoom: variant === 'detail' ? 10.8 : 2.25,
                    pitch: 0,
                    bearing: 0,
                    interactive: variant === 'spatial',
                    attributionControl: false,
                })

                mapRef.current = map
                if (variant === 'spatial') {
                    map.addControl(new mapbox.NavigationControl({ showCompass: false }), 'bottom-right')
                    map.addControl(new mapbox.AttributionControl({ compact: true }), 'bottom-left')
                }

                let styleReady = false
                fallbackTimer = setTimeout(() => {
                    if (!styleReady) {
                        setShowFallback(true)
                    }
                }, 3200)

                const updateCurrentHover = () => updateHoverPosition(hoveredRef.current)
                map.on('move', updateCurrentHover)
                map.on('resize', updateCurrentHover)
                map.on('error', (event) => {
                    if (!styleReady) {
                        setMapError(event.error?.message || 'Map failed to load')
                        setShowFallback(true)
                    }
                })
                map.on('load', () => {
                    if (disposed) return
                    styleReady = true
                    if (fallbackTimer) clearTimeout(fallbackTimer)
                    setShowFallback(false)
                    setMapLoaded(true)
                    requestAnimationFrame(() => {
                        map.resize()
                        updateCurrentHover()
                    })
                })

                resizeObserver = new ResizeObserver(() => {
                    map.resize()
                    updateCurrentHover()
                })
                resizeObserver.observe(containerRef.current)
            } catch (error) {
                setMapError(error instanceof Error ? error.message : 'Map failed to load')
            }
        }

        initializeMap()

        return () => {
            disposed = true
            if (fallbackTimer) clearTimeout(fallbackTimer)
            resizeObserver?.disconnect()
            markersRef.current.forEach((marker) => marker.remove())
            markersRef.current = []
            mapRef.current?.remove()
            mapRef.current = null
            mapboxRef.current = null
        }
    }, [updateHoverPosition, variant])

    useEffect(() => {
        hoveredRef.current = hovered
        updateHoverPosition(hovered)
    }, [hovered, updateHoverPosition])

    useEffect(() => {
        const map = mapRef.current
        const mapbox = mapboxRef.current
        if (!mapLoaded || !map || !mapbox) return

        markersRef.current.forEach((marker) => marker.remove())
        markersRef.current = []

        for (const memory of locatedMemories) {
            const isActive = variant === 'spatial' && memory.id === activeMemoryId
            const markerEl = document.createElement(variant === 'spatial' ? 'button' : 'div')
            markerEl.className = 'memory-map-marker'
            markerEl.dataset.active = String(isActive)
            markerEl.setAttribute('aria-label', memory.title)
            styleMarkerElement(markerEl, isActive, variant === 'spatial')

            if (variant === 'spatial') {
                markerEl.setAttribute('type', 'button')
                markerEl.addEventListener('mouseenter', () => setHovered(memory))
                markerEl.addEventListener('mouseleave', () => setHovered(null))
                markerEl.addEventListener('click', () => onSelectMemory?.(memory.id))
            }

            const marker = new mapbox.Marker({
                element: markerEl,
                anchor: 'center',
            })
                .setLngLat([memory.longitude, memory.latitude])
                .addTo(map)

            markersRef.current.push(marker)
        }

        if (locatedMemories.length === 1) {
            const [memory] = locatedMemories
            map.easeTo({
                center: [memory.longitude, memory.latitude],
                zoom: variant === 'detail' ? 11.35 : 11,
                pitch: 0,
                bearing: 0,
                duration: 500,
            })
            return
        }

        if (locatedMemories.length > 1) {
            const bounds = new mapbox.LngLatBounds()
            for (const memory of locatedMemories) {
                bounds.extend([memory.longitude, memory.latitude])
            }
            map.fitBounds(bounds, {
                padding: variant === 'spatial' ? 84 : 34,
                maxZoom: variant === 'spatial' ? 12 : 10.5,
                pitch: 0,
                bearing: 0,
                duration: 650,
            })
        }
    }, [activeMemoryId, locatedMemories, mapLoaded, onSelectMemory, variant])

    const detailPoint = variant === 'detail' ? locatedMemories[0] : null

    return (
        <div
            className={`memory-map memory-map-${variant} ${className}`}
            style={{
                position: 'relative',
                overflow: 'hidden',
                background: '#050505',
                ...(variant === 'detail'
                    ? {
                        height: 170,
                        minHeight: 170,
                        borderRadius: 12,
                        border: '0.5px solid rgba(255,255,255,0.09)',
                        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.03), 0 12px 30px rgba(0,0,0,0.22)',
                    }
                    : {
                        width: '100%',
                        height: '100%',
                        minHeight: '100%',
                    }),
            }}
        >
            <div
                ref={containerRef}
                style={{
                    position: 'absolute',
                    inset: 0,
                    minHeight: variant === 'detail' ? 170 : undefined,
                }}
            />

            {(mapError || showFallback) && (
                <FallbackMemoryMap
                    memories={locatedMemories}
                    variant={variant}
                    activeMemoryId={activeMemoryId}
                    onSelectMemory={onSelectMemory}
                    onHoverMemory={variant === 'spatial' ? setHovered : undefined}
                />
            )}

            {!mapError && !showFallback && locatedMemories.length === 0 && (
                <MapPlaceholder text="No EXIF GPS memories yet" />
            )}

            {variant === 'spatial' && hovered && hoverPoint && (
                <div
                    style={{
                        position: 'absolute',
                        zIndex: 5,
                        width: 220,
                        overflow: 'hidden',
                        border: '0.5px solid rgba(255,255,255,0.14)',
                        borderRadius: 8,
                        background: '#101010',
                        boxShadow: '0 18px 70px rgba(0,0,0,0.46), inset 0 1px 0 rgba(255,255,255,0.06)',
                        pointerEvents: 'none',
                        transform: 'translate(-50%, -100%)',
                        left: hoverPoint.x,
                        top: hoverPoint.y,
                    }}
                >
                    <div
                        style={{
                            position: 'relative',
                            aspectRatio: '4 / 3',
                            overflow: 'hidden',
                            background: '#000',
                        }}
                    >
                        {hovered.thumbnailUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={hovered.thumbnailUrl}
                                alt={hovered.title}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    opacity: 0.9,
                                }}
                            />
                        ) : (
                            <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.08)' }} />
                        )}
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'linear-gradient(to top, rgba(0,0,0,0.78), transparent 64%)',
                            }}
                        />
                        <div
                            style={{
                                position: 'absolute',
                                right: 0,
                                bottom: 0,
                                left: 0,
                                padding: 12,
                            }}
                        >
                            <h2
                                style={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    color: 'rgba(255,255,255,0.95)',
                                    fontSize: 13,
                                    fontWeight: 500,
                                }}
                            >
                                {hovered.title}
                            </h2>
                        </div>
                    </div>
                </div>
            )}

            {detailPoint && (
                <div
                    className="font-mono"
                    style={{
                        position: 'absolute',
                        right: 10,
                        bottom: 10,
                        left: 10,
                        zIndex: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        border: '0.5px solid rgba(255,255,255,0.10)',
                        borderRadius: 8,
                        background: 'rgba(0,0,0,0.70)',
                        padding: '7px 10px',
                        color: 'rgba(255,255,255,0.80)',
                        fontSize: 10,
                        lineHeight: 1,
                        backdropFilter: 'blur(24px) saturate(1.4)',
                        WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                    }}
                >
                    <span>EXIF GPS</span>
                    <span>{formatCoordinate(detailPoint.latitude, 'lat')} {formatCoordinate(detailPoint.longitude, 'lon')}</span>
                </div>
            )}
        </div>
    )
}

function FallbackMemoryMap({
    memories,
    variant,
    activeMemoryId,
    onSelectMemory,
    onHoverMemory,
}: {
    memories: LocatedMemory[]
    variant: MapVariant
    activeMemoryId?: string | null
    onSelectMemory?: (id: string) => void
    onHoverMemory?: (memory: LocatedMemory | null) => void
}) {
    return (
        <div
            style={{
                position: 'absolute',
                inset: 0,
                zIndex: 2,
                background: '#0b0b0b',
            }}
        >
            <svg
                viewBox="0 0 320 190"
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'block',
                }}
                preserveAspectRatio="xMidYMid slice"
                role="img"
                aria-label="Fallback memory location map"
            >
                <rect width="320" height="190" fill="#0b0b0b" />
                <path d="M0 95H320M160 0V190" stroke="#2a2a2a" strokeWidth="0.8" />
                <path d="M80 0V190M240 0V190M0 47.5H320M0 142.5H320" stroke="#1d1d1d" strokeWidth="0.7" />
                <path
                    d="M52 62C66 42 91 36 112 47C128 56 126 75 111 84C97 92 101 109 87 118C70 130 50 116 43 96C35 77 41 70 52 62Z"
                    fill="#eeeeee"
                    opacity="0.24"
                />
                <path
                    d="M92 126C110 118 130 132 134 151C139 173 115 184 101 167C89 153 78 136 92 126Z"
                    fill="#eeeeee"
                    opacity="0.22"
                />
                <path
                    d="M142 58C158 41 178 42 191 58C204 73 191 91 174 88C156 86 139 76 142 58Z"
                    fill="#eeeeee"
                    opacity="0.22"
                />
                <path
                    d="M178 91C197 80 220 86 232 107C244 129 235 156 215 164C195 172 181 149 186 124C190 105 164 103 178 91Z"
                    fill="#eeeeee"
                    opacity="0.23"
                />
                <path
                    d="M217 58C240 36 275 43 292 67C306 88 286 108 262 100C241 94 223 84 217 58Z"
                    fill="#eeeeee"
                    opacity="0.24"
                />
                <path
                    d="M265 134C278 124 298 131 303 149C309 171 287 180 273 165C263 155 255 143 265 134Z"
                    fill="#eeeeee"
                    opacity="0.2"
                />

                {memories.map((memory) => {
                    const x = ((memory.longitude + 180) / 360) * 320
                    const y = ((90 - memory.latitude) / 180) * 190
                    const active = variant === 'spatial' && memory.id === activeMemoryId

                    return (
                        <g
                            key={memory.id}
                            role={variant === 'spatial' ? 'button' : 'img'}
                            aria-label={memory.title}
                            tabIndex={variant === 'spatial' ? 0 : undefined}
                            style={{
                                cursor: variant === 'spatial' ? 'pointer' : 'default',
                                pointerEvents: variant === 'spatial' ? 'auto' : 'none',
                            }}
                            onMouseEnter={() => {
                                if (variant === 'spatial') onHoverMemory?.(memory)
                            }}
                            onMouseLeave={() => {
                                if (variant === 'spatial') onHoverMemory?.(null)
                            }}
                            onClick={() => {
                                if (variant === 'spatial') onSelectMemory?.(memory.id)
                            }}
                        >
                            <circle cx={x} cy={y} r={active ? 10 : 8} fill="rgba(255,255,255,0.18)" />
                            <circle cx={x} cy={y} r={active ? 5 : 4.2} fill="#f4f4f0" stroke="#050505" strokeWidth="1.6" />
                            <circle cx={x} cy={y} r="1.9" fill="#050505" />
                        </g>
                    )
                })}
            </svg>
            {variant === 'spatial' && memories.length === 0 && (
                <MapPlaceholder text="No EXIF GPS memories yet" />
            )}
        </div>
    )
}

function MapPlaceholder({ text }: { text: string }) {
    return (
        <div
            style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0d0d0d',
            }}
        >
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>{text}</p>
        </div>
    )
}

function toFiniteNumber(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined) return null

    const numericValue = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(numericValue)) return null
    if (Math.abs(numericValue) > 180) return null

    return numericValue
}

function formatCoordinate(value: number, axis: 'lat' | 'lon'): string {
    const direction = axis === 'lat'
        ? value >= 0 ? 'N' : 'S'
        : value >= 0 ? 'E' : 'W'

    return `${Math.abs(value).toFixed(4)}°${direction}`
}

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max)
}

function styleMarkerElement(markerEl: HTMLElement, active: boolean, interactive: boolean) {
    Object.assign(markerEl.style, {
        position: 'relative',
        display: 'block',
        width: active ? '22px' : '18px',
        height: active ? '22px' : '18px',
        padding: '0',
        border: '0',
        borderRadius: '999px',
        background: 'rgba(255,255,255,0.96)',
        boxShadow: active
            ? '0 0 0 1px rgba(0,0,0,0.86), 0 0 0 8px rgba(255,255,255,0.22), 0 16px 46px rgba(255,255,255,0.28)'
            : '0 0 0 1px rgba(0,0,0,0.82), 0 0 0 6px rgba(255,255,255,0.16), 0 14px 34px rgba(255,255,255,0.18)',
        cursor: interactive ? 'pointer' : 'default',
        pointerEvents: interactive ? 'auto' : 'none',
    })

    const center = document.createElement('span')
    Object.assign(center.style, {
        position: 'absolute',
        inset: active ? '6px' : '5px',
        borderRadius: 'inherit',
        background: '#050505',
    })
    markerEl.appendChild(center)
}
