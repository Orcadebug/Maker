export type SubscriptionTier = 'free' | 'pro';

export interface SubscriptionLimits {
  maxApps: number;
  maxGenerationsPerDay: number;
  maxRefinementsPerDay: number;
  availableModels: string[];
  cloudSync: boolean;
}

export const TIER_LIMITS: Record<SubscriptionTier, SubscriptionLimits> = {
  free: {
    maxApps: 3,
    maxGenerationsPerDay: 5,
    maxRefinementsPerDay: 20,
    availableModels: ['auto'],
    cloudSync: false,
  },
  pro: {
    maxApps: Infinity,
    maxGenerationsPerDay: Infinity,
    maxRefinementsPerDay: Infinity,
    availableModels: ['auto', 'claude-sonnet', 'gpt-4o', 'claude-haiku', 'gpt-4o-mini'],
    cloudSync: true,
  },
};
