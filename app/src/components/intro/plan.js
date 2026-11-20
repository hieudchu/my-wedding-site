import { mqMatches, PHONE_QUERY } from '../../hooks/useViewport';

/**
 * Quyết định một lần lúc tải trang: có chiếu intro không, khổ nào, file nào.
 * Kết quả nhớ ở cấp module: StrictMode gọi hàm khởi tạo state hai lần, lần hai sẽ thấy cờ "đã xem" vừa ghi.
 */

const SEEN_KEY = 'hm-intro-seen';
// Đổi số phiên bản của khổ nào khi thay file của khổ đó (mp4/jpg cache 1 ngày + 7 ngày SWR).
const VER = { portrait: '20261121v6', landscape: '20261121v6', desktop: '20261121v6' };
const VER_JOIN = '20261121v6'; // poster-join.jpg (khung JOIN của video = lòng phong bì lần đầu)
const SECTIONS = ['groom', 'bride', 'details', 'timeline', 'rsvp'];
/** Độ dài video và giây bắt đầu sau phong bì (1,2 s đầu là màn tối — phong bì thay nó). */
export const DUR_S = 12.9;
export const JOIN_S = 1.2;

function pickKind() {
  if (!mqMatches(PHONE_QUERY)) return 'desktop';
  return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
}

function readSeen() {
  try { return window.localStorage.getItem(SEEN_KEY) === '1'; } catch { return false; }
}
export function writeSeen() {
  try { window.localStorage.setItem(SEEN_KEY, '1'); } catch { /* chế độ riêng tư: bỏ qua */ }
}

function slowNetwork() {
  const c = navigator.connection;
  if (!c) return false;
  return !!c.saveData || /(^|-)2g$/.test(c.effectiveType || '');
}

let planned;
export function plan() {
  if (planned === undefined) planned = makePlan();
  return planned;
}

function makePlan() {
  if (typeof window === 'undefined') return null;
  if (window.location.pathname !== '/') return null;
  // Link có neo (mã QR …/#rsvp): không chiếu, khách tới thẳng mục cần
  const hash = decodeURIComponent(window.location.hash.slice(1));
  if (SECTIONS.includes(hash)) return null;

  const kind = pickKind();
  // Giảm chuyển động / tiết kiệm dữ liệu: không phong bì, không video — ảnh thẻ đỏ rồi vào trang
  const still = mqMatches('(prefers-reduced-motion: reduce)') || slowNetwork();
  const gate = !still;
  // Khổ ngang dùng video máy tính (16:9): một bộ clip phong bì cho cả hai khổ ngang
  const media = gate && kind === 'landscape' ? 'desktop' : kind;
  // Tải lại (chủ thiệp: chỉ một video): phong bì mở thẳng vào trang, không chiếu lại video
  const seen = readSeen() && !(import.meta.env.DEV && /introtest=full/.test(window.location.search));
  if (seen && !gate) return null;
  // Nhạc nền của trang (Nav) chờ intro xong. Đặt ngay lúc quyết định, trước mọi effect.
  document.documentElement.dataset.intro = 'on';
  const base = `/assets/intro/${media}/`;
  const V = `?v=${VER[media]}`;
  const c = navigator.connection;
  // mạng chậm (3G, hoặc Android đo được < 6 Mbit/s) → bản 720p (bản 1080p ~7 Mbit/s cho nét)
  const lite = kind !== 'desktop' && (/3g/.test(c?.effectiveType || '') || (c?.downlink > 0 && c.downlink < 6));
  return {
    kind,
    media,
    still,
    gate,
    pageReveal: gate && seen,
    join: JOIN_S,
    dur: DUR_S,
    // Giây bắt đầu ghi thẳng vào URL (#t=): Safari iPhone bỏ qua lệnh tua bằng code khi video chưa tải
    main: `${base}${lite ? 'full-720.mp4' : 'full.mp4'}${V}#t=${JOIN_S}`,
    loop: `${base}loop.mp4${V}`,
    // Ảnh chờ = khung JOIN của đúng video sẽ phát: Safari iPhone không vẽ khung đã tua của video chưa chạy
    poster: `${base}poster-join.jpg?v=${VER_JOIN}`,
    card: `${base}poster-card.jpg${V}`,
  };
}
