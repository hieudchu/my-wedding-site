import { useEffect, useState } from 'react';
import { mqMatches, PHONE_QUERY } from '../hooks/useViewport';

/*
 * Gợi ý cuộn xuống (2026-11-27, chủ thiệp chọn bản "ngón cái + vệt nhũ", demo docs/scroll-hint-nhu.html).
 *
 * Chỉ điện thoại / màn cảm ứng (bố cục PHONE_QUERY + có cảm ứng); máy tính dùng chuột không có.
 * Thẻ đỏ đầu thiệp chiếm trọn màn nên khách lớn tuổi tưởng thiệp đã hết. Khi khách chưa kéo xuống,
 * ở mép trái một ngón cái (tay phải, tranh vẽ) ấn vào chấm sáng rồi lướt lên, đầu ngón đi tới đâu rắc
 * nhũ vàng tới đó, tới đỉnh một ngôi sao nở ra; chữ "Vuốt xuống / để xem thêm ạ" chỉ hiện lúc tay vuốt.
 *
 * Luật (đã thống nhất với chủ thiệp):
 *  · lần đầu ≈ 6,5 s sau khi trang hiện (sau video mở đầu nếu có), nếu khách chưa kéo xuống;
 *  · không hiện khi ngón tay còn trên màn, chờ nhấc tay 1 s;
 *  · mỗi lần nhắc tay vuốt 3 lượt (≈ 10,5 s) rồi tự tắt; khách ngồi yên thêm 5 s thì nhắc lại,
 *    tối đa 3 lần; lần nào cũng có chữ (chủ thiệp), lần 2–3 chỉ có nền tối nhạt hơn;
 *  · chạm vào (chỗ không phải nút / ảnh) là trang tự cuộn xuống phần tiếp;
 *  · khách tự kéo xuống được nửa màn → không hiện nữa trong TAB ĐÓ, kể cả tải lại trang (sessionStorage);
 *    mở link ở tab mới coi như lượt vào mới, lại được nhắc (chủ thiệp, 2026-11-27);
 *  · là một lớp riêng của CẢ MÀN HÌNH, không thuộc hero (chủ thiệp): luôn ở giữa màn hình,
 *    hiện ở bất kỳ đoạn nào khách đang dừng, trừ phần Xác nhận tham dự, chân trang và cuối trang;
 *    không hiện khi đang xem ảnh phóng to, đang gõ chữ, tab ở nền.
 *  · Lướt ảnh trái phải không tính là thao tác (chủ thiệp: "cứ để đó").
 */

const U = 3.9; // 1u = 3,9 px thật: to bằng nhau trên mọi điện thoại
const CY = 3800; // một lượt vuốt (ms) — khớp --sh-cy trong mobile.css
const LOOPS = 3;
const AUTO_OFF = (LOOPS - 1) * CY + CY * 0.76 + 100; // tắt ngay sau lần nhấc tay thứ ba
const FIRST = 6500;
const IDLE = 5000;
const MAX = 3;
const LIFT = 1000;
const KEY = 'hm-scroll-hint';
const THUMB = '/assets/hint/thumb.webp';
const WORD = Array.from('Vuốt xuống');

// Ngón cái lướt từ 22% tới 56% lượt theo cubic-bezier(.62, 0, .32, 1) (khớp @keyframes sh-fg).
// Hạt nhũ thứ i bung ra đúng lúc đầu ngón đi qua chỗ của nó.
function glideTime(f) {
  const [p1x, p1y, p2x, p2y] = [0.62, 0, 0.32, 1];
  const xy = (s) => [
    3 * (1 - s) ** 2 * s * p1x + 3 * (1 - s) * s * s * p2x + s ** 3,
    3 * (1 - s) ** 2 * s * p1y + 3 * (1 - s) * s * s * p2y + s ** 3,
  ];
  let lo = 0;
  let hi = 1;
  for (let k = 0; k < 40; k += 1) {
    const m = (lo + hi) / 2;
    if (xy(m)[1] < f) lo = m; else hi = m;
  }
  return (0.22 + 0.34 * xy(lo)[0]) * CY;
}
function seeded(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const DUST = (() => {
  const rnd = seeded(11);
  const r = (a, b) => a + (b - a) * rnd();
  return Array.from({ length: 30 }, (_, i) => {
    const f = (i + 0.5) / 30;
    const star = i % 4 === 1;
    return {
      f,
      star,
      x: r(-0.9, 0.35),
      s: star ? r(1.5, 2.3) : r(0.6, 1.35),
      dx: rnd() < 0.85 ? -r(0.6, 2.8) : r(0.4, 1.2), // tay ở bên phải nên nhũ rơi chủ yếu sang trái
      dy: r(0.5, 2.6),
      delay: Math.round(glideTime(f)),
    };
  });
})();

// Ghi nhớ theo từng tab (sessionStorage): tải lại vẫn nhớ, tab mới thì quên.
// Bản cũ lưu ở localStorage (nhớ mãi) — xoá đi để máy đã từng cuộn lại được nhắc.
try { localStorage.removeItem(KEY); } catch { /* bỏ qua */ }
function learned() {
  try { return sessionStorage.getItem(KEY) === 'learned'; } catch { return false; }
}
function setLearned() {
  try { sessionStorage.setItem(KEY, 'learned'); } catch { /* bỏ qua */ }
}
const isTouch = () => mqMatches('(pointer: coarse)') || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);

