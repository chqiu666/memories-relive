import { create } from 'zustand'

interface State {
    viewMode: 'grid' | 'detail'
    activeMemoryId: string | null
    set: (state: Partial<State>) => void
}

export const useStore = create<State>((set) => ({
    viewMode: 'detail',
    activeMemoryId: 'gsapp-making',
    set: (state) => set(state),
}))
