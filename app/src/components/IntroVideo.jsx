import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { mqMatches, PHONE_QUERY } from '../hooks/useViewport';
import { lockScroll, unlockScroll } from '../lib/scrollLock';
import IntroGate, { GATE_LEAD_S } from './IntroGate';

/**
 * Video mở đầu (11/2026) — lớp phủ toàn màn hình trên hero, chỉ ở trang khách `/`.
 *
 * Ba bản dựng sẵn khớp ba bố cục: điện thoại/tablet dọc, điện thoại/tablet ngang, desktop.
 * Mỗi bản kết thúc bằng thẻ thiệp đỏ #4A000B đúng chỗ thẻ hero, nên lúc lớp phủ mờ đi
 * khách thấy chữ hiện dần trên chính tấm thẻ đó.
 *
 * - Khổ dọc mở đầu bằng PHONG BÌ (IntroGate, 11/2026): phong bì đỏ rượu vang, dấu sáp vàng logo HM; khách
 *   chạm thì nhạc vào, phong bì mở ra thấy khung video (viền vàng, như main) nằm sẵn bên dưới, vạt tan
 *   đi thì video chạy. Khổ ngang / máy tính chưa có phong bì. Lần nào vào cũng có cổng (chủ thiệp chọn): cú chạm
 *   mở cổng chính là cử chỉ trình duyệt cần để cho phát tiếng.
 * - Lần nào cũng một video (12,9 s; chủ thiệp bỏ bản ngắn và cảnh cô dâu đi một mình qua đám hoa).
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
const VER = { portrait: '20261121v6', landscape: '20261121v6', desktop: '20261121v6' };
const VER_JOIN = '20261121v6'; // ảnh chờ (poster-join = khung JOIN của video, cũng là lòng phong bì)
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
const DUR = { full: 12.9 };
// Sau cổng: video bắt đầu từ giây JOIN (bản đầy đủ mở bằng 1,2 s tối — bỏ đi, cổng đã thay nó) và chạy
// ngay khi phong bì mở tới thiệp kem (GATE_LEAD_S sau cú chạm), hoà vào dưới clip mở.
const JOIN = { full: 1.2 };

const SFX_URL = '/assets/intro/envelope/sfx.mp3?v=20261121k';
// Kết (chủ thiệp 11/2026): CHÍNH KHUNG video trượt + co giãn thành thẻ thiệp thật ở đúng chỗ của
// nó, hình trong khung tan thành đỏ #4A000B rồi lớp phủ mờ vào trang. Không dùng đoạn "thu vào
// thẻ" có sẵn trong video: trong khung nó thành khung lồng khung, còn mở khung ra toàn màn thì
// thành phóng to rồi thu lại — cả hai đều bị chê. Video dừng ở khung hình ngay trước đoạn đó.
const CARD_AT = { full: 10.15 }; // giây video bắt đầu thu vào thẻ (bản dựng v6: thu ở 10,2 s)
const CARD_MOVE_MS = 1300; // khung → thẻ
const CARD_HOLD_MS = 900; // thẻ đỏ đứng một nhịp rồi mới mờ vào trang
/** Khung thẻ thiệp thật trên trang (+ khoảng lùi của viền vàng bên trong). */
function cardRect() {
  const el = document.querySelector('.hm-title, .hero-title-card');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  const f = el.querySelector('.frame')?.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height, inset: f ? Math.max(0, f.left - r.left) : 12 };
}

/**
 * Thẻ audio + (nếu có) Web Audio GainNode để chỉnh âm lượng — iOS bỏ qua `audio.volume`,
 * chỉ GainNode mới hạ/tăng được tiếng. File Supabase có CORS `*` nên dùng được crossOrigin.
 */
