import { create } from 'zustand';
import type { MiniApp } from '../types/miniApp';

interface MiniAppState {
  apps: MiniApp[];
  isLoading: boolean;
  error: string | null;
}

interface MiniAppActions {
  setApps: (apps: MiniApp[]) => void;
  addApp: (app: MiniApp) => void;
  updateApp: (id: string, updates: Partial<MiniApp>) => void;
  removeApp: (id: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export type MiniAppStore = MiniAppState & MiniAppActions;

export const useMiniAppStore = create<MiniAppStore>((set) => ({
  // State
  apps: [],
  isLoading: false,
  error: null,

  // Actions
  setApps: (apps) => set({ apps, error: null }),

  addApp: (app) =>
    set((state) => ({
      apps: [app, ...state.apps],
      error: null,
    })),

  updateApp: (id, updates) =>
    set((state) => ({
      apps: state.apps.map((app) =>
        app.id === id ? { ...app, ...updates } : app
      ),
    })),

  removeApp: (id) =>
    set((state) => ({
      apps: state.apps.filter((app) => app.id !== id),
    })),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
