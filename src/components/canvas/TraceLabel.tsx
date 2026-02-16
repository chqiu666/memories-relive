'use client'

import { Html } from '@react-three/drei'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'

interface TraceLabelProps {
    position: [number, number, number]
    label: string
    description: string
    // Optional: active state or selection logic
}

export function TraceLabel({ position, label, description }: TraceLabelProps) {
    const [hovered, setHovered] = useState(false)

    return (
        <group position={position}>
            {/* Visual Marker on the point (glow or dot) */}
            <mesh
                onPointerOver={() => setHovered(true)}
                onPointerOut={() => setHovered(false)}
            >
                <sphereGeometry args={[0.05, 16, 16]} />
                <meshBasicMaterial color="white" transparent opacity={0.5} />
            </mesh>

            {/* Line connecting point to label (optional, could be done with CSS or Line component) */}

            <Html
                position={[0, 0, 0]} // Relative to group
                zIndexRange={[100, 0]} // Always on top or depth sorted? Standard behavior usually fine.
                center // Center the HTML on the point
                distanceFactor={10} // Scale with distance
                style={{ pointerEvents: 'none' }} // Outer container no events
            >
                <div
                    className={clsx(
                        "pointer-events-auto transition-all duration-500 ease-out flex flex-col items-center",
                        hovered ? "scale-110 z-50" : "scale-90 opacity-80"
                    )}
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                >
                    {/* The Glass Tile */}
                    <div className="backdrop-blur-md bg-white/10 border border-white/20 p-4 rounded-lg shadow-2xl w-48 text-left relative mt-4">
                        {/* Connecting line visual in CSS */}
                        <div className="absolute -top-4 left-1/2 w-0.5 h-4 bg-white/50 -translate-x-1/2"></div>

                        <h3 className="text-white font-bold text-sm tracking-wider mb-1">{label}</h3>

                        <AnimatePresence>
                            {hovered && (
                                <motion.p
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="text-gray-300 text-xs leading-relaxed overflow-hidden"
                                >
                                    {description}
                                </motion.p>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </Html>
        </group>
    )
}
