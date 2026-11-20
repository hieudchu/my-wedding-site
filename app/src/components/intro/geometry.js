/** Hình học của lớp phủ intro: khung video, thẻ hero thật, phong bì 3:2. Toạ độ màn hình (CSS px). */

// Thẻ thiệp trong khung hình của từng bản dựng: [rộng video, cao video, x, y, rộng, cao] (px video).
// Đo trên web thật ở 390×844, 844×390, 1440×900 — xem wedding-video/tools/make_wide.py.
const CARD = {
  portrait: [1080, 1920, 142.5, 334.5, 796.5, 1194],
  landscape: [1920, 888, 323, 173, 1274, 673],
  desktop: [1920, 1080, 252, 205.2, 1416, 669.6],
};

/**
 * Khung video (theo yêu cầu chủ thiệp): video nằm trong một khung giữa nền đỏ vân hoa, không tràn màn.
 * - desktop: 16:9, không bao giờ lớn hơn 1920×1080 điểm ảnh thật (chia devicePixelRatio) → không phóng to video.
 * - landscape: cao hết màn, chừa viền hai bên; tablet ngang (tỉ lệ thấp) thêm dải trên/dưới.
 * - portrait: khung có lề quanh, chặn theo điểm ảnh thật nhưng không nhỏ hơn 88% chỗ trống.
 * Video "cover" trong khung, căn giữa.
 */
export function frameBox(kind) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const dpr = window.devicePixelRatio || 1;
  const [W, H] = CARD[kind];
  let w;
  let h;
  if (kind === 'landscape') {
    const side = Math.max(24, vw * 0.07);
    w = vw - 2 * side;
    h = vh;
    const minA = (W / H) * 0.8; // cắt hai bên video tối đa 20%
    if (w / h < minA) h = w / minA;
  } else {
    const m = kind === 'desktop' ? Math.max(40, Math.min(vw, vh) * 0.1) : Math.max(14, Math.min(vw, vh) * 0.05);
    w = vw - 2 * m;
    h = vh - 2 * m;
    const [lo, hi] = kind === 'desktop' ? [W / H, W / H] : [0.43, 0.75];
    if (w / h > hi) w = h * hi;
    if (w / h < lo) h = w / lo;
    const cap = W / dpr; // bề rộng CSS ứng với đúng bề rộng gốc của video
    const floor = kind === 'desktop' ? 0 : 0.88 * w;
    const nw = Math.max(Math.min(w, cap), floor);
    h *= nw / w;
    w = nw;
  }
  w = Math.round(w);
  h = Math.round(h);
  return { x: Math.round((vw - w) / 2), y: Math.round((vh - h) / 2), w, h };
}

/** Khung thẻ thiệp thật trên trang (+ khoảng lùi của viền vàng bên trong). null khi chưa đo được. */
export function cardRect() {
  const el = document.querySelector('.hm-title, .hero-title-card');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  const f = el.querySelector('.frame')?.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height, inset: f ? Math.max(0, f.left - r.left) : 12 };
}

/** Phong bì ngang: hình chữ nhật 3:2 lớn nhất nằm giữa thẻ hero (thẻ ngang / máy tính rộng hơn 3:2). */
export function fit32(r) {
  if (!r) return r;
  if (r.w / r.h > 1.5) { const w = r.h * 1.5; return { ...r, x: r.x + (r.w - w) / 2, w }; }
  const h = r.w / 1.5;
  return { ...r, y: r.y + (r.h - h) / 2, h };
}

/** Dự phòng khi không đo được thẻ lúc kết: transform đưa thẻ đỏ có sẵn trong video trùng thẻ hero thật. */
export function settleTransform(kind, box) {
  const el = document.querySelector('.hm-title, .hero-title-card');
  if (!el || !box) return null;
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  const [W, H, x, y, w, h] = CARD[kind];
  const s = Math.max(box.w / W, box.h / H);
  const cx = box.x + (box.w - W * s) / 2 + x * s; // thẻ trong video, toạ độ màn hình
  const cy = box.y + (box.h - H * s) / 2 + y * s;
  const sx = r.width / (w * s);
  const sy = r.height / (h * s);
  const tx = r.left - box.x - (cx - box.x) * sx;
  const ty = r.top - box.y - (cy - box.y) * sy;
  return `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
}
