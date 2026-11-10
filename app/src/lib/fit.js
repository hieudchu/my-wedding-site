/**
 * Khung ảnh (tiêu điểm + phóng) → props cho <img> ở trang khách.
 *
 * Chỉ gắn biến CSS; quy tắc `img.has-fit` trong globals.css (máy tính) và trong khối
 * PHONE_QUERY của sections.css (điện thoại) chọn bộ biến nào áp. Nhờ vậy cùng một
 * <img> đổi khung theo màn hình mà không cần JS đo màn hình.
 *
 * `fit` null → không gắn gì: ảnh hiện y như trước khi có tính năng này.
 */
export function fitProps(fit, className = '') {
  if (!fit) return { className: className || undefined };
  const d = fit.d;
  const m = fit.m || fit.d;
  return {
    className: `${className} has-fit`.trim(),
    style: {
      '--fdx': `${d.x}%`, '--fdy': `${d.y}%`, '--fdz': d.z,
      '--fmx': `${m.x}%`, '--fmy': `${m.y}%`, '--fmz': m.z,
    },
  };
}
