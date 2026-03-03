import { supabase } from './supabase';
import type { MiniApp } from '../types/miniApp';

interface ServiceResult<T> {
  data: T | null;
  error: string | null;
}

/** Map a snake_case database row to our camelCase MiniApp type. */
function toMiniApp(row: any): MiniApp {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    icon: row.icon,
    color: row.color,
    schemaVersion: row.schema_version,
    isArchived: row.is_archived,
    usageCount: row.usage_count,
    lastOpenedAt: row.last_opened_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Fetch all non-archived mini-apps for a given user,
 * ordered by most recently updated first.
 */
export async function fetchApps(
  userId: string
): Promise<ServiceResult<MiniApp[]>> {
  const { data, error } = await supabase
    .from('mini_apps')
    .select('*')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .order('updated_at', { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: (data ?? []).map(toMiniApp), error: null };
}

/**
 * Insert a new mini-app row.
 */
export async function createApp(
  app: Pick<MiniApp, 'userId' | 'name' | 'description' | 'icon' | 'color'>
): Promise<ServiceResult<MiniApp>> {
  const { data, error } = await supabase
    .from('mini_apps')
    .insert({
      user_id: app.userId,
      name: app.name,
      description: app.description,
      icon: app.icon,
      color: app.color,
    })
    .select('*')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: toMiniApp(data), error: null };
}

/**
 * Partially update a mini-app by id.
 */
export async function updateApp(
  id: string,
  updates: Partial<Pick<MiniApp, 'name' | 'description' | 'icon' | 'color' | 'isArchived'>>
): Promise<ServiceResult<MiniApp>> {
  const dbUpdates: Record<string, any> = {};

  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
  if (updates.color !== undefined) dbUpdates.color = updates.color;
  if (updates.isArchived !== undefined) dbUpdates.is_archived = updates.isArchived;

  const { data, error } = await supabase
    .from('mini_apps')
    .update(dbUpdates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: toMiniApp(data), error: null };
}

/**
 * Permanently delete a mini-app by id.
 */
export async function deleteApp(id: string): Promise<ServiceResult<void>> {
  const { error } = await supabase
    .from('mini_apps')
    .delete()
    .eq('id', id);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: null, error: null };
}

/**
 * Soft-delete: mark a mini-app as archived.
 */
export async function archiveApp(id: string): Promise<ServiceResult<MiniApp>> {
  return updateApp(id, { isArchived: true });
}