function createMusic(url, sfxUrl) {
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
  // Tiếng giấy / bóc sáp (phong bì) — chung AudioContext để iOS cho kêu cùng lúc với nhạc.
  let fx = null;
  if (sfxUrl) {
    fx = new Audio();
    fx.preload = 'auto';
    fx.src = sfxUrl;
    try { if (ctx) ctx.createMediaElementSource(fx).connect(ctx.destination); } catch { /* vẫn kêu bằng thẻ audio */ }
  }
  const sfx = () => { if (!fx) return; try { fx.currentTime = 0; } catch { /* chưa tải */ } fx.play().catch(() => {}); };
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
    // resume() phải gọi ngay (cùng nhịp với cử chỉ của khách), rồi mới chờ.
    const resumed = ctx && ctx.state !== 'running' ? ctx.resume().catch(() => {}) : null;
    try { await a.play(); } catch { return false; }
    if (ctx && ctx.state !== 'running') {
      // Máy chậm cần vài trăm ms mới chuyển sang 'running' — chờ tới 0,8 s rồi mới kết luận bị chặn
      await Promise.race([resumed, new Promise((r) => setTimeout(r, 800))]);
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
  const destroy = () => { a.pause(); a.removeAttribute('src'); fx?.pause(); try { ctx?.close(); } catch { /* đã đóng */ } };
  const state = () => ({ ctx: ctx ? ctx.state : 'none', paused: a.paused, t: a.currentTime, vol: level() });
  // Video dừng (Safari tự dừng video câm khi cửa sổ/ứng dụng bị che, hoặc đang tải) → nhạc dừng
  // theo; video chạy lại → tua nhạc đúng chỗ rồi phát tiếp, không thì nhạc chạy trước video.
  const hold = () => { if (!a.paused) a.pause(); };
  const follow = (at) => {
    try { if (Math.abs(a.currentTime - at) > 0.25) a.currentTime = at; } catch { /* chưa tua được */ }
    if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
    if (a.paused) a.play().catch(() => {});
  };
  return { el: a, play, sfx, fadeOut, destroy, state, hold, follow };
}

function pickKind() {
  if (!mqMatches(PHONE_QUERY)) return 'desktop';
  return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
}

function readSeen() {
  try { return window.localStorage.getItem(SEEN_KEY) === '1'; } catch { return false; }
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
  const still = mqMatches('(prefers-reduced-motion: reduce)') || slowNetwork();
  const media = kind;
  // Phong bì mở thiệp: mới có khổ dọc (chủ thiệp: "làm dọc trước")
  const gate = !still && kind === 'portrait';
  // Lần tải lại (chủ thiệp: chỉ một video → không chiếu lại): có phong bì thì phong bì mở thẳng vào trang
  // hero thật (clip trong suốt phần bên trong); chưa có phong bì (ngang / máy tính) thì vào thẳng trang.
  const seen = readSeen() && !(import.meta.env.DEV && /introtest=full/.test(window.location.search));
  if (seen && !gate) return null;
  // Nhạc nền của trang (Nav) chờ intro xong — xem Nav.jsx. Đặt ngay lúc quyết định, trước mọi effect.
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
    pageReveal: gate && seen, // phong bì mở thẳng vào trang, không có video
    // Chưa có phong bì (ngang / máy tính), lần đầu: chiếu từ 0 như trước
    join: gate ? JOIN.full : 0,
    dur: DUR.full,
    // Có cổng: bản đầy đủ bắt đầu ở JOIN.full — ghi thẳng vào URL (#t=): Safari iPhone bỏ qua lệnh
    // tua bằng code khi video chưa tải, video sẽ chạy từ 0 hoặc kẹt.
    main: base + (lite ? 'full-720.mp4' : 'full.mp4') + V + (gate ? `#t=${JOIN.full}` : ''),
    loop: `${base}loop.mp4${V}`,
    // ảnh chờ = khung ĐẦU của đúng bản sẽ phát (không phải thẻ đỏ cuối video). Có cổng thì bản đầy
    // đủ bắt đầu ở JOIN.full — Safari iPhone không vẽ khung đã tua của video chưa chạy, chỉ hiện ảnh chờ.
    poster: base + (gate ? 'poster-join.jpg' : 'poster-full.jpg') + `?v=${VER_JOIN}`,
    card: `${base}poster-card.jpg${V}`,
  };
}

