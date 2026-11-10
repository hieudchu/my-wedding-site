import { useState, useEffect } from 'react';

export const PHONE_MAX = 760;   // rộng dưới ngưỡng này là điện thoại (dọc)
export const PHONE_MAX_H = 520; // HOẶC cao không quá ngưỡng này (điện thoại quay ngang)
export const TABLET_MAX = 1080;

// SỬA 11 — điểm ngắt xét cả chiều cao. Chuỗi này phải khớp TỪNG KÝ TỰ với media
// query ở sections.css (khối "ĐIỆN THOẠI"). Đổi một bên mà quên bên kia là vỡ bố cục.
// Tablet / máy gập DỌC (rộng < 1200px, tỉ lệ ≤ 5:6) và mọi màn CẢM ỨNG rộng < 1440px
// (tablet / máy gập quay ngang) cũng dùng bố cục điện thoại.
export const PHONE_QUERY =
  '(max-width: 759.98px), (max-height: 520px), (max-width: 1199.98px) and (max-aspect-ratio: 5/6), (hover: none) and (pointer: coarse) and (max-width: 1439.98px)';
export const COARSE_QUERY = '(hover: none) and (pointer: coarse)';

// SỬA 3 — iOS bắn `resize` mỗi lần thanh địa chỉ thu/giãn (60–100px). Trên thiết bị
// cảm ứng, đổi chiều cao dưới ngưỡng này mà bề ngang giữ nguyên thì coi là thanh địa
// chỉ, bỏ qua. Xoay máy luôn đổi bề ngang nên không bị chặn nhầm.
const ADDRESS_BAR_SLACK = 120;

export function mqMatches(q) {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(q).matches;
}

export function onMediaChange(q, fn) {
  const m = window.matchMedia(q);
  if (m.addEventListener) {
    m.addEventListener('change', fn);
    return () => m.removeEventListener('change', fn);
  }
  m.addListener(fn); // Safari < 14
  return () => m.removeListener(fn);
}

/**
 * Kích thước khung nhìn + cờ "đang ở bố cục điện thoại".
 *
 * `isPhone` đọc từ matchMedia chứ không so sánh bề ngang, để khớp đúng với CSS.
 */
export function useViewport() {
  const [size, setSize] = useState(() => ({
    vw: typeof window !== 'undefined' ? window.innerWidth : 1280,
    vh: typeof window !== 'undefined' ? window.innerHeight : 800,
  }));
  const [isPhone, setIsPhone] = useState(() => mqMatches(PHONE_QUERY));

  useEffect(() => {
    const coarse = mqMatches(COARSE_QUERY);
    const read = () => setSize((prev) => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (coarse && vw === prev.vw && Math.abs(vh - prev.vh) < ADDRESS_BAR_SLACK) return prev; // SỬA 3
      return vw === prev.vw && vh === prev.vh ? prev : { vw, vh };
    });
    const onOrientation = () => {
      read();
      setTimeout(read, 250); // iOS báo kích thước cũ ngay lúc xoay
    };
    read();
    setIsPhone(mqMatches(PHONE_QUERY));
    const offPhone = onMediaChange(PHONE_QUERY, () => setIsPhone(mqMatches(PHONE_QUERY)));
    window.addEventListener('resize', read);
    window.addEventListener('orientationchange', onOrientation);
    return () => {
      offPhone();
      window.removeEventListener('resize', read);
      window.removeEventListener('orientationchange', onOrientation);
    };
  }, []);

  return { ...size, isPhone, isTablet: !isPhone && size.vw < TABLET_MAX };
}
