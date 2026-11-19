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
const WAIT_CAP_MS = 2500; // đọc cài đặt bật/tắt quá lâu (mạng chậm, treo) → coi như bật, chiếu luôn

// ---- Nhạc mở đầu (11/2026) ----
// Riêng với danh sách nhạc nền; admin đổi được (site_config intro_music / intro_music_start,
// xem admin/sections/IntroMusic.jsx). Mặc định: "Một đời" không lời, cắt sẵn từ giây 6 cho khớp
// nhịp video (câu nhạc mới vào lúc hình hiện, dày lên ở vệt nắng, lắng xuống ở thẻ đỏ).
const MUSIC_DEFAULT = '/assets/intro/intro-music.m4a?v=20261120';
const VOL_LO = 0.16; // vào nhỏ, nhẹ
const VOL_HI = 0.55; // to dần tới mức vừa ở cuối video
const MUSIC_FADE_S = 1.2; // lắng xuống khi lớp phủ mờ đi
const MUSIC_GAP_MS = 3000; // chủ thiệp (11/2026): nhạc nền KHÔNG vào ngay — nghỉ một nhịp rồi mới vào nhẹ
const DUR = { full: 16.6, short: 2.5 };

/**
 * Thẻ audio + (nếu có) Web Audio GainNode để chỉnh âm lượng — iOS bỏ qua `audio.volume`,
 * chỉ GainNode mới hạ/tăng được tiếng. File Supabase có CORS `*` nên dùng được crossOrigin.
 */
