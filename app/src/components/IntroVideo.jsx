import { useEffect, useRef, useState } from 'react';
import { mqMatches, PHONE_QUERY } from '../hooks/useViewport';
import { lockScroll, unlockScroll } from '../lib/scrollLock';

/**
 * Video mở đầu (11/2026) — lớp phủ toàn màn hình trên hero, chỉ ở trang khách `/`.
 *
 * Ba bản dựng sẵn khớp ba bố cục: điện thoại/tablet dọc, điện thoại/tablet ngang, desktop.
 * Mỗi bản kết thúc bằng thẻ thiệp đỏ #4A000B đúng chỗ thẻ hero, nên lúc lớp phủ mờ đi
 * khách thấy chữ hiện dần trên chính tấm thẻ đó.
 *
 * - Lần đầu (chưa có cờ `hm-intro-seen`) → bản đầy đủ 16,6 s; lần sau → bản rút gọn 2,5 s.
 * - Hết video mà trang chưa sẵn sàng → vòng lặp viền vàng (tối đa 8 s) rồi vẫn vào trang.
 * - Chạm / bấm / phím bất kỳ → bỏ qua ngay. Sự kiện vẫn lan tới Nav (bắt ở `document`,
 *   pha capture) nên lần chạm này cũng bật nhạc như trước.
 * - Giảm chuyển động, tiết kiệm dữ liệu, video lỗi / không tự phát → hiện ảnh thẻ rồi vào trang.
 * - Mở bằng link có neo (vd. mã QR …/#rsvp) → không chiếu, để khách tới thẳng mục cần.
 * - Admin tắt được (site_config `intro_video` = 'off', công tắc ở Admin › Thông tin chung).
 *   Cài đặt về cùng site_config nên lúc đầu lớp phủ chỉ là nền đỏ của hero (chưa tải video);
 *   biết là tắt thì mờ ngay vào trang, bật thì mới chiếu và mới ghi cờ "đã xem".
 */

const SEEN_KEY = 'hm-intro-seen';
// Đổi số phiên bản của bản nào khi thay file của bản đó (mp4/jpg cache 1 ngày + 7 ngày SWR).
const VER = { portrait: '20261120b', landscape: '20261120b', desktop: '20261120b' };
const SECTIONS = ['groom', 'bride', 'details', 'timeline', 'rsvp'];
const LOOP_CAP_MS = 8000; // chờ trang tối đa bấy nhiêu sau khi hết video
const START_GRACE_MS = 3500; // video chưa chạy sau chừng này → coi như không phát được
const FADE_MS = 650;
const SETTLE_DELAY_MS = 250; // khi kết tự nhiên: khung co về thẻ thật trước, rồi mới mờ

// Thẻ thiệp trong khung hình của từng bản dựng: [rộng video, cao video, x, y, rộng, cao] (px video).
// Đo trên web thật ở 390×844, 844×390, 1440×900 — xem wedding-video/tools/make_wide.py.
const CARD = {
  portrait: [1080, 1920, 142.5, 334.5, 796.5, 1194],
  landscape: [1920, 888, 323, 173, 1274, 673],
  desktop: [1920, 1080, 252, 205.2, 1416, 669.6],
};

/**
 * Khung video (11/2026, theo yêu cầu chủ thiệp): video không tràn màn hình mà nằm trong một
 * khung giữa nền đỏ vân hoa của hero.
 * - desktop: khung chữ nhật 16:9, KHÔNG BAO GIỜ lớn hơn 1920×1080 điểm ảnh thật của màn
 *   (chia devicePixelRatio) → video không bị phóng to nên luôn nét; màn càng to khung vẫn vậy.
 * - landscape (điện thoại ngang): cao hết màn, chỉ chừa viền hai bên trái/phải. Tablet ngang
 *   (tỉ lệ thấp) thì thêm dải trên/dưới để không cắt mất quá nhiều hai bên video.
 * - portrait: khung chữ nhật có lề quanh. Cũng chặn theo điểm ảnh thật, nhưng không nhỏ hơn
 *   88% chỗ trống (máy DPR 3–4 mà chặn cứng thì khung quá bé; phóng ≤ 1,15× là không thấy).
 * Video "cover" trong khung, căn giữa.
 */
