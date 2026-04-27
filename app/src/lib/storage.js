import { supabase, supabaseConfigured } from './supabase';

const BUCKET = 'media';

// Cache of files known to exist in storage, keyed by folder
const folderCache = new Map();

/**
 * List and cache all files in a storage folder.
 */
async function getCachedFolder(folder) {
  if (folderCache.has(folder)) return folderCache.get(folder);
  if (!supabaseConfigured) { folderCache.set(folder, []); return []; }

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(folder, { sortBy: { column: 'name', order: 'asc' } });

    const files = (!error && data)
      ? data.filter((f) => !f.id?.endsWith('/') && f.name !== '.emptyFolderPlaceholder').map((f) => f.name)
      : [];
    folderCache.set(folder, files);
    return files;
  } catch {
    folderCache.set(folder, []);
    return [];
  }
}

// Cache-bust token — set once per page load so URLs are consistent
// within a session but always fresh across reloads / deploys.
const cacheBust = Date.now();

/**
 * Build the public URL for a file (does not check existence).
 * Appends a cache-bust param so CDN serves the latest version.
 */
function buildPublicUrl(path) {
  if (!supabaseConfigured) return null;
  try {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    if (!data?.publicUrl) return null;
    return `${data.publicUrl}?t=${cacheBust}`;
  } catch {
    return null;
  }
}

/**
 * Get public URL for a file only if it actually exists in storage.
 * Checks the folder listing cache. Returns null if file is not found.
 */
export async function getMediaUrlAsync(path) {
  if (!supabaseConfigured) return null;
  const lastSlash = path.lastIndexOf('/');
  const folder = lastSlash > 0 ? path.substring(0, lastSlash) : '';
  const fileName = lastSlash > 0 ? path.substring(lastSlash + 1) : path;

  const files = await getCachedFolder(folder);
  if (!files.includes(fileName)) return null;
  return buildPublicUrl(path);
}

/**
 * Synchronous version — returns URL only if the folder was already cached
 * and the file is known to exist. Otherwise returns null.
 */
export function getMediaUrl(path) {
  if (!supabaseConfigured) return null;
  const lastSlash = path.lastIndexOf('/');
  const folder = lastSlash > 0 ? path.substring(0, lastSlash) : '';
  const fileName = lastSlash > 0 ? path.substring(lastSlash + 1) : path;

  if (!folderCache.has(folder)) return null;
  const files = folderCache.get(folder);
  if (!files.includes(fileName)) return null;
  return buildPublicUrl(path);
}

/**
 * List all files in a storage folder, sorted by name.
 * Returns array of { name, url } objects.
 */
export async function listMedia(folder) {
  const files = await getCachedFolder(folder);
  return files.map((name) => ({
    name,
    url: buildPublicUrl(`${folder}/${name}`),
  }));
}
