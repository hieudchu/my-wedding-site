import { useState } from 'react';
import { useMediaUrl } from '../hooks/useMedia';

/**
 * Renders an image from Supabase Storage.
 * Fallback chain: Supabase URL → localFallback → placeholder URL → .ph div
 */
export default function MediaImage({
  storagePath,
  localFallback,
  placeholder,
  label,
  alt = '',
  className = '',
  style,
}) {
  const remoteUrl = useMediaUrl(storagePath);
  const [failedSrc, setFailedSrc] = useState(new Set());

  const sources = [remoteUrl, localFallback, placeholder].filter(Boolean);
  const activeSrc = sources.find((s) => !failedSrc.has(s));

  if (!activeSrc) {
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
      src={activeSrc}
      alt={alt || label || ''}
      className={className}
      style={{ width: '100%', height: '100%', objectFit: 'cover', ...style }}
      onError={() => setFailedSrc((prev) => new Set(prev).add(activeSrc))}
      loading="lazy"
    />
  );
}