/**
 * @param ready   trang đã có nội dung (useSiteConfig hết loading)
 * @param enabled null khi chưa biết cài đặt; true/false khi đã đọc site_config
 */
const DEBUG = typeof window !== 'undefined' && /introdebug=1/.test(window.location.search);

/** ?introdebug=1 — vài dòng trạng thái góc trên trái, để thử trên điện thoại thật (Safari). */
function DebugPanel({ phase, needTap, musicRef, mainRef }) {
  const [, tick] = useState(0);
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 250); return () => clearInterval(id); }, []);
  const m = musicRef.current?.state();
  const v = mainRef.current;
  const site = document.querySelector('nav audio, .nav audio, audio');
  return (
    <pre className="intro-debug">
      {`phase ${phase} · tap ${needTap ? 'CẦN' : 'không'} · ${document.visibilityState}
video ${v ? `${v.currentTime.toFixed(1)}${v.paused ? ' (dừng)' : ''}` : '-'}
nhạc ${m ? `${m.paused ? 'dừng' : 'phát'} ${m.t.toFixed(1)}s vol ${m.vol.toFixed(2)} ctx ${m.ctx}` : '-'}
audioSession ${navigator.audioSession?.type || 'không có'}
nhạc nền ${site ? (site.paused ? 'dừng' : `phát ${site.currentTime.toFixed(1)}s`) : '-'}
${window.__introErr || ''}`}
    </pre>
  );
}

export default function IntroVideo(props) {
  return <IntroVideoMain {...props} />;
}

