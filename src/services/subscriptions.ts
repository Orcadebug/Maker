import { supabase } from './supabase';
import type { SubscriptionTier } from '../types/subscription';
import { TIER_LIMITS } from '../types/subscription';

interface SubscriptionStatus {
  tier: SubscriptionTier;
  generationsToday: number;
  refinementsToday: number;
}

interface ServiceResult<T> {
  data: T | null;
  error: string | null;
}

/**
 * Fetch the current subscription status for a user, including
 * their tier and how many generations / refinements they have
 * used today.
 */
export async function getSubscriptionStatus(
  userId: string
): Promise<ServiceResult<SubscriptionStatus>> {
  // Fetch the profile to get the tier
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', userId)
    .single();

  if (profileError) {
    return { data: null, error: profileError.message };
  }

  // Fetch today's usage counts from a usage_logs table (or similar)
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const { count: generationsToday, error: genError } = await supabase
    .from('usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action', 'generate')
    .gte('created_at', `${today}T00:00:00.000Z`);

  if (genError) {
    return { data: null, error: genError.message };
  }

  const { count: refinementsToday, error: refError } = await supabase
    .from('usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action', 'refine')
    .gte('created_at', `${today}T00:00:00.000Z`);

  if (refError) {
    return { data: null, error: refError.message };
  }

  return {
    data: {
      tier: profile.subscription_tier as SubscriptionTier,
      generationsToday: generationsToday ?? 0,
      refinementsToday: refinementsToday ?? 0,
    },
    error: null,
  };
}

/**
 * Check whether a user is allowed to generate a new app right now.
 */
export async function checkCanGenerate(
  userId: string
): Promise<ServiceResult<boolean>> {
  const { data, error } = await getSubscriptionStatus(userId);

  if (error || !data) {
    return { data: null, error: error ?? 'Failed to fetch subscription status' };
  }

  const limits = TIER_LIMITS[data.tier];
  const allowed = data.generationsToday < limits.maxGenerationsPerDay;

  return { data: allowed, error: null };
}

/**
 * Check whether a user is allowed to refine an app right now.
 */
export async function checkCanRefine(
  userId: string
): Promise<ServiceResult<boolean>> {
  const { data, error } = await getSubscriptionStatus(userId);

  if (error || !data) {
    return { data: null, error: error ?? 'Failed to fetch subscription status' };
  }

  const limits = TIER_LIMITS[data.tier];
  const allowed = data.refinementsToday < limits.maxRefinementsPerDay;

  return { data: allowed, error: null };
}