/**
 * Vị trí: cả cụm nằm GIỮA MÀN HÌNH (chủ thiệp, 2026-11-27, thay cho góc dưới trái trước đó):
 * đường vuốt thẳng trục giữa màn, chữ căn giữa trên trục; theo chiều dọc, khối từ đỉnh chữ tới
 * phần tay nhìn thấy (≈ 16u dưới chấm sáng, phần dưới tay đã mờ) cân ở giữa màn. Là lớp của cả
 * màn hình, không đo theo nội dung trang. Trả về biến CSS (px).
 */
function measure() {
  const wide = window.innerWidth > window.innerHeight;
  const gap = 5.8 * U; // từ đỉnh đường vuốt tới đáy chữ (ngôi sao nằm giữa)
  const L = (wide ? 15 : 22) * U; // đường vuốt ≈ 59 / 86 px
  const top = L + gap + 10.8 * U; // đỉnh chữ, tính từ chấm sáng
  const below = 16 * U; // phần tay còn thấy dưới chấm sáng
  const rx = window.innerWidth / 2;
  const v0 = window.innerHeight / 2 - (top - below) / 2;
  return {
    wide,
    vars: {
      '--rx': `${rx.toFixed(1)}px`,
      '--v0': `${v0.toFixed(1)}px`,
      '--L': `${L.toFixed(1)}px`,
      '--tb': `${(L + gap).toFixed(1)}px`,
    },
  };
}

