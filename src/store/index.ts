import { create } from 'zustand'

// 从 localStorage 读取自定义名称
function loadCustomNames(): Record<string, string> {
    if (typeof window === 'undefined') return {}
    try {
        const raw = localStorage.getItem('memories-custom-names')
        return raw ? JSON.parse(raw) : {}
    } catch {
        return {}
    }
}

interface AppState {
    // 视图状态
    viewMode: 'grid' | 'detail'
    activeMemoryId: string | null

    // 自定义名称（用户编辑后的名称，key = memory id）
    customNames: Record<string, string>

    // Debug 面板
    debugOpen: boolean

    // 渲染控制
    pointSize: number      // 基础点大小 (0.1 – 3.0)
    samplePercent: number  // 渲染点的百分比 (1 – 100)

    // 运行时统计（由 PointCloud 每帧更新）
    fps: number
    totalPoints: number
    renderedPoints: number
    rendererType: string   // 'WebGPU' or 'WebGL'

    set: (state: Partial<AppState>) => void
    // 设置自定义名称并持久化到 localStorage
    setCustomName: (id: string, name: string) => void
}

export const useStore = create<AppState>((set, get) => ({
    viewMode: 'grid',
    activeMemoryId: null,

    customNames: loadCustomNames(),

    debugOpen: false,

    pointSize: 0.10,
    samplePercent: 50,

    fps: 0,
    totalPoints: 0,
    renderedPoints: 0,
    rendererType: 'WebGL',

    set: (state) => set(state),

    setCustomName: (id, name) => {
        const updated = { ...get().customNames, [id]: name }
        // 持久化到 localStorage
        try { localStorage.setItem('memories-custom-names', JSON.stringify(updated)) } catch { }
        set({ customNames: updated })
    },
}))
