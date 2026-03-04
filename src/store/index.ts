import { create } from 'zustand'

interface DebugState {
    // View state
    viewMode: 'grid' | 'detail'
    activeMemoryId: string | null

    // Debug panel
    debugOpen: boolean

    // Rendering controls
    pointSize: number      // base point size (0.1 – 3.0)
    samplePercent: number  // % of points to render (1 – 100)
    hlFullSample: boolean  // highlight layer: true = 100%, false = follow samplePercent

    // Runtime stats (set by PointCloud every frame)
    fps: number
    totalPoints: number
    renderedPoints: number
    rendererType: string   // 'WebGPU' or 'WebGL'

    set: (state: Partial<DebugState>) => void
}

export const useStore = create<DebugState>((set) => ({
    viewMode: 'grid',
    activeMemoryId: null,

    debugOpen: false,

    pointSize: 0.10,
    samplePercent: 30,
    hlFullSample: false,

    fps: 0,
    totalPoints: 0,
    renderedPoints: 0,
    rendererType: 'WebGL',

    set: (state) => set(state),
}))
