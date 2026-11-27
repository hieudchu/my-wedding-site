import { useEffect, useState } from 'react';
import { mqMatches, PHONE_QUERY } from '../hooks/useViewport';

/*
 * Gợi ý cuộn xuống (2026-11-27; chủ thiệp duyệt chuyển động ở docs/scroll-hint-3d.html, chọn tay kiểu A).
 *
 * Chỉ điện thoại / màn cảm ứng (bố cục PHONE_QUERY + có cảm ứng); máy tính dùng chuột không có.
 * Thẻ đỏ đầu thiệp chiếm trọn màn nên khách lớn tuổi tưởng thiệp đã hết. Khi khách chưa kéo xuống,
 * giữa đáy màn một bàn tay vẽ (ngà viền vàng, cổ tay áo nhung đỏ — public/assets/hint/hand.webp) đặt
 * ngón trỏ lên mặt kính rồi trượt thẳng lên như đang lướt Facebook, nhũ vàng rắc theo đầu ngón, tới đỉnh
 * một ngôi sao nhỏ nở nhẹ; tới trên thì nhấc tay (to ra, bóng xa ra), đưa về dưới, đặt xuống, vuốt tiếp. Chữ "Vuốt xuống / để xem
 * thêm ạ" hiện theo nhịp vuốt. Chuyển động sao y bản video đã duyệt nhưng dựng bằng CSS (60 khung/giây,
 * một ảnh 10 KB thay cho WebP động ≈ 870 KB).
 *
 * Luật (đã thống nhất với chủ thiệp):
 *  · lần đầu ≈ 6,5 s sau khi trang hiện (sau video mở đầu nếu có), nếu khách chưa kéo xuống;
 *  · không hiện khi ngón tay còn trên màn, chờ nhấc tay 1 s;
 *  · mỗi lần nhắc tay vuốt 3 lượt (≈ 7 s) rồi tự tắt; khách ngồi yên thêm 5 s thì nhắc lại,
 *    tối đa 3 lần; lần nào cũng có chữ (chủ thiệp), lần 2–3 chỉ có nền tối nhạt hơn;
 *  · chạm vào (chỗ không phải nút / ảnh) là trang tự cuộn xuống phần tiếp;
 *  · khách tự kéo xuống được nửa màn → không hiện nữa trong TAB ĐÓ, kể cả tải lại trang (sessionStorage);
 *    mở link ở tab mới coi như lượt vào mới, lại được nhắc (chủ thiệp, 2026-11-27);
 *  · là một lớp riêng của CẢ MÀN HÌNH, không thuộc hero (chủ thiệp): luôn ở giữa, sát đáy màn hình,
 *    hiện ở bất kỳ đoạn nào khách đang dừng, trừ phần Xác nhận tham dự, chân trang và cuối trang;
 *    không hiện khi đang xem ảnh phóng to, đang gõ chữ, tab ở nền.
 *  · Lướt ảnh trái phải không tính là thao tác (chủ thiệp: "cứ để đó").
 */

const U = 3.9; // 1u = 3,9 px thật: to bằng nhau trên mọi điện thoại
const CY = 2300; // một lượt (ms) — khớp --sh-cy trong mobile.css
const LOOPS = 3;
const AUTO_OFF = LOOPS * CY - 150; // tắt khi tay vừa về chỗ sau lượt thứ ba
const FIRST = 6500;
const IDLE = 5000;
const MAX = 3;
const LIFT = 1000;
const KEY = 'hm-scroll-hint';
const HAND_SRC = '/assets/hint/hand.webp';
const WORD = Array.from('Vuốt xuống');

/*
 * Một lượt (CY = 2,3 s, khớp @keyframes sh-hand): chạm 0,16 s → trượt lên 1,1 s (sin vào–ra) → nhấc tay
 * 0,22 s → đưa về 0,62 s → đặt xuống 0,2 s. Toạ độ tay theo u (đo từ ảnh hand.webp ở cỡ đã duyệt):
 * khung ảnh W×H, đầu ngón (TX, TY), tâm bàn tay (CX, CY0) — gốc phóng khi nhấc tay; T = quãng trượt.
 */
const HAND = { W: 17.15, H: 18.09, TX: 1.81, TY: 0.35, CX: 8.59, CY0: 9.53, T: 16.8 };
const T_HOLD = 0.16;
const T_GLIDE = 1.1;
// Hạt nhũ thứ i bung ra đúng lúc đầu ngón đi qua chỗ của nó (nghịch đảo đường sin của lượt trượt).
const glideTime = (f) => (T_HOLD + (T_GLIDE * Math.acos(1 - 2 * f)) / Math.PI) * 1000;
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
  return Array.from({ length: 32 }, (_, i) => {
    const f = (i + 0.5) / 32;
    const star = rnd() < 0.27;
    return {
      f,
      star,
      x: r(-0.45, 0.45),
      y: r(-0.4, 0.4),
      s: star ? r(1.8, 2.8) : r(0.82, 1.74),
      dx: r(-1.6, 1.6),
      dy: r(1.2, 2.8), // trôi nhẹ xuống sau đầu ngón
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
 * Vị trí: lớp của CẢ MÀN HÌNH (không đo theo nội dung trang). Đầu ngón lúc chạm nằm trên trục giữa màn;
 * đáy bàn tay cách đáy màn 5u (CSS cộng vùng an toàn đáy). Chữ ở trên đỉnh đường trượt. Trả về biến CSS (px).
 */
function measure() {
  const px = (v) => `${(v * U).toFixed(1)}px`;
  return {
    vars: {
      '--rx': `${(window.innerWidth / 2).toFixed(1)}px`,
      '--v0': px(HAND.H - HAND.TY + 5),
      '--T': px(HAND.T),
      '--tb': px(HAND.T + 6.4), // chừa chỗ cho ngôi sao ở đỉnh
    },
  };
}

export default function ScrollHint({ enabled }) {
  const [hint, setHint] = useState(null); // { id, light, off, vars }

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
      const img = new Image(); img.src = HAND_SRC; // tải sẵn tay (≈ 10 KB)
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
  const u = (v) => `${(v * U).toFixed(1)}px`;
  return (
    <div
      key={hint.id}
      className={`sh${hint.off ? ' off' : ''}${hint.light ? ' light' : ''}`}
      style={hint.vars}
      aria-hidden="true"
    >
      <div className="sh-dim" />
      <div className="sh-grp">
        {DUST.map((d, i) => (
          <span
            key={i}
            className="sh-dust"
            style={{
              left: u(d.x),
              bottom: `calc(var(--T) * ${d.f.toFixed(3)} + ${u(d.y)})`,
              '--s': u(d.s),
              '--dx': u(d.dx),
              '--dy': u(d.dy),
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
        <span
          className="sh-hand"
          style={{ left: u(-HAND.TX), top: u(-HAND.TY), width: u(HAND.W), height: u(HAND.H), transformOrigin: `${u(HAND.CX)} ${u(HAND.CY0)}` }}
        >
          <img className="sh-hs" src={HAND_SRC} alt="" draggable="false" />
          <img className="sh-hi" src={HAND_SRC} alt="" draggable="false" />
          <span className="sh-glow" style={{ left: u(HAND.TX), top: u(HAND.TY) }} />
        </span>
        <div className="sh-tx">
          <span className="sh-l1">
            {WORD.map((c, i) => (
              <span key={i} className="sh-ch" style={{ '--i': i }}>{c === ' ' ? '\u00a0' : c}</span>
            ))}
          </span>
          <span className="sh-rule" />
          <span className="sh-sub">để xem thêm ạ</span>
        </div>
      </div>
    </div>
  );
}
