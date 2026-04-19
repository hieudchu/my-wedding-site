import { useState, useEffect } from 'react';
import { getMediaUrl, listMedia } from '../lib/storage';

/**
 * Get a single media file URL by its storage path.
 * Falls back to a local path if Supabase is not configured.
 */
export function useMediaUrl(storagePath, localFallback = null) {
  const url = getMediaUrl(storagePath);
  return url || localFallback;
}

/**
 * List all files in a storage folder.
 * Returns { files: [{ name, url }], loading }.
 */
export function useMediaList(folder) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listMedia(folder)
      .then((result) => {
        if (!cancelled) {
          setFiles(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [folder]);

  return { files, loading };
}
