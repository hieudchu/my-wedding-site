import { useState, useEffect } from 'react';
import { getMediaUrlAsync, getMediaSourcesAsync, listMedia } from '../lib/storage';

/**
 * Get a single media file URL by its storage path.
 * Waits for bucket availability check, then returns remote URL or localFallback.
 */
export function useMediaUrl(storagePath, localFallback = null) {
  const [url, setUrl] = useState(localFallback);

  useEffect(() => {
    let cancelled = false;
    getMediaUrlAsync(storagePath).then((remoteUrl) => {
      if (cancelled) return;
      setUrl(remoteUrl || localFallback);
    });
    return () => { cancelled = true; };
  }, [storagePath, localFallback]);

  return url;
}

/**
 * Mọi cỡ của một ảnh: { url, srcSet, small, full } — xem sourcesFor trong storage.js.
 * Không có trong kho thì dùng `localFallback` cho cả bốn.
 */
export function useMediaSources(storagePath, localFallback = null) {
  const fallback = localFallback
    ? { url: localFallback, srcSet: undefined, small: localFallback, full: localFallback }
    : null;
  const [sources, setSources] = useState(fallback);

  useEffect(() => {
    let cancelled = false;
    getMediaSourcesAsync(storagePath).then((found) => {
      if (!cancelled) setSources(found || fallback);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storagePath, localFallback]);

  return sources;
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
