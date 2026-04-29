'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Pencil, Check } from 'lucide-react'

export function UI() {
    const { viewMode, activeMemoryId, memories, set, updateMemory } = useStore((s) => s)
    const router = useRouter()
    const activeMemory = memories.find((m) => m.id === activeMemoryId)

    // 编辑状态
    const [editing, setEditing] = useState(false)
    const [editValue, setEditValue] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    // 进入编辑模式
    const startEdit = () => {
        if (!activeMemory) return
        setEditValue(activeMemory.title)
        setEditing(true)
    }

    // 保存编辑
    const commitEdit = () => {
        if (activeMemory && editValue.trim()) {
            updateMemory(activeMemory.id, { title: editValue.trim() })
        }
        setEditing(false)
    }

    // 编辑模式下自动聚焦
    useEffect(() => {
        if (editing && inputRef.current) {
            inputRef.current.focus()
            inputRef.current.select()
        }
    }, [editing])

    // 切换 memory 时退出编辑
    useEffect(() => { setEditing(false) }, [activeMemoryId])

    if (viewMode !== 'detail') return null

    return (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8 z-10">
            {/* 顶部 – 返回按钮 */}
            <div className="flex justify-start items-start">
                <motion.button
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => {
                        set({ viewMode: 'grid', activeMemoryId: null })
                        router.push('/')
                    }}
                    className="pointer-events-auto flex items-center gap-2 text-white/60 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-full backdrop-blur-sm border border-white/10 hover:bg-white/10"
                >
                    <ArrowLeft size={16} />
                    <span className="text-sm tracking-wider">Gallery</span>
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
                            <div className="flex items-center justify-center gap-2 pointer-events-auto">
                                {editing ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            ref={inputRef}
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') commitEdit()
                                                if (e.key === 'Escape') setEditing(false)
                                            }}
                                            onBlur={commitEdit}
                                            className="bg-transparent border-b border-white/30 focus:border-white/70 outline-none text-2xl text-white font-thin tracking-wide text-center transition-colors duration-300 min-w-[120px]"
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
                                    <>
                                        <h2 className="text-2xl text-white font-thin tracking-wide">
                                            {activeMemory.title}
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
