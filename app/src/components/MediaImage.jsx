import { useState } from 'react';
import { useMediaUrl } from '../hooks/useMedia';

/**
 * Renders an image from Supabase Storage.
 * Falls back to localFallback path, then to a placeholder div.
 *
 * @param {string} storagePath — path in the media bucket (e.g. "portraits/groom.jpg")
 * @param {string} localFallback — local fallback path (e.g. "/assets/medallion-gold.png")
 * @param {string} label — placeholder label text (shown when no image)
 * @param {string} alt — img alt text
 * @param {string} className — additional CSS classes
 * @param {object} style — inline styles
 */
export default function MediaImage({ storagePath, localFallback, label, alt = '', className = '', style }) {
  const remoteUrl = useMediaUrl(storagePath);
  const [failed, setFailed] = useState(false);

  const src = remoteUrl && !failed ? remoteUrl : localFallback;

  if (!src) {
    return (
      <div
        className={`ph ${className}`}
        data-label={label}
        style={{ width: '100%', height: '100%', ...style }}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt || label || ''}
      className={className}
      style={{ width: '100%', height: '100%', objectFit: 'cover', ...style }}
      onError={() => {
        if (!failed) setFailed(true);
      }}
      loading="lazy"
    />
  );
}
