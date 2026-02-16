import { create } from 'zustand'

interface State {
    viewMode: 'grid' | 'detail'
    activeMemoryId: string | null
    timeState: number // 0 to 1
    set: (state: Partial<State>) => void
}

export const useStore = create<State>((set) => ({
    viewMode: 'detail', // Start in detail for testing shader
    activeMemoryId: 'gsapp-making',
    timeState: 0,
    set: (state) => set(state),
}))
