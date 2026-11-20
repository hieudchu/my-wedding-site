import { useState } from 'react';
import { useMediaSources } from '../hooks/useMedia';
import { useLightbox } from './Lightbox';
import { fitProps } from '../lib/fit';
import { useFrameSizes } from '../hooks/useFrameSizes';

/**
 * Ảnh lấy từ Supabase Storage.
 * Chuỗi fallback: URL Supabase → localFallback → ô .ph kẻ sọc có nhãn.
 * Bấm vào mở lightbox (trừ khi clickable={false}) — lightbox luôn nhận cỡ lớn nhất.
 *
 * `sizes` không khai tay nữa: useFrameSizes đo khung thật (kể cả độ phóng của khung admin
 * chỉnh) rồi mới gắn `src`/`srcset`, để trình duyệt chọn bản nén nhỏ nhất mà vẫn đủ điểm ảnh.
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
  loading = 'lazy',
}) {
  const sources = useMediaSources(storagePath, localFallback);
  // 0 = bản nén · 1 = lùi về ảnh gốc · 2 = hỏng hẳn, hiện ô kẻ sọc
  const [stage, setStage] = useState(0);
  const openLightbox = useLightbox();

  const useOriginal = stage === 1 || !sources?.srcSet;
  const src = stage === 2 ? null : (useOriginal ? (sources?.original || sources?.url) : sources?.url);
  // Bản nén: chờ đo khung xong mới gắn src/srcset (xem useFrameSizes). Ảnh gốc: gắn ngay.
  const [frameRef, sizes] = useFrameSizes(sources?.aspect, Boolean(src) && !useOriginal);
  const waiting = !useOriginal && !sizes;
  const handleClick = clickable && openLightbox ? () => openLightbox(sources?.full || src, label) : undefined;
  const interactive = handleClick
    ? { onClick: handleClick, role: 'button', tabIndex: 0 }
    : {};

  if (!src) {
    return <div className={`ph ${className}`.trim()} data-label={label} {...interactive} />;
  }

  return (
    <img
      ref={frameRef}
      // sizes → srcset → src: React gắn thuộc tính theo thứ tự này. Gắn src trước thì có
      // trình duyệt (WebKit) kịp tải luôn bản `src` rồi mới đọc srcset — tải hai lần.
      sizes={useOriginal || waiting ? undefined : sizes}
      srcSet={useOriginal || waiting ? undefined : sources.srcSet}
      src={waiting ? undefined : src}
      alt={alt || label || ''}
      {...fitProps(sources?.fit, className)}
      // Bản nén lỗi thì thử ảnh gốc một lần, rồi mới chịu hiện ô kẻ sọc
      onError={() => setStage((n) => (n === 0 && sources?.srcSet ? 1 : 2))}
      loading={loading}
      decoding="async"
      {...interactive}
    />
  );
}