function createMusic(url) {
  // iOS: Web Audio mặc định là loại "ambient" — bị tắt theo công tắc im lặng, trong khi thẻ
  // audio của nhạc nền vẫn kêu. Safari 16.4+ cho đặt loại "playback" để kêu như nhạc nền.
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* trình duyệt khác */ }
  const a = new Audio();
  a.preload = 'auto';
  a.crossOrigin = 'anonymous';
  a.src = url;
  let ctx = null;
  let gain = null;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) {
      ctx = new AC();
      gain = ctx.createGain();
      ctx.createMediaElementSource(a).connect(gain).connect(ctx.destination);
    }
  } catch { ctx = null; gain = null; }
  let raf = 0;
  const level = () => (gain ? gain.gain.value : a.volume);
  const ramp = (to, secs) => {
    cancelAnimationFrame(raf);
    if (gain) {
      const now = ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(to, now + Math.max(0.05, secs));
      return;
    }
    const from = a.volume;
    const t0 = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / (Math.max(0.05, secs) * 1000));
      a.volume = from + (to - from) * k;
      if (k < 1) raf = requestAnimationFrame(step);
    };
    step();
  };
  const set = (v) => {
    cancelAnimationFrame(raf);
    if (gain) { gain.gain.cancelScheduledValues(ctx.currentTime); gain.gain.setValueAtTime(v, ctx.currentTime); } else a.volume = v;
  };
  /** Phát từ giây `at` của file, rồi to dần tới VOL_HI trong `rampS` giây. true = có tiếng thật. */
  const play = async (at, rampS) => {
    if (import.meta.env.DEV && /introtest=blocked/.test(window.location.search) && !navigator.userActivation?.isActive) return false;
    try { a.currentTime = at; } catch { /* chưa có metadata: trình duyệt tự tua sau */ }
    if (a.paused) set(Math.min(level() || VOL_LO, VOL_LO) || VOL_LO);
    try {
      if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
      await a.play();
    } catch { return false; }
    if (ctx) {
      await new Promise((r) => setTimeout(r, 120));
      if (ctx.state !== 'running') { a.pause(); return false; }
    }
    ramp(VOL_HI, rampS);
    return true;
  };
  const fadeOut = () => {
    if (a.paused) return;
    ramp(0, MUSIC_FADE_S);
    setTimeout(() => { a.pause(); }, MUSIC_FADE_S * 1000 + 50);
  };
  const destroy = () => { a.pause(); a.removeAttribute('src'); try { ctx?.close(); } catch { /* đã đóng */ } };
  const state = () => ({ ctx: ctx ? ctx.state : 'none', paused: a.paused, t: a.currentTime, vol: level() });
  // Video dừng (Safari tự dừng video câm khi cửa sổ/ứng dụng bị che, hoặc đang tải) → nhạc dừng
  // theo; video chạy lại → tua nhạc đúng chỗ rồi phát tiếp, không thì nhạc chạy trước video.
  const hold = () => { if (!a.paused) a.pause(); };
  const follow = (at) => {
    try { if (Math.abs(a.currentTime - at) > 0.25) a.currentTime = at; } catch { /* chưa tua được */ }
    if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
    if (a.paused) a.play().catch(() => {});
  };
  return { el: a, play, fadeOut, destroy, state, hold, follow };
}

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

  // Nhạc nền của trang (Nav) chờ intro xong — xem Nav.jsx. Đặt ngay lúc quyết định, trước mọi effect.
  document.documentElement.dataset.intro = 'on';
  const kind = pickKind();
  const base = `/assets/intro/${kind}/`;
  const V = `?v=${VER[kind]}`;
  const seen = readSeen() && !(import.meta.env.DEV && /introtest=full/.test(window.location.search));
  const still = mqMatches('(prefers-reduced-motion: reduce)') || slowNetwork();
  const c = navigator.connection;
  const lite = kind !== 'desktop' && /3g/.test(c?.effectiveType || '');
  return {
    kind,
    still,
    dur: seen ? DUR.short : DUR.full,
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
const DEBUG = typeof window !== 'undefined' && /introdebug=1/.test(window.location.search);

/** ?introdebug=1 — vài dòng trạng thái góc trên trái, để thử trên điện thoại thật (Safari). */
function DebugPanel({ phase, musicRef, mainRef }) {
  const [, tick] = useState(0);
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 250); return () => clearInterval(id); }, []);
  const m = musicRef.current?.state();
  const v = mainRef.current;
  const site = document.querySelector('nav audio, .nav audio, audio');
  return (
    <pre className="intro-debug">
      {`phase ${phase} · ${document.visibilityState}
video ${v ? `${v.currentTime.toFixed(1)}${v.paused ? ' (dừng)' : ''}` : '-'}
nhạc ${m ? `${m.paused ? 'dừng' : 'phát'} ${m.t.toFixed(1)}s vol ${m.vol.toFixed(2)} ctx ${m.ctx}` : '-'}
audioSession ${navigator.audioSession?.type || 'không có'}
nhạc nền ${site ? (site.paused ? 'dừng' : `phát ${site.currentTime.toFixed(1)}s`) : '-'}`}
    </pre>
  );
}

