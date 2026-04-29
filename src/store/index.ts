import { create } from 'zustand'
import type { MemoryWithTraces } from '@/db'

/** Data returned by POST /api/generate — assets ready, not yet persisted */
export interface PendingMemory {
    title: string
    description: string
    thumbnail_url: string | null
    model_url: string | null
    model_full_url: string | null
    model_web_url: string | null
    model_garden_url: string | null
    photo_latitude: number | null
    photo_longitude: number | null
    photo_location_source: string | null
}

interface AppState {
    // 视图状态
    viewMode: 'grid' | 'detail' | 'garden' | 'spatial' | 'about'
    activeMemoryId: string | null

    // 从 API 加载的 memories 数据
    memories: MemoryWithTraces[]
    memoriesLoading: boolean

    // Generation state
    generating: boolean
    generatingProgress: string
    pendingMemory: PendingMemory | null

    // Debug 面板
    debugOpen: boolean

    // 渲染控制
    pointSize: number
    samplePercent: number
    hlFullSample: boolean
    orbitTarget: 'origin' | 'bbox'  // orbit controls look-at target

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

    // Highlight glow
    hlGlowIntensity: number

    // Post-processing effects
    postFxEnabled: boolean       // master switch — wraps the entire EffectComposer
    vignetteEnabled: boolean
    vignetteIntensity: number
    chromaticEnabled: boolean
    chromaticIntensity: number
    edgeBlurEnabled: boolean
    edgeBlurIntensity: number

    set: (state: Partial<AppState>) => void

    // 异步 actions
    fetchMemories: () => Promise<void>
    updateMemory: (id: string, data: Partial<{ title: string; description: string }>) => Promise<void>
    generateMemory: (imageFile: File) => Promise<PendingMemory>
    confirmMemory: (pending: PendingMemory, overrides: { title: string; creator_name: string; visibility: string }) => Promise<string>
    discardPendingMemory: () => void
}

export const useStore = create<AppState>((set, get) => ({
    viewMode: 'grid',
    activeMemoryId: null,

    memories: [],
    memoriesLoading: false,

    generating: false,
    generatingProgress: '',
    pendingMemory: null,

    debugOpen: false,

    pointSize: 0.02,
    samplePercent: 30,
    hlFullSample: false,
    orbitTarget: 'bbox',

    fps: 0,
    totalPoints: 0,
    renderedPoints: 0,
    rendererType: 'WebGL',

    raycastMode: false,
    pickedCoord: null,

    activeTileId: null,

    hlGlowIntensity: 2.0,

    postFxEnabled: true,
    vignetteEnabled: true,
    vignetteIntensity: 0.45,
    chromaticEnabled: true,
    chromaticIntensity: 0.003,
    edgeBlurEnabled: true,
    edgeBlurIntensity: 0.5,
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

    // Step 1: Upload image → ML inference → returns asset URLs (no DB record)
    generateMemory: async (imageFile: File) => {
        set({ generating: true, generatingProgress: 'Uploading image...' })
        try {
            set({ generatingProgress: 'Generating 3D model...' })

            const formData = new FormData()
            formData.append('image', imageFile)

            const res = await fetch('/api/generate', {
                method: 'POST',
                body: formData,
            })

            if (!res.ok) {
                let errorMsg = `Generation failed: ${res.status}`
                try {
                    const errBody = await res.json()
                    errorMsg = errBody.error || errorMsg
                } catch {
                    const text = await res.text().catch(() => '')
                    if (text) errorMsg = text
                }
                throw new Error(errorMsg)
            }

            const result = await res.json() as PendingMemory

            // Store as pending — user must confirm via preview modal
            set({
                generating: false,
                generatingProgress: '',
                pendingMemory: result,
            })
            return result
        } catch (err) {
            console.error('generateMemory failed:', err)
            set({ generating: false, generatingProgress: '' })
            throw err
        }
    },

    // Step 2: User confirms in preview modal → persist to DB + add to local store
    confirmMemory: async (pending, overrides) => {
        const memoryId = `mem_${crypto.randomUUID().replaceAll('-', '').slice(0, 20)}`

        const payload = {
            id: memoryId,
            title: overrides.title,
            description: pending.description,
            thumbnail_url: pending.thumbnail_url,
            model_url: pending.model_url,
            model_full_url: pending.model_full_url,
            model_web_url: pending.model_web_url,
            model_garden_url: pending.model_garden_url,
            photo_latitude: pending.photo_latitude,
            photo_longitude: pending.photo_longitude,
            photo_location_source: pending.photo_location_source,
            creator_name: overrides.creator_name || null,
            visibility: overrides.visibility,
        }

        const res = await fetch('/api/memories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })

        if (!res.ok) {
            const errBody = await res.json().catch(() => ({ error: 'Failed to save' }))
            throw new Error(errBody.error || 'Failed to save memory')
        }

        // Add to local store
        const newMemory: MemoryWithTraces = {
            ...payload,
            creator_name: overrides.creator_name || null,
            visibility: overrides.visibility,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            traces: [],
        }

        const memories = [...get().memories, newMemory]
        set({
            memories,
            pendingMemory: null,
            activeMemoryId: memoryId,
        })
        return memoryId
    },

    // Discard pending memory without saving
    discardPendingMemory: () => {
        set({ pendingMemory: null })
    },
}))