function IntroVideoMain({ ready, enabled, music }) {
  const [p] = useState(plan);
  // wait (chờ cài đặt) → gate (cổng thiệp) → play → (loop) → out → done; still: ảnh thẻ rồi out
  const [phase, setPhase] = useState(() => (p ? 'wait' : 'done'));
  const mainRef = useRef(null);
  const loopRef = useRef(null);
  const started = useRef(false);
  const mode = useRef('none');
  const musicRef = useRef(null);
  const musicOn = useRef(false);
  const [needTap, setNeedTap] = useState(false);
  const needTapRef = useRef(false);
  needTapRef.current = needTap;
  // Nhạc vào từ lúc chạm mở cổng, trước video ~3 s → khớp theo độ lệch đo lúc video bắt đầu chạy.
  const offsetRef = useRef(null); // giây nhạc − giây video
  const [gateGone, setGateGone] = useState(false); // phong bì đã mờ hết và được gỡ
  const [vidOn, setVidOn] = useState(false); // video chính đã thực sự chạy (bỏ ảnh chờ phủ trên)
  const gateGoneRef = useRef(false);
  gateGoneRef.current = gateGone;
  const readyRef = useRef(ready);
  readyRef.current = ready;

  const [morph, setMorph] = useState(null);
  const [card, setCard] = useState(null); // đang thành thẻ: { x, y, w, h, inset }
  const cardRef = useRef(null);
  cardRef.current = card;
  // Khung video luôn như main (viền vàng trên nền hoa đỏ — chủ thiệp giữ khung). Có phong bì thì khung đã
  // nằm sẵn dưới phong bì (lòng phong bì trong suốt), không trượt hay đổi cỡ.
  const baseBox = () => frameBox(p.kind);
  const boxNow = () => cardRef.current || baseBox();
  const [box, setBox] = useState(() => (p ? baseBox() : null));
  useEffect(() => {
    if (!p) return undefined;
    const onResize = () => {
      if (cardRef.current) { const r = cardRect(); if (r) { setCard(r); setBox(r); } return; }
      setBox(baseBox());
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  /** Khung → thẻ thật. false nếu chưa đo được thẻ (khi đó để video tự thu vào thẻ như cũ). */
  const toCard = () => {
    if (cardRef.current) return true;
    const r = cardRect();
    if (!r) return false;
    cardRef.current = r;
    mainRef.current?.pause(); // đứng ở khung hình trước đoạn thu vào thẻ có sẵn trong video
    setCard(r);
    setBox(r);
    return true;
  };
  // Rời lớp phủ. Có View Transitions (Safari 18+, Chrome): gỡ lớp phủ NGAY trong một chuyển cảnh — trình duyệt
  // hoà mờ ảnh chụp lớp phủ vào trang thật (trang vào + chữ trồi lên chạy thật bên dưới). Safari iOS chỉ đổi màu
  // thanh trạng thái / thanh địa chỉ khi lớp phủ bị GỠ; mờ dần rồi mới gỡ thì hai thanh chớp đổi màu sau khi
  // trang đã hiện (chủ thiệp: "khựng khi vào trang"). Không hỗ trợ / giảm chuyển động: mờ dần như cũ.
  const leavingRef = useRef(false);
  const leave = () => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    const calm = mqMatches('(prefers-reduced-motion: reduce)');
    if (document.startViewTransition && !calm) {
      // Trong lúc chuyển cảnh trang đứng yên (thẻ hero đã ở chỗ thẻ đỏ, chữ + nav còn ẩn); chuyển cảnh XONG
      // mới cho trang "vào" — transition nào đang chạy khi View Transition kết thúc thì Safari chạy lại từ đầu.
      const vt = document.startViewTransition(() => {
        flushSync(() => {
          document.documentElement.dataset.introIn = '';
          musicRef.current?.fadeOut();
          setPhase('done');
        });
      });
      const enter = () => {
        window.dispatchEvent(new Event('hm-intro-leave'));
        // nav đã nhận .visible (cùng trạng thái) → bỏ cờ, trả nav về luật thường (ẩn khi cuộn…)
        setTimeout(() => { delete document.documentElement.dataset.introIn; }, 200);
      };
      vt.finished.then(enter, enter);
      return;
    }
    setPhase((ph) => (ph === 'out' || ph === 'done' ? ph : 'out'));
  };
  // Kết tự nhiên (hết video / hết vòng lặp / ảnh thẻ): co khung về thẻ thật rồi mờ.
  // Khách chạm bỏ qua giữa chừng thì chỉ mờ (`leave`).
  const settle = () => {
    if (p && !cardRef.current) setMorph(settleTransform(p.media, boxNow()));
    leave();
  };
  // Thành thẻ xong: giữ một nhịp, rồi vào trang (chờ trang sẵn sàng tối đa LOOP_CAP_MS).
  useEffect(() => {
    // (tải lại: khung đã thành thẻ ngay từ đầu, nằm dưới phong bì — chỉ rời đi khi phong bì mở xong)
    if (!card || phase === 'out' || phase === 'done' || phase === 'gate') return undefined;
    const go = () => { if (readyRef.current) leave(); };
    // Thẻ hero desktop còn đang thu nhẹ lúc trang vừa mở (.hero-stage 1,07 → 1 trong 2,2 s): đo lại
    // liên tục để khung khớp từng pixel lúc mờ đi.
    const follow = setInterval(() => {
      const r = cardRect();
      const b = cardRef.current;
      if (r && b && (Math.abs(r.x - b.x) > 0.5 || Math.abs(r.w - b.w) > 0.5 || Math.abs(r.y - b.y) > 0.5 || Math.abs(r.h - b.h) > 0.5)) {
        cardRef.current = r; setBox(r);
      }
    }, 120);
    const t = setTimeout(go, CARD_MOVE_MS + CARD_HOLD_MS);
    const cap = setTimeout(leave, CARD_MOVE_MS + CARD_HOLD_MS + LOOP_CAP_MS);
    return () => { clearTimeout(t); clearTimeout(cap); clearInterval(follow); };
  }, [card, ready]);
  // Canh đúng lúc video bắt đầu thu vào thẻ (rAF chính xác hơn timeupdate ~4 lần/giây)
  useEffect(() => {
    if (phase !== 'play' || !p) return undefined;
    const at = CARD_AT.full;
    let raf = 0;
    const tick = () => {
      const v = mainRef.current;
      // Sau cổng, bản rút gọn chỉ còn 0,45 s trước đoạn này: đợi cổng gỡ xong đã
      if (v && v.currentTime >= at && (!p.gate || gateGoneRef.current)) { toCard(); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

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
      musicRef.current = createMusic(url, p.gate ? SFX_URL : null);
      if (import.meta.env.DEV) window.__introMusic = musicRef.current; // chỉ để kiểm tra khi phát triển
    }
    setPhase(p.still ? 'still' : p.gate ? 'gate' : 'play');
  }, [phase, enabled, waitedOut]);

  // Tải lại (chủ thiệp: kết giống đoạn cuối video): dưới phong bì, khung đã là THẺ ĐỎ TRỐNG đúng chỗ thẻ
  // hero (nền đỏ #4A000B + viền vàng trong). Phong bì mở ra thấy thẻ trống, rồi lớp phủ mờ đi và chữ của
  // thẻ thật hiện dần trên chính tấm thẻ đó — y như sau video.
  useEffect(() => {
    if (phase !== 'gate' || !p.pageReveal || cardRef.current) return undefined;
    const t = setInterval(() => {
      const r = cardRect();
      if (!r) return;
      clearInterval(t);
      cardRef.current = r;
      setCard(r);
      setBox(r);
    }, 60);
    return () => clearInterval(t);
  }, [phase]);

  // Phong bì. onGateOpen chạy ĐỒNG BỘ trong cú chạm — nhạc và tiếng giấy phải gọi play() ngay.
  // Làm nóng video chính ngay trong cú chạm: chạy (tắt tiếng) rồi dừng ngay, tua về đầu. Không thì lúc
  // phong bì mở xong trình duyệt mới khởi động bộ giải mã 1080p → đứng hình ~0,3 s (đo trong Chrome).
  const warming = useRef(false);
  const warmMain = () => {
    const v = mainRef.current;
    if (!v || started.current) return;
    warming.current = true;
    v.muted = true;
    const done = () => {
      v.pause();
      try { v.currentTime = p.join; } catch { /* chưa có dữ liệu */ }
      warming.current = false;
    };
    const pr = v.play();
    if (pr && pr.then) pr.then(done, () => { warming.current = false; });
    else done();
  };
  const onGateOpen = () => {
    if (p.pageReveal) { musicRef.current?.sfx(); return; } // chỉ tiếng giấy; nhạc nền trang vào sau
    warmMain();
    const m = musicRef.current;
    if (!m) return;
    m.sfx();
    m.play(music?.start || 0, GATE_LEAD_S + p.dur - p.join).then((ok) => { musicOn.current = ok; });
  };
  // Phong bì đã mở tới thiệp kem: khung (kín màn) hiện dưới phong bì và video chạy; phong bì mờ dần
  const onGateCut = () => {
    if (p.pageReveal) return; // tải lại: đợi vạt tan hết (onGateDone) rồi mới vào trang
    setPhase((ph) => (ph === 'gate' ? 'play' : ph));
  };
  // Vạt đã tan hết. Tải lại: lớp phủ giờ chỉ còn nền + thẻ đỏ trống (khung tĩnh, không còn clip trong suốt
  // đang chạy) → chuyển cảnh vào trang (View Transition chụp khung tĩnh này — sạch, không chụp sai video).
  const onGateDone = () => {
    setGateGone(true);
    if (p.pageReveal) leave();
  };

  /** Bắt nhạc theo đúng chỗ video đang chạy. Bị chặn tự phát → hiện "Chạm để bật nhạc". */
  const startMusic = async () => {
    const m = musicRef.current;
    const v = mainRef.current;
    if (!m || !v || musicOn.current) return;
    const at = (offsetRef.current ?? (music?.start || 0)) + (v.currentTime || 0);
    const ok = await m.play(at, Math.max(0.6, p.dur - (v.currentTime || 0)));
    musicOn.current = ok;
    setNeedTap(!ok);
  };

  // Khi lớp phủ bắt đầu mờ: nhạc lắng xuống. Khi xong hẳn: báo Nav phát nhạc nền.
  useEffect(() => {
    if (phase === 'out') {
      musicRef.current?.fadeOut();
      window.dispatchEvent(new Event('hm-intro-leave')); // App: trang "vào" (animation lúc mở trang) ngay lúc này
    }
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

  // Chạm / bấm / phím. Không chặn lan truyền — Nav cần cử chỉ này để mở khoá nhạc nền (iOS).
  // Trình duyệt chặn tự phát tiếng khi khách chưa chạm trang (iPhone luôn chặn, máy tính và
  // Android thường chặn lần đầu). Chủ thiệp chọn (11/2026):
  // - Nhạc đang bị chặn: hiện "Chạm để bật nhạc"; lần chạm đó BẬT NHẠC (không bỏ qua video).
  //   Bắt ở touchend / click / keydown: iOS Safari KHÔNG tính pointerup là cử chỉ cho phép phát.
  // - Còn lại: chạm / lăn chuột / phím → bỏ qua. Nút "Bỏ qua" và phím Esc luôn bỏ qua.
  useEffect(() => {
    if (phase === 'done' || phase === 'out') return undefined;
    if (phase === 'gate') {
      // Cổng tự lo cú chạm (mở thiệp); chỉ Esc là bỏ qua cả màn mở đầu
      const onEsc = (e) => { if (e.key === 'Escape') leave(); };
      window.addEventListener('keydown', onEsc);
      return () => window.removeEventListener('keydown', onEsc);
    }
    const onSkipButton = (e) => !!e.target?.closest?.('.intro-skip');
    const onDown = (e) => { if (!onSkipButton(e) && !needTapRef.current) leave(); };
    const onActivate = (e) => {
      if (!needTapRef.current || onSkipButton(e)) return;
      needTapRef.current = false; // một lần chạm bắn cả touchend lẫn click — chỉ bật một lần
      setNeedTap(false);
      startMusic();
    };
    const onKey = (e) => {
      if (e.key === 'Escape' || !needTapRef.current) { leave(); return; }
      needTapRef.current = false;
      setNeedTap(false);
      startMusic();
    };
    const ACT = ['touchend', 'click'];
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('wheel', leave, { passive: true });
    window.addEventListener('keydown', onKey);
    ACT.forEach((t) => window.addEventListener(t, onActivate, { passive: true }));
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('wheel', leave);
      window.removeEventListener('keydown', onKey);
      ACT.forEach((t) => window.removeEventListener(t, onActivate));
    };
  }, [phase]);

  // Phát video chính; không chạy được trong START_GRACE_MS → chuyển sang ảnh thẻ.
  useEffect(() => {
    if (phase !== 'play') return undefined;
    const v = mainRef.current;
    if (!v) return undefined;
    v.muted = true;
    const start = () => {
      const pr = v.play();
      if (pr && pr.catch) pr.catch((err) => { if (DEBUG) window.__introErr = `play: ${err?.name} ${err?.message || ''}`; if (!started.current) setPhase('still'); });
    };
    start();
    const t = setTimeout(() => { if (!started.current) setPhase('still'); }, START_GRACE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  // Giữ nhạc khớp video: iPhone khởi động âm thanh chậm (~0,8 s sau cú chạm) nên nhạc trễ cố định.
  // Mỗi giây so một lần; lệch quá 0,3 s thì tua nhạc về đúng chỗ video.
  useEffect(() => {
    if (phase !== 'play') return undefined;
    const id = setInterval(() => {
      const v = mainRef.current;
      const m = musicRef.current;
      if (!musicOn.current || !v || !m || v.paused || m.el.paused) return;
      const want = (offsetRef.current ?? (music?.start || 0)) + v.currentTime;
      if (Math.abs(m.el.currentTime - want) > 0.3) m.el.currentTime = want;
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Quay lại trang (chuyển tab / ứng dụng / cửa sổ bị che rồi hiện lại): Safari có thể đã tự
  // dừng video câm và không tự chạy lại → gọi phát lại, kẻo lớp phủ kẹt giữa chừng.
  useEffect(() => {
    if (phase !== 'play' && phase !== 'loop') return undefined;
    const onVis = () => {
      if (document.hidden) return;
      const v = phase === 'loop' ? loopRef.current : mainRef.current;
      if (v && v.paused && !v.ended && !cardRef.current) v.play().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onVis);
    return () => { document.removeEventListener('visibilitychange', onVis); window.removeEventListener('focus', onVis); };
  }, [phase]);

  // Hết video chính: trang sẵn sàng thì vào, chưa thì chuyển sang vòng lặp (liền khung).
  const onMainEnded = () => {
    if (cardRef.current) return; // đã thành thẻ — hẹn giờ ở trên lo phần vào trang
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
  if (phase === 'gate' || phase === 'play' || phase === 'loop') mode.current = 'video';
  else if (phase === 'still') mode.current = 'still';
  if (phase === 'still' && !card) setTimeout(toCard, 0);
  const still = mode.current === 'still';
  return (
    <div
      className={`intro-video intro-${p.kind} ${phase === 'out' ? 'out' : ''} ${morph ? 'settle' : ''} ${p.pageReveal ? 'page-reveal' : ''} ${p.pageReveal && !card ? 'no-card' : ''}`}
      style={{ '--intro-fade': `${FADE_MS}ms`, '--intro-settle': `${SETTLE_DELAY_MS}ms` }}
      onTouchMove={(e) => e.preventDefault()}
      aria-hidden={phase === 'gate' ? undefined : 'true'}
    >
      <div
        // Chưa biết cài đặt (wait) thì khung ẩn: chỉ có nền hero, không chớp khung đỏ rỗng
        className={`intro-frame ${mode.current === 'none' ? 'empty' : ''}  ${card ? 'card' : ''}`}
        style={{
          left: box.x, top: box.y, width: box.w, height: box.h,
          ...(card ? { '--card-inset': `${card.inset}px`, '--card-move': `${CARD_MOVE_MS}ms` } : null),
          ...(morph ? { transform: morph } : null),
        }}
      >
      {mode.current === 'none' || p.pageReveal ? null : still ? (
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
            preload="auto"
            disablePictureInPicture
            onPlaying={(e) => {
              if (warming.current) return; // đang làm nóng lúc mở cổng — chưa phải video chạy thật
              const v = e.currentTarget;
              setVidOn(true);
              const go = () => {
                started.current = true;
                const m = musicRef.current;
                if (musicOn.current && m) {
                  // lần chạy đầu: đo độ lệch nhạc − video (nhạc đã chạy từ lúc chạm cổng)
                  if (offsetRef.current == null) offsetRef.current = m.el.currentTime - v.currentTime;
                  m.follow(offsetRef.current + v.currentTime);
                } else startMusic();
              };
              go();
            }}
            // 'pause' cũng bắn khi video hết — lúc đó nhạc phải chạy tiếp (lắng xuống ở bước mờ)
            // Chỉ khi video đã chạy: lúc chờ sau cổng, tua tới p.join cũng có thể bắn waiting/pause
            onPause={(e) => { if (started.current && !e.currentTarget.ended && !cardRef.current) musicRef.current?.hold(); }}
            onWaiting={() => { if (started.current) musicRef.current?.hold(); }}
            onEnded={onMainEnded}
            onError={() => { if (DEBUG) window.__introErr = `video error ${mainRef.current?.error?.code}`; if (!started.current) setPhase('still'); else leave(); }}
          />
          {/* Ảnh chờ thật (Safari iPhone không hiện poster sau khi đã gọi play/tua) — sau cổng */}
          {p.gate && !vidOn && phase !== 'loop' && <img className="intro-media" src={p.poster} alt="" decoding="async" />}
        </>
      )}
      </div>
      {DEBUG && <DebugPanel phase={phase} needTap={needTap} musicRef={musicRef} mainRef={mainRef} />}
      {p.gate && !gateGone && phase !== 'wait' && (
        <IntroGate onOpen={onGateOpen} onCut={onGateCut} onDone={onGateDone} />
      )}
      {(phase === 'play' || phase === 'loop') && (!p.gate || gateGone) && (
        <>
          {needTap && <div className="intro-hint">♪ Chạm để bật nhạc</div>}
          <button type="button" className="intro-skip" onClick={leave}>Bỏ qua</button>
        </>
      )}
    </div>
  );
}