export default function IntroVideo({ ready, enabled, music }) {
  const [p] = useState(plan);
  // wait (chờ cài đặt) → play → (loop) → out → done; still: ảnh thẻ rồi out
  const [phase, setPhase] = useState(() => (p ? 'wait' : 'done'));
  const mainRef = useRef(null);
  const loopRef = useRef(null);
  const started = useRef(false);
  const mode = useRef('none');
  const musicRef = useRef(null);
  const musicOn = useRef(false);
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
  const [waitedOut, setWaitedOut] = useState(false);
  useEffect(() => {
    if (phase !== 'wait') return undefined;
    const t = setTimeout(() => setWaitedOut(true), WAIT_CAP_MS);
    return () => clearTimeout(t);
  }, [phase]);
  useEffect(() => {
    if (phase !== 'wait' || (enabled == null && !waitedOut)) return;
    if (enabled === false) { leave(); return; }
    writeSeen();
    if (!p.still) {
      const url = music?.url || MUSIC_DEFAULT;
      musicRef.current = createMusic(url);
      if (import.meta.env.DEV) window.__introMusic = musicRef.current; // chỉ để kiểm tra khi phát triển
    }
    setPhase(p.still ? 'still' : 'play');
  }, [phase, enabled, waitedOut]);

  /** Bắt nhạc theo đúng chỗ video đang chạy. Bị chặn tự phát thì thôi (intro không tiếng). */
  const startMusic = async () => {
    const m = musicRef.current;
    const v = mainRef.current;
    if (!m || !v || musicOn.current) return;
    const at = (music?.start || 0) + (v.currentTime || 0);
    const ok = await m.play(at, Math.max(0.6, p.dur - (v.currentTime || 0)));
    musicOn.current = ok;
  };

  // Khi lớp phủ bắt đầu mờ: nhạc lắng xuống. Khi xong hẳn: báo Nav phát nhạc nền.
  useEffect(() => {
    if (phase === 'out') musicRef.current?.fadeOut();
    if (phase !== 'done' || !p) return undefined;
    const m = musicRef.current;
    const shown = mode.current !== 'none'; // intro đã thực sự chiếu (không phải bị tắt ở admin)
    const t = setTimeout(() => {
      m?.destroy();
      delete document.documentElement.dataset.intro;
      // detail.soft: Nav cho nhạc nền to dần thay vì vào đột ngột
      window.dispatchEvent(new CustomEvent('hm-intro-end', { detail: { soft: shown } }));
    }, shown ? Math.max(0, (musicOn.current ? MUSIC_FADE_S * 1000 : 0) - FADE_MS) + MUSIC_GAP_MS : 0);
    return () => clearTimeout(t);
  }, [phase]);

  // Khoá cuộn khi lớp phủ còn hiện — lib/scrollLock (ghim body trên máy cảm ứng, SỬA 7).
  // Không đụng overflow của html: xem CLAUDE.md, nó làm hỏng khoá cuộn của lightbox.
  const showing = phase !== 'done';
  useEffect(() => {
    if (!showing) return undefined;
    lockScroll({ toTop: true });
    return unlockScroll;
  }, [showing]);

  // Chạm / bấm / phím / lăn chuột → bỏ qua (chủ thiệp 11/2026: không có nút nào, chạm là bỏ qua).
  // Không chặn lan truyền — Nav cần chính cử chỉ này để mở khoá nhạc nền (iOS).
  // Nhạc mở đầu thử tự phát khi video chạy; trình duyệt chặn tự phát tiếng (iPhone luôn chặn,
  // máy tính thường chặn lần đầu) thì intro chạy không tiếng — không có cách nào khác.
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

  // Quay lại trang (chuyển tab / ứng dụng / cửa sổ bị che rồi hiện lại): Safari có thể đã tự
  // dừng video câm và không tự chạy lại → gọi phát lại, kẻo lớp phủ kẹt giữa chừng.
  useEffect(() => {
    if (phase !== 'play' && phase !== 'loop') return undefined;
    const onVis = () => {
      if (document.hidden) return;
      const v = phase === 'loop' ? loopRef.current : mainRef.current;
      if (v && v.paused && !v.ended) v.play().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onVis);
    return () => { document.removeEventListener('visibilitychange', onVis); window.removeEventListener('focus', onVis); };
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
            onPlaying={(e) => {
              started.current = true;
              if (musicOn.current) musicRef.current?.follow((music?.start || 0) + e.currentTarget.currentTime);
              else startMusic();
            }}
            // 'pause' cũng bắn khi video hết — lúc đó nhạc phải chạy tiếp (lắng xuống ở bước mờ)
            onPause={(e) => { if (!e.currentTarget.ended) musicRef.current?.hold(); }}
            onWaiting={() => musicRef.current?.hold()}
            onEnded={onMainEnded}
            onError={() => { if (!started.current) setPhase('still'); else leave(); }}
          />
        </>
      )}
      </div>
      {DEBUG && <DebugPanel phase={phase} musicRef={musicRef} mainRef={mainRef} />}
    </div>
  );
}
