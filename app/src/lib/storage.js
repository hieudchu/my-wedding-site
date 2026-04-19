import { supabase, supabaseConfigured } from './supabase';

const BUCKET = 'media';

/**
 * Get public URL for a file in the media bucket.
 * Returns null if Supabase is not configured.
 */
export function getMediaUrl(path) {
  if (!supabaseConfigured) return null;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl || null;
}

/**
 * List all files in a storage folder, sorted by name.
 * Returns array of { name, url } objects.
 */
export async function listMedia(folder) {
  if (!supabaseConfigured) return [];

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(folder, { sortBy: { column: 'name', order: 'asc' } });

  if (error || !data) return [];

  return data
    .filter((f) => !f.id?.endsWith('/') && f.name !== '.emptyFolderPlaceholder')
    .map((f) => ({
      name: f.name,
      url: getMediaUrl(`${folder}/${f.name}`),
    }));
}
