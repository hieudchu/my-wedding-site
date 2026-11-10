import { useState } from 'react';
import { useMediaSources } from '../hooks/useMedia';
import { useLightbox } from './Lightbox';
import { fitProps } from '../lib/fit';

/**
 * Ảnh lấy từ Supabase Storage.
 * Chuỗi fallback: URL Supabase → localFallback → ô .ph kẻ sọc có nhãn.
 * Bấm vào mở lightbox (trừ khi clickable={false}) — lightbox luôn nhận cỡ lớn nhất.
 *
 * `sizes` cho trình duyệt biết ảnh chiếm bao rộng trên màn hình, để nó tự chọn
 * bản nén vừa đủ trong `srcset`. Thiếu `sizes` thì trình duyệt coi ảnh rộng bằng cả
 * màn hình và tải bản to hơn cần thiết.
 *
 * Style do CSS của từng section quyết định — component chỉ gắn class. Ngoại lệ là
 * khung admin đã chỉnh (`sources.fit`): gắn class `has-fit` + biến CSS, xem lib/fit.js.
 * Lightbox vẫn mở ảnh đầy đủ, khung chỉ chọn phần hiện trong ô.
 */
export default function MediaImage({
  storagePath,
  localFallback,
  label,
  alt = '',
  className = '',
  clickable = true,
  sizes,
}) {
  const sources = useMediaSources(storagePath, localFallback);
  // 0 = bản nén · 1 = lùi về ảnh gốc · 2 = hỏng hẳn, hiện ô kẻ sọc
  const [stage, setStage] = useState(0);
  const openLightbox = useLightbox();

  const useOriginal = stage === 1 || !sources?.srcSet;
  const src = stage === 2 ? null : (useOriginal ? (sources?.original || sources?.url) : sources?.url);
  const handleClick = clickable && openLightbox ? () => openLightbox(sources?.full || src, label) : undefined;
  const interactive = handleClick
    ? { onClick: handleClick, role: 'button', tabIndex: 0 }
    : {};

  if (!src) {
    return <div className={`ph ${className}`.trim()} data-label={label} {...interactive} />;
  }

  return (
    <img
      src={src}
      srcSet={useOriginal ? undefined : sources.srcSet}
      sizes={useOriginal ? undefined : sizes}
      alt={alt || label || ''}
      {...fitProps(sources?.fit, className)}
      // Bản nén lỗi thì thử ảnh gốc một lần, rồi mới chịu hiện ô kẻ sọc
      onError={() => setStage((n) => (n === 0 && sources?.srcSet ? 1 : 2))}
      loading="lazy"
      decoding="async"
      {...interactive}
    />
  );
}
