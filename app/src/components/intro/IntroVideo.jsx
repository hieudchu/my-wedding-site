import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { mqMatches } from '../../hooks/useViewport';
import { lockScroll, unlockScroll } from '../../lib/scrollLock';
import IntroGate, { GATE_LEAD_S } from './IntroGate';
import IntroDebug, { DEBUG } from './IntroDebug';
import { plan, writeSeen } from './plan';
import { cardRect, fit32, frameBox, settleTransform } from './geometry';
import { createMusic, MUSIC_DEFAULT, MUSIC_FADE_S, SFX_URL } from './music';

/**
 * Màn mở đầu trên trang khách `/` — lớp phủ toàn màn trên hero. Tổng quan: docs/intro-overview.md.
 *
 * Lần đầu: phong bì (IntroGate) nằm trên thẻ hero → khách chạm (nhạc + tiếng giấy) → vạt mở ra thấy khung đầu video
 * → video chạy (khổ dọc: trong thẻ; khổ ngang / máy tính: khung nở ra khung video lớn) → tới CARD_AT_S khung thành
 * thẻ đỏ đúng chỗ thẻ hero → lớp phủ rời đi bằng View Transition, chữ thẻ thật trồi lên.
 * Tải lại: phong bì mở ra thẻ đỏ trống rồi vào trang (không chiếu lại video).
 * Giảm chuyển động / tiết kiệm dữ liệu / video lỗi: ảnh thẻ rồi vào trang. Link có neo (#rsvp…): không chiếu.
 * Admin tắt được (site_config `intro_video` = 'off'); chưa biết cài đặt thì lớp phủ chỉ là nền đỏ, chưa tải video.
 *
 * phase: wait (chờ cài đặt) → gate (phong bì) → play → (loop: trang chưa sẵn sàng) → out → done; still: ảnh thẻ.
 */

const LOOP_CAP_MS = 8000; // chờ trang tối đa bấy nhiêu sau khi hết video
const START_GRACE_MS = 3500; // video chưa chạy sau chừng này → coi như không phát được
const FADE_MS = 650;
const SETTLE_DELAY_MS = 250; // dự phòng settleTransform: khung co về thẻ trước, rồi mới mờ
const POSTER_HOLD_MS = 700;
const WAIT_CAP_MS = 2500; // đọc cài đặt bật/tắt quá lâu → coi như bật
const MUSIC_GAP_MS = 3000; // chủ thiệp: nhạc nền của trang nghỉ một nhịp rồi mới vào nhẹ
// Kết (chủ thiệp): CHÍNH KHUNG video thành thẻ thiệp thật ở đúng chỗ của nó, hình tan thành đỏ #4A000B.
// Video dừng ngay trước đoạn "thu vào thẻ" có sẵn trong video (khung lồng khung / phóng to rồi thu lại đều bị chê).
const CARD_AT_S = 10.15;
const CARD_MOVE_MS = 1300; // khung → thẻ
// Thành thẻ xong là rời lớp phủ ngay, không giữ thẻ đỏ trống (review 25/11: ~3 s thẻ trống tưởng trang đơ).
// Khổ dọc: khung đã là thẻ, chỉ chờ hình tan thành đỏ (.in-card.card .intro-media 0,55 s). Khổ ngang / máy tính:
// chờ khung trượt về thẻ xong. Chữ thẻ trồi lên ngay sau chuyển cảnh, nhanh hơn lần mở trang thường (html[data-hero-quick]).
const CARD_RED_MS = 550;
const CARD_SETTLE_MS = CARD_MOVE_MS + 100;
const WIDEN_MS = 900; // tải lại khổ ngang: thẻ đỏ 3:2 giãn ra thẻ hero (= .intro-frame.widen)

/**
 * @param ready   trang đã có nội dung (useSiteConfig hết loading)
 * @param enabled null khi chưa biết cài đặt; true/false khi đã đọc site_config
 * @param music   { url, start } nhạc mở đầu admin chọn (không có → MUSIC_DEFAULT)
 */
