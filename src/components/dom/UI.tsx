'use client'

import { useState, useRef, useEffect } from 'react'
import { useStore } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Pencil, Check } from 'lucide-react'
import memories from '@/data/memories.json'

export function UI() {
    const { viewMode, activeMemoryId, customNames, set, setCustomName } = useStore((s) => s)
    const activeMemory = memories.find((m) => m.id === activeMemoryId)

    // 编辑状态
    const [editing, setEditing] = useState(false)
    const [editValue, setEditValue] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    // 当前显示名称：优先使用自定义名称，否则使用 JSON 原始名称
    const displayName = activeMemory
        ? (customNames[activeMemory.id] || activeMemory.title)
        : ''

    // 进入编辑模式
    const startEdit = () => {
        setEditValue(displayName)
        setEditing(true)
    }

    // 保存编辑
    const commitEdit = () => {
        if (activeMemory && editValue.trim()) {
            setCustomName(activeMemory.id, editValue.trim())
        }
        setEditing(false)
    }

    // 取消编辑
    const cancelEdit = () => {
        setEditing(false)
    }

    // 编辑模式下自动聚焦 input
    useEffect(() => {
        if (editing && inputRef.current) {
            inputRef.current.focus()
            inputRef.current.select()
        }
    }, [editing])

    // 切换 memory 时退出编辑模式
    useEffect(() => {
        setEditing(false)
    }, [activeMemoryId])

    // 仅在 detail 模式显示
    if (viewMode !== 'detail') return null

    return (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8 z-10">
            {/* 顶部标题栏 */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-extralight tracking-[0.3em] uppercase text-white/90">
                        Memories Relive
                    </h1>
                </div>

                {/* 返回 Gallery */}
                <motion.button
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => set({ viewMode: 'grid', activeMemoryId: null })}
                    className="pointer-events-auto flex items-center gap-2 text-white/60 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-full backdrop-blur-sm border border-white/10 hover:bg-white/10"
                >
                    <ArrowLeft size={16} />
                    <span className="text-sm uppercase tracking-wider">Gallery</span>
                </motion.button>
            </div>

            {/* 底部 – 物品名称（可编辑） */}
            <div className="flex flex-col items-center pb-8">
                <AnimatePresence>
                    {activeMemory && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="text-center"
                        >
                            {/* 名称行：标题 + 编辑图标 */}
                            <div className="flex items-center justify-center gap-2 pointer-events-auto">
                                {editing ? (
                                    /* 编辑模式：内联 input */
                                    <div className="flex items-center gap-2">
                                        <input
                                            ref={inputRef}
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') commitEdit()
                                                if (e.key === 'Escape') cancelEdit()
                                            }}
                                            onBlur={commitEdit}
                                            className="bg-transparent border-b border-white/30 focus:border-white/70 outline-none text-2xl text-white font-thin tracking-widest uppercase text-center transition-colors duration-300 w-auto min-w-[120px]"
                                            style={{ width: `${Math.max(4, editValue.length) * 1.1}ch` }}
                                        />
                                        <button
                                            onMouseDown={(e) => { e.preventDefault(); commitEdit() }}
                                            className="text-white/40 hover:text-emerald-400 transition-colors duration-200"
                                            title="确认"
                                        >
                                            <Check size={16} strokeWidth={1.5} />
                                        </button>
                                    </div>
                                ) : (
                                    /* 显示模式：标题 + 铅笔图标 */
                                    <>
                                        <h2 className="text-2xl text-white font-thin tracking-widest uppercase">
                                            {displayName}
                                        </h2>
                                        <button
                                            onClick={startEdit}
                                            className="text-white/20 hover:text-white/60 transition-colors duration-300"
                                            title="编辑名称"
                                        >
                                            <Pencil size={14} strokeWidth={1.5} />
                                        </button>
                                    </>
                                )}
                            </div>

                            <p className="text-xs text-white/30 mt-2 tracking-wide">
                                {activeMemory.description}
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
