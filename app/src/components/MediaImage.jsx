import { useState } from 'react';
import { useMediaUrl } from '../hooks/useMedia';
import { useLightbox } from './Lightbox';

/**
 * Ảnh lấy từ Supabase Storage.
 * Chuỗi fallback: URL Supabase → localFallback → ô .ph kẻ sọc có nhãn.
 * Bấm vào mở lightbox (trừ khi clickable={false}).
 *
 * Style do CSS của từng section quyết định — component chỉ gắn class.
 */
export default function MediaImage({
  storagePath,
  localFallback,
  label,
  alt = '',
  className = '',
  clickable = true,
}) {
  const remoteUrl = useMediaUrl(storagePath, localFallback);
  const [failed, setFailed] = useState(false);
  const openLightbox = useLightbox();

  const src = failed ? null : remoteUrl;
  const handleClick = clickable && openLightbox ? () => openLightbox(src, label) : undefined;
  const interactive = handleClick
    ? { onClick: handleClick, role: 'button', tabIndex: 0 }
    : {};

  if (!src) {
    return <div className={`ph ${className}`.trim()} data-label={label} {...interactive} />;
  }

  return (
    <img
      src={src}
      alt={alt || label || ''}
      className={className || undefined}
      onError={() => setFailed(true)}
      loading="lazy"
      decoding="async"
      {...interactive}
    />
  );
}
