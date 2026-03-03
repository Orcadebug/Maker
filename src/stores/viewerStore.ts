import { create } from 'zustand';
import type { RenderResponse } from '../types/miniApp';

interface ViewerState {
  renderResponse: RenderResponse | null;
  isLoading: boolean;
  error: string | null;
  inputValues: Record<string, any>;
}

interface ViewerActions {
  setRenderResponse: (response: RenderResponse | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setInputValue: (id: string, value: any) => void;
  clearInputValues: () => void;
  reset: () => void;
}

export type ViewerStore = ViewerState & ViewerActions;

const initialState: ViewerState = {
  renderResponse: null,
  isLoading: false,
  error: null,
  inputValues: {},
};

export const useViewerStore = create<ViewerStore>((set) => ({
  ...initialState,

  setRenderResponse: (renderResponse) =>
    set({ renderResponse, error: null }),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  setInputValue: (id, value) =>
    set((state) => ({
      inputValues: { ...state.inputValues, [id]: value },
    })),

  clearInputValues: () => set({ inputValues: {} }),

  reset: () => set(initialState),
}));