function frameBox(kind) {
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

/** Phép biến đổi (gốc ở góc trên-trái khung) đưa thẻ đỏ của video trùng khít thẻ hero thật.
 *  Chỉ dùng lúc kết: khi ấy trong thẻ là màu đỏ trơn nên co giãn không lộ. */
function settleTransform(kind, box) {
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
const POSTER_HOLD_MS = 700;

function pickKind() {
  if (!mqMatches(PHONE_QUERY)) return 'desktop';
  return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
}

function readSeen() {
  try { return window.localStorage.getItem(SEEN_KEY) === '1'; } catch { return true; }
}
function writeSeen() {
  try { window.localStorage.setItem(SEEN_KEY, '1'); } catch { /* chế độ riêng tư: bỏ qua */ }
}

function slowNetwork() {
  const c = navigator.connection;
  if (!c) return false;
  return !!c.saveData || /(^|-)2g$/.test(c.effectiveType || '');
}

/** Quyết định một lần lúc tải trang: có chiếu không, bản nào, file nào.
 *  Nhớ kết quả ở cấp module: StrictMode gọi hàm khởi tạo state hai lần, lần hai sẽ
 *  thấy cờ vừa ghi và chọn nhầm bản rút gọn. */
let planned;
function plan() {
  if (planned === undefined) planned = makePlan();
  return planned;
}
function makePlan() {
  if (typeof window === 'undefined') return null;
  if (window.location.pathname !== '/') return null;
  const hash = decodeURIComponent(window.location.hash.slice(1));
  if (SECTIONS.includes(hash)) return null;

  const kind = pickKind();
  const base = `/assets/intro/${kind}/`;
  const V = `?v=${VER[kind]}`;
  const seen = readSeen();
  const still = mqMatches('(prefers-reduced-motion: reduce)') || slowNetwork();
  const c = navigator.connection;
  const lite = kind !== 'desktop' && /3g/.test(c?.effectiveType || '');
  return {
    kind,
    still,
    main: base + (seen ? 'short.mp4' : lite ? 'full-720.mp4' : 'full.mp4') + V,
    loop: `${base}loop.mp4${V}`,
    // ảnh chờ = khung ĐẦU của đúng bản sẽ phát (không phải thẻ đỏ cuối video)
    poster: base + (seen ? 'poster-short.jpg' : 'poster-full.jpg') + V,
    card: `${base}poster-card.jpg${V}`,
  };
}

/**
 * @param ready   trang đã có nội dung (useSiteConfig hết loading)
 * @param enabled null khi chưa biết cài đặt; true/false khi đã đọc site_config
 */
export default function IntroVideo({ ready, enabled }) {
  const [p] = useState(plan);
  // wait (chờ cài đặt) → play → (loop) → out → done; still: ảnh thẻ rồi out
  const [phase, setPhase] = useState(() => (p ? 'wait' : 'done'));
  const mainRef = useRef(null);
  const loopRef = useRef(null);
  const started = useRef(false);
  const mode = useRef('none');
  const readyRef = useRef(ready);
  readyRef.current = ready;

  const [morph, setMorph] = useState(null);
  const [box, setBox] = useState(() => (p ? frameBox(p.kind) : null));
  useEffect(() => {
    if (!p) return undefined;
    const onResize = () => setBox(frameBox(p.kind));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const leave = () => setPhase((ph) => (ph === 'out' || ph === 'done' ? ph : 'out'));
  // Kết tự nhiên (hết video / hết vòng lặp / ảnh thẻ): co khung về thẻ thật rồi mờ.
  // Khách chạm bỏ qua giữa chừng thì chỉ mờ (`leave`).
  const settle = () => {
    if (p) setMorph(settleTransform(p.kind, frameBox(p.kind)));
    leave();
  };

  // Chờ cài đặt admin: tắt → mờ ngay vào trang; bật → chiếu (và ghi cờ đã xem).
  useEffect(() => {
    if (phase !== 'wait' || enabled == null) return;
    if (!enabled) { leave(); return; }
    writeSeen();
    setPhase(p.still ? 'still' : 'play');
  }, [phase, enabled]);

  // Khoá cuộn khi lớp phủ còn hiện — lib/scrollLock (ghim body trên máy cảm ứng, SỬA 7).
  // Không đụng overflow của html: xem CLAUDE.md, nó làm hỏng khoá cuộn của lightbox.
  const showing = phase !== 'done';
  useEffect(() => {
    if (!showing) return undefined;
    lockScroll({ toTop: true });
    return unlockScroll;
  }, [showing]);

  // Bỏ qua: chạm / bấm / phím. Không chặn lan truyền — Nav cần lần chạm này để bật nhạc.
  useEffect(() => {
    if (phase === 'done' || phase === 'out') return undefined;
    const EVTS = ['pointerdown', 'keydown', 'wheel'];
    EVTS.forEach((t) => window.addEventListener(t, leave, { passive: true }));
    return () => EVTS.forEach((t) => window.removeEventListener(t, leave));
  }, [phase]);

  // Phát video chính; không chạy được trong START_GRACE_MS → chuyển sang ảnh thẻ.
  useEffect(() => {
    if (phase !== 'play') return undefined;
    const v = mainRef.current;
    if (!v) return undefined;
    v.muted = true;
    const pr = v.play();
    if (pr && pr.catch) pr.catch(() => { if (!started.current) setPhase('still'); });
    const t = setTimeout(() => { if (!started.current) setPhase('still'); }, START_GRACE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  // Hết video chính: trang sẵn sàng thì vào, chưa thì chuyển sang vòng lặp (liền khung).
  const onMainEnded = () => {
    if (readyRef.current) { settle(); return; }
    const l = loopRef.current;
    if (l) { l.muted = true; l.play().catch(() => {}); }
    setPhase('loop');
  };

  useEffect(() => {
    if (phase !== 'loop') return undefined;
    if (ready) { settle(); return undefined; }
    const t = setTimeout(settle, LOOP_CAP_MS);
    return () => clearTimeout(t);
  }, [phase, ready]);

  // Ảnh tĩnh: giữ thẻ một nhịp (chờ trang tối đa LOOP_CAP_MS) rồi vào.
  useEffect(() => {
    if (phase !== 'still') return undefined;
    const t = setTimeout(() => { if (readyRef.current) settle(); }, POSTER_HOLD_MS);
    const cap = setTimeout(settle, POSTER_HOLD_MS + LOOP_CAP_MS);
    return () => { clearTimeout(t); clearTimeout(cap); };
  }, [phase]);
  useEffect(() => {
    if (phase === 'still' && ready) {
      const t = setTimeout(settle, POSTER_HOLD_MS);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [phase, ready]);

  useEffect(() => {
    if (phase !== 'out') return undefined;
    const t = setTimeout(() => setPhase('done'), FADE_MS + (morph ? SETTLE_DELAY_MS : 0));
    return () => clearTimeout(t);
  }, [phase]);

  if (!p || phase === 'done') return null;

  // Đang hiện gì: chưa gì (chờ cài đặt / bị tắt), video, hay ảnh thẻ. Giữ nguyên lúc mờ ra.
  if (phase === 'play' || phase === 'loop') mode.current = 'video';
  else if (phase === 'still') mode.current = 'still';
  const still = mode.current === 'still';
  return (
    <div
      className={`intro-video intro-${p.kind} ${phase === 'out' ? 'out' : ''} ${morph ? 'settle' : ''}`}
      style={{ '--intro-fade': `${FADE_MS}ms`, '--intro-settle': `${SETTLE_DELAY_MS}ms` }}
      onTouchMove={(e) => e.preventDefault()}
      aria-hidden="true"
    >
      <div
        // Chưa biết cài đặt (wait) thì khung ẩn: chỉ có nền hero, không chớp khung đỏ rỗng
        className={`intro-frame ${mode.current === 'none' ? 'empty' : ''}`}
        style={{ left: box.x, top: box.y, width: box.w, height: box.h, ...(morph ? { transform: morph } : null) }}
      >
      {mode.current === 'none' ? null : still ? (
        <img className="intro-media" src={p.card} alt="" decoding="async" />
      ) : (
        <>
          <video
            ref={loopRef}
            className={`intro-media ${phase === 'loop' ? '' : 'hidden'}`}
            src={p.loop}
            muted
            playsInline
            loop
            preload="auto"
          />
          <video
            ref={mainRef}
            className={`intro-media ${phase === 'loop' ? 'hidden' : ''}`}
            src={p.main}
            poster={p.poster}
            muted
            playsInline
            autoPlay
            preload="auto"
            disablePictureInPicture
            onPlaying={() => { started.current = true; }}
            onEnded={onMainEnded}
            onError={() => { if (!started.current) setPhase('still'); else leave(); }}
          />
        </>
      )}
      </div>
    </div>
  );
}
