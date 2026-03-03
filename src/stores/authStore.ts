import { create } from 'zustand';
import type { User, Profile } from '../types/auth';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: any | null;
  isLoading: boolean;
}

interface AuthActions {
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setSession: (session: any | null) => void;
  setLoading: (isLoading: boolean) => void;
  signOut: () => void;
  initialize: (session: any, user: User, profile: Profile) => void;
}

export type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set) => ({
  // State
  user: null,
  profile: null,
  session: null,
  isLoading: true,

  // Computed getter is accessed via: useAuthStore.getState().session !== null
  // Or use a selector: useAuthStore((s) => s.session !== null)

  // Actions
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setSession: (session) => set({ session }),
  setLoading: (isLoading) => set({ isLoading }),

  signOut: () =>
    set({
      user: null,
      profile: null,
      session: null,
      isLoading: false,
    }),

  initialize: (session, user, profile) =>
    set({
      session,
      user,
      profile,
      isLoading: false,
    }),
}));

/** Selector: whether the user is currently authenticated */
export const selectIsAuthenticated = (state: AuthStore): boolean =>
  state.session !== null;