export default function ScrollHint({ enabled }) {
  const [hint, setHint] = useState(null); // { id, light, off, wide, vars }

  useEffect(() => {
    if (!enabled || !isTouch() || learned()) return undefined;
    const now = () => performance.now();
    const root = document.documentElement;
    const S = { ready: null, last: 0, shown: 0, on: false, down: false, moved: false, upAt: -1e9, top: window.scrollY, own: 0, auto: false, x0: 0, y0: 0, t: 0, done: false };
    const timers = new Set();
    const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };

    const start = () => {
      if (S.ready !== null) return;
      S.ready = now();
      S.last = S.ready + (FIRST - IDLE);
      const img = new Image(); img.src = THUMB; // tải sẵn tay (≈ 23 KB)
    };
    if (root.dataset.intro === 'on') window.addEventListener('hm-intro-end', start, { once: true });
    else start();

    const hide = (keepLast) => {
      if (!S.on) return;
      S.on = false;
      clearTimeout(S.t);
      if (!keepLast) S.last = now();
      setHint((h) => (h ? { ...h, off: true } : h));
      later(() => setHint((h) => (h && h.off ? null : h)), 800);
    };
    const stop = () => {
      S.done = true;
      setLearned();
      hide();
    };

    const onScroll = () => {
      const y = window.scrollY;
      const d = y - S.top;
      S.top = y;
      if (Math.abs(d) < 2) return;
      S.last = now();
      if (S.on) hide();
      const navPin = Number(root.getAttribute('data-nav-pin')) > Date.now(); // nav đang tự cuộn
      if (!S.auto && !navPin && d > 0) {
        S.own += d;
        if (S.own > window.innerHeight * 0.5) stop();
      }
    };
    const onDown = (e) => { S.down = true; S.moved = false; S.x0 = e.clientX; S.y0 = e.clientY; };
    const onMove = (e) => { if (S.down && Math.hypot(e.clientX - S.x0, e.clientY - S.y0) > 8) S.moved = true; };
    const onCancel = () => { S.down = false; S.upAt = now(); };
    const onUp = (e) => {
      S.down = false;
      S.upAt = now();
      if (!S.on || S.moved) return;
      // Chạm vào nút, ảnh, ô nhập… thì để nó làm việc của nó, chỉ tắt gợi ý
      if (e.target instanceof Element && e.target.closest('button, a, input, textarea, select, label, [role="button"], .lb-overlay')) { hide(); return; }
      hide();
      S.auto = true;
      root.setAttribute('data-nav-pin', String(Date.now() + 1600)); // nav không trốn khi tự cuộn
      // Đang ở hero: cuộn tới đúng đầu phần chú rể; ở đoạn khác: xuống thêm gần một màn
      const next = window.scrollY < window.innerHeight * 0.5 ? document.getElementById('groom') : null;
      const navH = document.querySelector('.nav')?.offsetHeight || 0;
      const top = next ? next.getBoundingClientRect().top + window.scrollY - navH : window.scrollY + window.innerHeight * 0.8;
      window.scrollTo({ top, behavior: 'smooth' });
      later(() => { S.auto = false; S.last = now(); }, 1200);
    };
    const onResize = () => { if (S.on) hide(); };

    const blocked = () => {
      if (document.visibilityState !== 'visible') return true;
      if (root.dataset.intro) return true;
      if (!mqMatches(PHONE_QUERY)) return true;
      const vh = window.innerHeight;
      if (window.scrollY + vh >= document.documentElement.scrollHeight - 8) return true; // cuối trang
      const seen = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.top < vh * 0.75 && r.bottom > 0; };
      if (seen(document.getElementById('rsvp')) || seen(document.querySelector('footer, .footer'))) return true; // Xác nhận, chân trang
      if (document.querySelector('.lb-overlay')) return true; // đang xem ảnh phóng to
      const a = document.activeElement;
      if (a && (a.matches('input, textarea, select') || a.isContentEditable)) return true; // đang gõ
      return false;
    };
    const tick = setInterval(() => {
      if (S.done || S.on || S.ready === null || S.shown >= MAX || S.down || S.auto) return;
      const t = now();
      if (t - S.upAt < LIFT || t - S.last < IDLE || blocked()) return;
      const m = measure();
      S.on = true;
      const light = S.shown > 0;
      S.shown += 1;
      setHint({ id: S.shown, light, off: false, ...m });
      S.t = later(() => { if (S.on) { hide(true); S.last = now(); } }, AUTO_OFF);
    }, 200);

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true, capture: true });
    window.addEventListener('pointermove', onMove, { passive: true, capture: true });
    window.addEventListener('pointerup', onUp, { capture: true });
    window.addEventListener('pointercancel', onCancel, { capture: true });
    window.addEventListener('resize', onResize);
    return () => {
      clearInterval(tick);
      timers.forEach(clearTimeout);
      clearTimeout(S.t);
      window.removeEventListener('hm-intro-end', start);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointerdown', onDown, { capture: true });
      window.removeEventListener('pointermove', onMove, { capture: true });
      window.removeEventListener('pointerup', onUp, { capture: true });
      window.removeEventListener('pointercancel', onCancel, { capture: true });
      window.removeEventListener('resize', onResize);
      setHint(null);
    };
  }, [enabled]);

  if (!hint) return null;
  return (
    <div
      key={hint.id}
      className={`sh${hint.off ? ' off' : ''}${hint.light ? ' light' : ''}${hint.wide ? ' wide' : ''}`}
      style={hint.vars}
      aria-hidden="true"
    >
      <div className="sh-dim" />
      <div className="sh-grp">
        <span className="sh-streak" />
        {DUST.map((d, i) => (
          <span
            key={i}
            className="sh-dust"
            style={{
              bottom: `calc(var(--L) * ${d.f.toFixed(3)})`,
              left: `${(d.x * U).toFixed(1)}px`,
              '--s': `${(d.s * U).toFixed(1)}px`,
              '--dx': `${(d.dx * U).toFixed(1)}px`,
              '--dy': `${(d.dy * U).toFixed(1)}px`,
            }}
          >
            <i className={d.star ? 'st' : undefined} style={{ animationDelay: `${d.delay}ms` }} />
          </span>
        ))}
        <svg className="sh-star" viewBox="-6 -6 12 12">
          <defs>
            <linearGradient id="sh-gold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#FFF6D8" />
              <stop offset=".5" stopColor="#EBCB86" />
              <stop offset="1" stopColor="#B8893F" />
            </linearGradient>
          </defs>
          <path fill="url(#sh-gold)" d="M0 -6 C.7 -1.4 1.4 -.7 6 0 C1.4 .7 .7 1.4 0 6 C-.7 1.4 -1.4 .7 -6 0 C-1.4 -.7 -.7 -1.4 0 -6Z" />
        </svg>
        <span className="sh-dot" />
        <span className="sh-fg">
          <span className="sh-glow" />
          <img className="sh-th" src={THUMB} alt="" draggable="false" />
        </span>
        <div className="sh-tx">
          <span className="sh-l1">
            {WORD.map((c, i) => (
              <span key={i} className="sh-ch" style={{ '--i': i }}>{c === ' ' ? ' ' : c}</span>
            ))}
          </span>
          <span className="sh-rule" />
          <span className="sh-sub">để xem thêm ạ</span>
        </div>
      </div>
    </div>
  );
}
