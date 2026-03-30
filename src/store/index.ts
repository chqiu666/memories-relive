import { create } from 'zustand'
import type { MemoryWithTraces } from '@/db'

interface AppState {
    // 视图状态
    viewMode: 'grid' | 'detail' | 'garden'
    activeMemoryId: string | null

    // 从 API 加载的 memories 数据
    memories: MemoryWithTraces[]
    memoriesLoading: boolean

    // Debug 面板
    debugOpen: boolean

    // 渲染控制
    pointSize: number
    samplePercent: number
    hlFullSample: boolean

    // 运行时统计
    fps: number
    totalPoints: number
    renderedPoints: number
    rendererType: string

    // Raycaster 坐标拾取
    raycastMode: boolean
    pickedCoord: [number, number, number] | null

    // Info tiles
    activeTileId: string | null

    set: (state: Partial<AppState>) => void

    // 异步 actions
    fetchMemories: () => Promise<void>
    updateMemory: (id: string, data: Partial<{ title: string; description: string }>) => Promise<void>
}

export const useStore = create<AppState>((set, get) => ({
    viewMode: 'grid',
    activeMemoryId: null,

    memories: [],
    memoriesLoading: false,

    debugOpen: false,

    pointSize: 0.10,
    samplePercent: 30,
    hlFullSample: false,

    fps: 0,
    totalPoints: 0,
    renderedPoints: 0,
    rendererType: 'WebGL',

    raycastMode: false,
    pickedCoord: null,

    activeTileId: null,

    set: (state) => set(state),

    // 从 API 获取所有 memories
    fetchMemories: async () => {
        set({ memoriesLoading: true })
        try {
            const res = await fetch('/api/memories')
            if (!res.ok) throw new Error(`API 错误: ${res.status}`)
            const data = await res.json()
            set({ memories: data, memoriesLoading: false })
        } catch (err) {
            console.error('fetchMemories 失败:', err)
            set({ memoriesLoading: false })
        }
    },

    // 更新单个 memory 的元数据（如改名），并同步更新本地 store
    updateMemory: async (id, data) => {
        try {
            const res = await fetch(`/api/memories/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })
            if (!res.ok) throw new Error(`API 错误: ${res.status}`)

            // 乐观更新本地 store
            const memories = get().memories.map((m) =>
                m.id === id ? { ...m, ...data } : m
            )
            set({ memories })
        } catch (err) {
            console.error('updateMemory 失败:', err)
        }
    },
}))
