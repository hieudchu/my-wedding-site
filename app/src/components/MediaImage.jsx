import { useState } from 'react';
import { useMediaUrl } from '../hooks/useMedia';
import { useLightbox } from './Lightbox';

/**
 * Renders an image from Supabase Storage.
 * Fallback chain: Supabase URL → localFallback → placeholder URL → .ph div
 * Clicking opens the lightbox overlay.
 */
export default function MediaImage({
  storagePath,
  localFallback,
  placeholder,
  label,
  alt = '',
  className = '',
  style,
  clickable = true,
}) {
  const remoteUrl = useMediaUrl(storagePath);
  const [failedSrc, setFailedSrc] = useState(new Set());
  const openLightbox = useLightbox();

  const sources = [remoteUrl, localFallback, placeholder].filter(Boolean);
  const activeSrc = sources.find((s) => !failedSrc.has(s));

  const handleClick = clickable && openLightbox
    ? () => openLightbox(activeSrc, label)
    : undefined;

  const clickProps = handleClick
    ? { onClick: handleClick, role: 'button', tabIndex: 0, style: { cursor: 'pointer', width: '100%', height: '100%', ...style } }
    : { style: { width: '100%', height: '100%', ...style } };

  if (!activeSrc) {
    return (
      <div
        className={`ph ${className}`}
        data-label={label}
        {...clickProps}
      />
    );
  }

  return (
    <img
      src={activeSrc}
      alt={alt || label || ''}
      className={className}
      style={{ objectFit: 'cover', ...clickProps.style }}
      onClick={handleClick}
      role={handleClick ? 'button' : undefined}
      tabIndex={handleClick ? 0 : undefined}
      onError={() => setFailedSrc((prev) => new Set(prev).add(activeSrc))}
      loading="lazy"
    />
  );
}
