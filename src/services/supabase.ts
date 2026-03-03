import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// TODO: Replace with your actual Supabase project URL
const SUPABASE_URL = 'https://your-project-ref.supabase.co';

// TODO: Replace with your actual Supabase anon (public) key
const SUPABASE_ANON_KEY = 'your-anon-key-here';

/**
 * Custom storage adapter using expo-secure-store for persisting
 * Supabase auth tokens securely on-device.
 */
const SecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