export default function IntroVideo({ ready, enabled, music }) {
  const [p] = useState(plan);
  const [phase, setPhase] = useState(() => (p ? 'wait' : 'done'));
  const wide = !!p && p.kind !== 'portrait';
  const mainRef = useRef(null);
  const progRef = useRef(null); // vạch tiến trình (.intro-prog i): ghi transform thẳng trong vòng rAF, không render lại
  const loopRef = useRef(null);
  const started = useRef(false);
  const mode = useRef('none'); // đang hiện gì: none (chờ cài đặt / bị tắt) · video · still
  const musicRef = useRef(null);
  const musicOn = useRef(false);
  const offsetRef = useRef(null); // giây nhạc − giây video (nhạc vào từ lúc chạm phong bì)
  const [needTap, setNeedTap] = useState(false);
  const needTapRef = useRef(false);
  needTapRef.current = needTap;
  const [vidOn, setVidOn] = useState(false); // video chính đã thực sự chạy (bỏ ảnh chờ phủ trên)
  const [revealCut, setRevealCut] = useState(false); // tải lại khổ ngang: vạt mở hết → hiện thẻ đỏ dưới phong bì
  const [gateGone, setGateGone] = useState(false); // phong bì đã mờ hết và được gỡ
  const gateGoneRef = useRef(false);
  gateGoneRef.current = gateGone;
  const readyRef = useRef(ready);
  readyRef.current = ready;

  // Khung (.intro-frame). Có phong bì: khung là thẻ hero (khổ ngang: phần 3:2 giữa thẻ — fit32) cho tới khi
  // - 'video': lần đầu khổ ngang / máy tính, phong bì tan → khung nở ra khung video lớn (frameBox);
  // - 'widened': phong bì tan → khung 3:2 giãn ra cả thẻ hero (tải lại khổ ngang / máy tính; lần đầu máy tính: video chạy
  //   trong thẻ).
  const [frameMode, setFrameMode] = useState('card');
  const frameModeRef = useRef('card');
  frameModeRef.current = frameMode;
  const [card, setCard] = useState(null); // khung đang là / thành thẻ: { x, y, w, h, inset }
  const cardRef = useRef(null);
  cardRef.current = card;
  const [morph, setMorph] = useState(null);
  const baseBox = () => (p.gate && frameModeRef.current !== 'video' ? cardRect() : frameBox(p.kind));
  const boxNow = () => cardRef.current || baseBox();
  const [box, setBox] = useState(() => (p ? baseBox() : null));
  useEffect(() => {
    if (!p) return undefined;
    const onResize = () => {
      if (cardRef.current) { const r = cardRect(); if (r) { setCard(r); setBox(r); } return; }
      const b = baseBox();
      if (b) setBox(b);
    };
    window.addEventListener('resize', onResize);
    // Thẻ hero còn xê dịch lúc trang đang dựng (đo sớm thì lệch ~46 px) → đo lại liên tục để phong bì khít thẻ
    let t = 0;
    if (p.gate) {
      t = setInterval(() => {
        if (frameModeRef.current === 'video') return; // khung đã nở ra khung video: thôi bám thẻ
        const r = cardRect();
        if (!r) return;
        setBox((b) => (b && Math.abs(b.x - r.x) < 0.5 && Math.abs(b.y - r.y) < 0.5 && Math.abs(b.w - r.w) < 0.5 && Math.abs(b.h - r.h) < 0.5 ? b : r));
        if (cardRef.current) cardRef.current = r;
      }, 100);
    }
    return () => { window.removeEventListener('resize', onResize); clearInterval(t); };
  }, []);

  /** Khung → thẻ thật. false nếu chưa đo được thẻ. */
  const toCard = () => {
    if (cardRef.current) return true;
    const r = cardRect();
    if (!r) return false;
    cardRef.current = r;
    mainRef.current?.pause();
    setCard(r);
    setBox(r);
    return true;
  };

  // Rời lớp phủ bằng View Transition: Safari iOS chỉ đổi màu thanh trạng thái / địa chỉ khi lớp phủ bị GỠ (mờ dần
  // rồi mới gỡ thì hai thanh chớp màu sau khi trang đã hiện). Trang chỉ "vào" khi chuyển cảnh XONG — transition nào
  // còn chạy lúc View Transition kết thúc thì Safari chạy lại từ đầu. Không hỗ trợ / giảm chuyển động: mờ dần.
  const leavingRef = useRef(false);
  const leave = () => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    document.documentElement.dataset.heroQuick = ''; // chữ thẻ hero trồi nhanh hơn (chưa .ready nên chưa đổi gì lúc chụp)
    if (document.startViewTransition && !mqMatches('(prefers-reduced-motion: reduce)')) {
      const vt = document.startViewTransition(() => {
        flushSync(() => {
          document.documentElement.dataset.introIn = '';
          musicRef.current?.fadeOut();
          setPhase('done');
        });
      });
      const enter = () => {
        window.dispatchEvent(new Event('hm-intro-leave'));
        // nav đã nhận .visible → bỏ cờ, trả nav về luật thường (ẩn khi cuộn…)
        setTimeout(() => { delete document.documentElement.dataset.introIn; }, 200);
      };
      vt.finished.then(enter, enter);
      return;
    }
    setPhase((ph) => (ph === 'out' || ph === 'done' ? ph : 'out'));
  };
  // Kết tự nhiên: khung đã thành thẻ thì chỉ rời đi; không đo được thẻ thì co bằng transform (dự phòng)
  const settle = () => {
    if (p && !cardRef.current) setMorph(settleTransform(p.media, boxNow()));
    leave();
  };

  // Thành thẻ xong: giữ một nhịp, rồi vào trang (chờ trang sẵn sàng tối đa LOOP_CAP_MS)
  useEffect(() => {
    if (!card || phase === 'out' || phase === 'done' || phase === 'gate') return undefined;
    const go = () => { if (readyRef.current) leave(); };
    // Thẻ hero desktop còn thu nhẹ lúc trang vừa mở (.hero-stage 1,07 → 1): đo lại để khung khớp từng pixel
    const follow = setInterval(() => {
      const r = cardRect();
      const b = cardRef.current;
      if (r && b && (Math.abs(r.x - b.x) > 0.5 || Math.abs(r.w - b.w) > 0.5 || Math.abs(r.y - b.y) > 0.5 || Math.abs(r.h - b.h) > 0.5)) {
        cardRef.current = r; setBox(r);
      }
    }, 120);
    const wait = p.gate && frameModeRef.current !== 'video' ? CARD_RED_MS : CARD_SETTLE_MS;
    const t = setTimeout(go, wait);
    const cap = setTimeout(leave, wait + LOOP_CAP_MS);
    return () => { clearTimeout(t); clearTimeout(cap); clearInterval(follow); };
  }, [card, ready]);
  // Canh đúng CARD_AT_S (rAF chính xác hơn timeupdate ~4 lần/giây); đợi phong bì gỡ xong đã
  useEffect(() => {
    if (phase !== 'play' || !p) return undefined;
    let raf = 0;
    const tick = () => {
      const v = mainRef.current;
      if (v && progRef.current) {
        const k = Math.min(1, Math.max(0, (v.currentTime - p.join) / (CARD_AT_S - p.join)));
        progRef.current.style.transform = `scaleX(${k.toFixed(4)})`;
      }
      if (v && v.currentTime >= CARD_AT_S && gateGoneRef.current) { toCard(); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  // Chờ cài đặt admin: tắt → mờ ngay vào trang; bật → chiếu (và ghi cờ đã xem)
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
      musicRef.current = createMusic(music?.url || MUSIC_DEFAULT, SFX_URL);
      if (import.meta.env.DEV) window.__introMusic = musicRef.current; // chỉ để kiểm tra khi phát triển
    }
    setPhase(p.still ? 'still' : 'gate');
  }, [phase, enabled, waitedOut]);

  // Tải lại: dưới phong bì, khung đã là THẺ ĐỎ TRỐNG đúng chỗ thẻ hero → phong bì mở ra thấy thẻ trống,
  // rồi lớp phủ rời đi và chữ thẻ thật hiện dần trên chính tấm thẻ đó — y như sau video
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

  // Làm nóng video chính ngay trong cú chạm (chạy câm rồi dừng, tua về JOIN): không thì lúc phong bì mở xong trình
  // duyệt mới khởi động bộ giải mã 1080p → đứng hình ~0,3 s.
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
  // Cú chạm mở phong bì (đồng bộ trong cử chỉ: nhạc + tiếng giấy phải gọi play() ngay)
  const onGateOpen = () => {
    if (p.pageReveal) { musicRef.current?.sfx(); return; } // tải lại: chỉ tiếng giấy, nhạc nền trang vào sau
    warmMain();
    const m = musicRef.current;
    if (!m) return;
    m.sfx();
    m.play(music?.start || 0, GATE_LEAD_S + p.dur - p.join).then((ok) => { musicOn.current = ok; });
  };
  // Vạt đã mở hết. Lần đầu: video chạy dưới phong bì đang mờ. Tải lại khổ dọc: rời lớp phủ sau một nhịp;
  // tải lại khổ ngang: chờ phong bì tan (onGateDone) rồi thẻ đỏ giãn ra.
  const onGateCut = () => {
    if (p.pageReveal && wide) { setRevealCut(true); return; }
    if (p.pageReveal) { setTimeout(leave, 200); return; }
    setPhase((ph) => (ph === 'gate' ? 'play' : ph));
  };
  const onGateDone = () => {
    setGateGone(true);
    if (!wide) return;
    if (p.pageReveal) {
      setFrameMode('widened');
      setTimeout(leave, WIDEN_MS + 250);
      return;
    }
    if (cardRef.current) return;
    // Máy tính (chủ thiệp 25/11): video chạy đúng trong thẻ Hero đỏ, như bản điện thoại dọc — khung 3:2 của phong bì
    // giãn ra cả thẻ (cùng nhịp .widen), không nở ra khung 16:9 rồi thu về (thẻ đỏ, khung video, thẻ trang lệch cỡ nhau).
    // Điện thoại xoay ngang giữ khung video lớn (thẻ ngang thấp, video sẽ quá nhỏ).
    // Máy gập / tablet xoay ngang (cao ≥ 521px, chủ thiệp 25/11 thử iPhone Duo mở): thẻ đủ lớn → cũng chiếu trong thẻ.
    if (p.kind === 'desktop' || (p.kind === 'landscape' && window.innerHeight >= 521)) {
      setFrameMode('widened');
      return;
    }
    frameModeRef.current = 'video';
    setFrameMode('video');
    setBox(frameBox(p.kind));
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

  // Lớp phủ bắt đầu mờ: nhạc lắng xuống. Xong hẳn: báo Nav phát nhạc nền.
  useEffect(() => {
    if (phase === 'out') {
      musicRef.current?.fadeOut();
      window.dispatchEvent(new Event('hm-intro-leave')); // App: trang "vào" ngay lúc này
    }
    if (phase !== 'done' || !p) return undefined;
    const m = musicRef.current;
    const shown = mode.current !== 'none'; // intro đã thực sự chiếu (không phải bị tắt ở admin)
    const t = setTimeout(() => {
      m?.destroy();
      delete document.documentElement.dataset.intro;
      window.dispatchEvent(new CustomEvent('hm-intro-end', { detail: { soft: shown } })); // soft: nhạc nền to dần
    }, shown ? Math.max(0, (musicOn.current ? MUSIC_FADE_S * 1000 : 0) - FADE_MS) + MUSIC_GAP_MS : 0);
    return () => clearTimeout(t);
  }, [phase]);

  // Khoá cuộn khi lớp phủ còn hiện (lib/scrollLock). Không đụng overflow của html — xem CLAUDE.md.
  const showing = phase !== 'done';
  useEffect(() => {
    if (!showing) return undefined;
    lockScroll({ toTop: true });
    return unlockScroll;
  }, [showing]);

  // Chạm / bấm / phím (không chặn lan truyền — Nav cần cử chỉ này để mở khoá nhạc nền iOS):
  // - nhạc đang bị chặn: hiện "Chạm để bật nhạc", lần chạm đó BẬT NHẠC (touchend / click / keydown — iOS không
  //   tính pointerup là cử chỉ cho phép phát);
  // - còn lại: chạm / lăn chuột / phím → bỏ qua. Nút "Bỏ qua" và Esc luôn bỏ qua. Lúc phong bì: chỉ Esc.
  useEffect(() => {
    if (phase === 'done' || phase === 'out') return undefined;
    if (phase === 'gate') {
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

  // Phát video chính; không chạy được trong START_GRACE_MS → ảnh thẻ
  useEffect(() => {
    if (phase !== 'play') return undefined;
    const v = mainRef.current;
    if (!v) return undefined;
    v.muted = true;
    const pr = v.play();
    if (pr && pr.catch) pr.catch((err) => { if (DEBUG) window.__introErr = `play: ${err?.name} ${err?.message || ''}`; if (!started.current) setPhase('still'); });
    const t = setTimeout(() => { if (!started.current) setPhase('still'); }, START_GRACE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  // Giữ nhạc khớp video: iPhone khởi động âm thanh chậm (~0,8 s) → mỗi giây so một lần, lệch > 0,3 s thì tua nhạc
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

  // Quay lại trang (chuyển tab / ứng dụng): Safari có thể đã tự dừng video câm và không tự chạy lại
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

  // Hết video chính: trang sẵn sàng thì vào, chưa thì chuyển sang vòng lặp (liền khung)
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

  // Ảnh tĩnh: giữ thẻ một nhịp (chờ trang tối đa LOOP_CAP_MS) rồi vào
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

  if (phase === 'gate' || phase === 'play' || phase === 'loop') mode.current = 'video';
  else if (phase === 'still') mode.current = 'still';
  if (phase === 'still' && !card) setTimeout(toCard, 0);
  const still = mode.current === 'still';
  const inCard = p.gate && frameMode !== 'video';
  const fbox = wide && inCard && frameMode === 'card' ? fit32(box) : box;
  const hidden = mode.current === 'none' || !box || (phase === 'gate' && !revealCut);
  // Vạch tiến trình (review 25/11, chủ thiệp: nhỏ, gọn): giữa, ngay dưới khung video; khung cao hết màn (điện thoại
  // ngang) thì nằm trong mép dưới khung. Cùng kiểu vạch "01 / 15" của thẻ hero.
  const progPlace = fbox ? {
    left: Math.round(fbox.x + fbox.w / 2),
    top: Math.round(window.innerHeight - (fbox.y + fbox.h) >= 34 ? fbox.y + fbox.h + 16 : fbox.y + fbox.h - 18),
  } : null;
  return (
    <div
      className={`intro-video intro-${p.kind} ${phase === 'out' ? 'out' : ''} ${morph ? 'settle' : ''} ${p.pageReveal ? 'page-reveal' : ''} ${p.pageReveal && !card ? 'no-card' : ''}`}
      style={{ '--intro-fade': `${FADE_MS}ms`, '--intro-settle': `${SETTLE_DELAY_MS}ms` }}
      onTouchMove={(e) => e.preventDefault()}
      aria-hidden={phase === 'gate' ? undefined : 'true'}
    >
      <div
        className={`intro-frame ${hidden ? 'empty' : ''} ${inCard ? 'in-card' : ''} ${card ? 'card' : ''} ${frameMode === 'widened' ? 'widen' : ''}`}
        style={{
          ...(fbox ? { left: fbox.x, top: fbox.y, width: fbox.w, height: fbox.h } : null),
          ...(inCard && box ? { '--card-inset': `${box.inset}px` } : null),
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
                if (warming.current) return; // đang làm nóng lúc mở phong bì — chưa phải video chạy thật
                const v = e.currentTarget;
                setVidOn(true);
                started.current = true;
                const m = musicRef.current;
                if (musicOn.current && m) {
                  // lần chạy đầu: đo độ lệch nhạc − video (nhạc đã chạy từ lúc chạm phong bì)
                  if (offsetRef.current == null) offsetRef.current = m.el.currentTime - v.currentTime;
                  m.follow(offsetRef.current + v.currentTime);
                } else startMusic();
              }}
              // 'pause' cũng bắn khi video hết — lúc đó nhạc chạy tiếp (lắng xuống ở bước mờ)
              onPause={(e) => { if (started.current && !e.currentTarget.ended && !cardRef.current) musicRef.current?.hold(); }}
              onWaiting={() => { if (started.current) musicRef.current?.hold(); }}
              onEnded={onMainEnded}
              onError={() => { if (DEBUG) window.__introErr = `video error ${mainRef.current?.error?.code}`; if (!started.current) setPhase('still'); else leave(); }}
            />
            {/* Ảnh chờ thật: Safari iPhone không hiện poster sau khi đã gọi play/tua */}
            {!vidOn && phase !== 'loop' && <img className="intro-media" src={p.poster} alt="" decoding="async" />}
          </>
        )}
      </div>
      {DEBUG && <IntroDebug phase={phase} needTap={needTap} musicRef={musicRef} mainRef={mainRef} />}
      {p.gate && !gateGone && phase !== 'wait' && (
        <IntroGate rect={wide ? fit32(box) : box} reveal={p.pageReveal} wide={wide} onOpen={onGateOpen} onCut={onGateCut} onDone={onGateDone} />
      )}
      {/* Khung bắt đầu thành thẻ thì cất nút: không lọt vào ảnh chụp của chuyển cảnh, đè thanh tiêu đề */}
      {(phase === 'play' || phase === 'loop') && gateGone && !card && (
        <>
          {needTap && <div className="intro-hint">♪ Chạm để bật nhạc</div>}
          <button type="button" className="intro-skip" onClick={leave}>Bỏ qua</button>
          {!p.pageReveal && progPlace && (
            <span className="intro-prog" style={progPlace} aria-hidden="true"><i ref={progRef} className={phase === 'loop' ? 'full' : ''} /></span>
          )}
        </>
      )}
    </div>
  );
}
