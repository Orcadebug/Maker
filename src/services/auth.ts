import { supabase } from './supabase';
import type { Profile } from '../types/auth';

interface AuthResult<T = void> {
  data: T | null;
  error: string | null;
}

/**
 * Create a new account with email, password, and display name.
 * The display name is stored in user_metadata so it can be
 * picked up by a database trigger to populate the profiles table.
 */
export async function signUp(
  email: string,
  password: string,
  name: string
): Promise<AuthResult> {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: name },
    },
  });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: null, error: null };
}

/**
 * Sign in with email and password.
 */
export async function signIn(
  email: string,
  password: string
): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: null, error: null };
}

/**
 * Sign the current user out and clear their session.
 */
export async function signOut(): Promise<AuthResult> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: null, error: null };
}

/**
 * Send a password-reset email to the given address.
 */
export async function resetPassword(email: string): Promise<AuthResult> {
  const { error } = await supabase.auth.resetPasswordForEmail(email);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: null, error: null };
}

/**
 * Fetch the full profile row for a given user id.
 */
export async function getProfile(
  userId: string
): Promise<AuthResult<Profile>> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: {
      id: data.id,
      email: data.email,
      displayName: data.display_name,
      avatarUrl: data.avatar_url,
      subscriptionTier: data.subscription_tier,
      tokensUsedThisMonth: data.tokens_used_this_month,
      tokenResetDate: data.token_reset_date,
      onboardingCompleted: data.onboarding_completed,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    } as Profile,
    error: null,
  };
}

/**
 * Partially update a user's profile.
 */
export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, 'displayName' | 'avatarUrl' | 'onboardingCompleted'>>
): Promise<AuthResult<Profile>> {
  const dbUpdates: Record<string, any> = {};

  if (updates.displayName !== undefined) {
    dbUpdates.display_name = updates.displayName;
  }
  if (updates.avatarUrl !== undefined) {
    dbUpdates.avatar_url = updates.avatarUrl;
  }
  if (updates.onboardingCompleted !== undefined) {
    dbUpdates.onboarding_completed = updates.onboardingCompleted;
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(dbUpdates)
    .eq('id', userId)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: {
      id: data.id,
      email: data.email,
      displayName: data.display_name,
      avatarUrl: data.avatar_url,
      subscriptionTier: data.subscription_tier,
      tokensUsedThisMonth: data.tokens_used_this_month,
      tokenResetDate: data.token_reset_date,
      onboardingCompleted: data.onboarding_completed,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    } as Profile,
    error: null,
  };
}
