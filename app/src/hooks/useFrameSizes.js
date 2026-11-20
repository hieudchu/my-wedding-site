import { useLayoutEffect, useRef, useState } from 'react';

/**
 * `sizes` đúng bằng số điểm ảnh khung thật cần, đo từ chính thẻ <img>.
 *
 * Trước 11/2026 mỗi chỗ tự khai `sizes` bằng tay ("45vw", "40vw"…) và lệch khung thật
 * tới 1,5–2 lần (rõ nhất ở điện thoại xoay ngang) → tải bản nén lớn hơn cần. Ở đây:
 *
 *   bề rộng ảnh cần (px CSS) = bề rộng phần ảnh đang vẽ × độ phóng của khung (--fz)
 *
 * - Phần ảnh đang vẽ: `object-fit: cover` phủ khung, nên ảnh dọc trong khung "béo" hơn tỉ
 *   lệ của nó bị vẽ RỘNG hơn khung — tính bằng `aspect` (rộng/cao của ảnh).
 * - `--fz` đọc từ CSS đã áp (img.has-fit): máy tính và điện thoại có độ phóng riêng, nên
 *   mỗi bố cục chỉ tải đúng phần nó cần.
 * - offsetWidth/offsetHeight là khung bố cục, không tính transform (thẻ hero đang nghiêng,
 *   coverflow lùi xa) — đúng ý: thẻ đó trượt vào giữa là hiện cỡ thật.
 * Trình duyệt nhân thêm devicePixelRatio rồi chọn file nhỏ nhất ≥ mức đó trong `srcset`,
 * nên ảnh không bao giờ ít điểm ảnh hơn chỗ hiển thị (trừ khi ảnh gốc nhỏ hơn).
 *
 * Chừa dư (HEADROOM): file vừa khít số điểm ảnh vẫn kém nét hơn một chút so với file lớn
 * hơn được trình duyệt thu nhỏ. Đo 11/2026 (vẽ đúng khung/zoom/DPR, so với khi vẽ bằng
 * ảnh gốc 3000px, 12 ca): AVIF dư 1,25× bằng hoặc nét hơn bản WebP trước đó ở mọi ca;
 * vừa khít (1×) thì ảnh cô dâu màn ngang kém đi. Chủ thiệp ưu tiên độ nét. WebP (trình duyệt
 * không đọc AVIF, ảnh mới upload chưa chạy scripts/make-avif.mjs) dùng cùng mức dư.
 *
 * Trả `null` tới khi đo được: thẻ <img> chưa có `src`, nên chưa tải gì. Đo trong
 * useLayoutEffect → lượt vẽ lại xảy ra trước khi trình duyệt vẽ màn hình, không chậm thêm.
 * Khung rộng 0 (display: none, ví dụ ảnh chỉ dành cho máy tính) thì không tải; ResizeObserver
 * báo khi khung hiện ra. `sizes` chỉ tăng, không giảm: xoay máy/thu cửa sổ không cần tải lại.
 */
export const HEADROOM = 1.25;

export function useFrameSizes(aspect, active = true) {
  const ref = useRef(null);
  const [px, setPx] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!active || !el) return undefined;
    const measure = () => {
      const bw = el.offsetWidth;
      const bh = el.offsetHeight;
      if (!bw) return;
      const cs = getComputedStyle(el);
      const z = Math.max(1, parseFloat(cs.getPropertyValue('--fz')) || 1);
      let w = bw;
      if (aspect && bh) {
        const byHeight = bh * aspect;
        if (cs.objectFit === 'cover') w = Math.max(bw, byHeight);
        else if (cs.objectFit === 'contain' || cs.objectFit === 'scale-down') w = Math.min(bw, byHeight);
      }
      const need = Math.ceil(w * z * HEADROOM);
      setPx((prev) => (need > prev ? need : prev));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [aspect, active]);

  return [ref, px ? `${px}px` : null];
}
