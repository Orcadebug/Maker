import { create } from 'zustand';
import type { SubscriptionTier } from '../types/subscription';
import { TIER_LIMITS } from '../types/subscription';

interface SubscriptionState {
  tier: SubscriptionTier;
  generationsToday: number;
  refinementsToday: number;
  isLoading: boolean;
}

interface SubscriptionActions {
  setTier: (tier: SubscriptionTier) => void;
  incrementGenerations: () => void;
  incrementRefinements: () => void;
  resetDailyCounts: () => void;
  setLoading: (isLoading: boolean) => void;
}

export type SubscriptionStore = SubscriptionState & SubscriptionActions;

export const useSubscriptionStore = create<SubscriptionStore>((set) => ({
  // State
  tier: 'free',
  generationsToday: 0,
  refinementsToday: 0,
  isLoading: false,

  // Actions
  setTier: (tier) => set({ tier }),

  incrementGenerations: () =>
    set((state) => ({
      generationsToday: state.generationsToday + 1,
    })),

  incrementRefinements: () =>
    set((state) => ({
      refinementsToday: state.refinementsToday + 1,
    })),

  resetDailyCounts: () =>
    set({
      generationsToday: 0,
      refinementsToday: 0,
    }),

  setLoading: (isLoading) => set({ isLoading }),
}));

/** Selector: whether the user can generate a new app today */
export const selectCanGenerate = (state: SubscriptionStore): boolean => {
  const limits = TIER_LIMITS[state.tier];
  return state.generationsToday < limits.maxGenerationsPerDay;
};

/** Selector: whether the user can refine an app today */
export const selectCanRefine = (state: SubscriptionStore): boolean => {
  const limits = TIER_LIMITS[state.tier];
  return state.refinementsToday < limits.maxRefinementsPerDay;
};
