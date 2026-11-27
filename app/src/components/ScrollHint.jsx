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
 *    lần 2–3 bản nhẹ (không chữ), tối đa 3 lần;
 *  · chạm vào (chỗ không phải nút / ảnh) là trang tự cuộn xuống phần tiếp;
 *  · khách tự kéo xuống được nửa màn → không bao giờ hiện nữa, kể cả lần mở sau (localStorage);
 *  · chỉ hiện khi đang ở hero; không hiện khi đang xem ảnh phóng to, đang gõ chữ, tab ở nền.
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

function learned() {
  try { return localStorage.getItem(KEY) === 'learned'; } catch { return false; }
}
function setLearned() {
  try { localStorage.setItem(KEY, 'learned'); } catch { /* bỏ qua */ }
}
const isTouch = () => mqMatches('(pointer: coarse)') || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);

/** Đo vị trí theo thẻ hero thật (điện thoại cao thấp khác nhau). Trả về biến CSS (px). */
function measure() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const wide = vw > vh;
  const txH = 11 * U; // hai dòng chữ
  const gap = 5.8 * U; // từ đỉnh đường vuốt tới đáy chữ (ngôi sao nằm giữa)
  let rx; let v0; let L;
  if (!wide) {
    // Dọc: chấm sáng ngay trên thanh ‹ 01 / 15 ›; chữ đứng ngay trên dòng ngày giờ của thẻ
    rx = 14 * U;
    const bar = document.querySelector('#hero .hm-bar');
    const meta = document.querySelector('#hero .hero-meta');
    const barTop = bar ? bar.getBoundingClientRect().top : vh - 92;
    v0 = Math.max(10 * U, vh - barTop + 9.5 * U);
    const txBottom = meta ? vh - meta.getBoundingClientRect().top + 2 * U : v0 + 38.4 * U + gap;
    L = txBottom - gap - v0;
    if (L < 16 * U) { L = 16 * U; v0 = Math.max(6 * U, txBottom - gap - L); }
    L = Math.min(L, 45 * U);
  } else {
    // Ngang / máy gập mở: cụm thấp ở lề trái, hai dòng chữ nằm dưới nút ‹ của dải ảnh
    rx = 9 * U;
    v0 = 6 * U;
    L = 13 * U;
    const prev = document.querySelector('#hero .hm-bar .hm-btn');
    if (prev) {
      const limit = vh - prev.getBoundingClientRect().bottom - 2 * U - txH; // đáy chữ cao nhất được phép
      L = Math.max(8 * U, Math.min(L, limit - v0 - gap));
    }
  }
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
      if (!S.auto && d > 0) {
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
      const next = document.getElementById('groom');
      if (!next) return;
      S.auto = true;
      root.setAttribute('data-nav-pin', String(Date.now() + 1600)); // nav không trốn khi tự cuộn
      const navH = document.querySelector('.nav')?.offsetHeight || 0;
      window.scrollTo({ top: next.getBoundingClientRect().top + window.scrollY - navH, behavior: 'smooth' });
      later(() => { S.auto = false; S.last = now(); }, 1200);
    };
    const onResize = () => { if (S.on) hide(); };

    const blocked = () => {
      if (document.visibilityState !== 'visible') return true;
      if (root.dataset.intro) return true;
      if (!mqMatches(PHONE_QUERY)) return true;
      if (window.scrollY > window.innerHeight * 0.4) return true; // chỉ ở hero
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
        {!hint.light && (
          <div className="sh-tx">
            <span className="sh-l1">
              {WORD.map((c, i) => (
                <span key={i} className="sh-ch" style={{ '--i': i }}>{c === ' ' ? ' ' : c}</span>
              ))}
            </span>
            <span className="sh-rule" />
            <span className="sh-sub">để xem thêm ạ</span>
          </div>
        )}
      </div>
    </div>
  );
}
