import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { mqMatches } from '../hooks/useViewport';
import Ico from './Icon';

/**
 * Bong bóng nhạc nổi (2026-11-17), chỉ bố cục điện thoại. File production MỚI.
 * Thay viên "đĩa than + ▾" trên nav. Giống bong bóng chat trên Android:
 *  · Kéo đi khắp màn; thả ra thì dạt về mép trái/phải gần nhất, GIỮ ĐÀ hất của ngón tay.
 *    Vị trí nhớ trong localStorage.
 *  · Kéo xuống vòng × ở đáy màn → tắt nhạc + ẩn bong bóng. Bật lại trong menu ☰.
 *  · Chạm → bong bóng lên góc trên, bảng nhạc "đĩa than" (giữ nguyên thiết kế) mọc ra TỪ
 *    bong bóng đang bay; thu lại thì co về đúng chỗ bong bóng. Chạm nền tối / bong bóng / Esc.
 *  · Đang cuộn trang → nép nửa vào mép; đang gõ form → lánh hẳn ra ngoài.
 *
 * Chuyển động (bản 2 — mượt 60fps):
 *  · Vị trí bong bóng chạy bằng LÒ XO vật lý (rAF, ghi thẳng style.transform, không qua
 *    React): kéo, thả, hất, hút vào ×, lên/xuống góc đều liền mạch, đổi hướng giữa chừng
 *    không giật. React chỉ dựng lại khi trạng thái rời rạc đổi (bắt đầu kéo, chạm ×…).
 *  · Bảng nhạc mở/đóng bằng Web Animations (transform + opacity → chạy trên GPU, không
 *    phụ thuộc luồng chính), easing lò xo CÙNG thông số với bong bóng nên hai thứ đi khớp.
 *  · Bảng được dựng sẵn lúc rảnh (ẩn), lần mở đầu không phải chờ React dựng → không rớt khung.
 * Mọi trạng thái nhạc nằm ở Nav.jsx; bong bóng chỉ là vỏ. Gắn bằng createPortal vào body
 * (nav có backdrop-filter → phần tử fixed bên trong bị neo theo nav, không theo màn).
 */
const BUB_KEY = 'hm-music-bubble';
const BUB_M = 10;   // lề bong bóng với mép màn
const BIN_R = 32;   // bán kính vòng ×
const BIN_B = 44;   // vòng × cách đáy màn
// Lò xo: k độ cứng, z tỉ số tắt dần (1 = vừa đủ không vọt; 0.78 = vọt ~2% rồi đứng)
const SPRING_MOVE = { k: 420, z: 0.78 };
const SPRING_DRAG = { k: 1500, z: 1 };   // bám ngón tay (trễ ~25ms) + hút vào ×
// Cùng lò xo SPRING_MOVE, lấy mẫu thành easing cho Web Animations (460ms)
const POP_MS = 460;
const EASE_SPRING_LIN = 'linear(0, 0.0245, 0.0867, 0.1719, 0.2693, 0.3705, 0.4697, 0.5629, 0.6476, 0.7226, 0.7874, 0.842, 0.8872, 0.9237, 0.9525, 0.9746, 0.9911, 1.0029, 1.011, 1.0161, 1.0188, 1.0199, 1.0197, 1.0186, 1.017, 1.0152, 1.0132, 1.0112, 1.0093, 1.0075, 1.006, 1.0046, 1.0035, 1.0025, 1.0017, 1.0011, 1.0006, 1.0003, 1, 0.9998, 1)';
const EASE_SPRING = (typeof CSS !== 'undefined' && CSS.supports && CSS.supports('animation-timing-function', 'linear(0, 1)'))
  ? EASE_SPRING_LIN
  : 'cubic-bezier(0.2, 0.9, 0.25, 1)'; // iOS < 17.2

function readBubblePos() {
  try {
    const v = JSON.parse(localStorage.getItem(BUB_KEY) || 'null');
    if (v && (v.side === 'l' || v.side === 'r') && Number.isFinite(v.ry)) {
      return { side: v.side, ry: Math.min(0.95, Math.max(0, v.ry)) };
    }
  } catch { /* chế độ riêng tư */ }
  return { side: 'r', ry: 0.7 };
}

function measureBubble() {
  // Webview trong Zalo / Messenger (và iframe ẩn) có thể báo 0 ở lượt dựng đầu
  const de = document.documentElement;
  const w = window.innerWidth || de.clientWidth || 390;
  const h = window.innerHeight || de.clientHeight || 844;
  const land = w > h;
  const nav = document.querySelector('.nav')?.offsetHeight || (land ? 58 : 66);
  return { w, h, land, nav, s: land ? 52 : 60 };
}

/** Lò xo 2 chiều ghi thẳng transform của một phần tử. Bước Euler nửa ẩn, chia nhỏ 4ms. */
function makeSpring(getEl) {
  const st = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, k: SPRING_MOVE.k, z: SPRING_MOVE.z, raf: 0, last: 0 };
  const write = () => {
    const el = getEl();
    if (el) el.style.transform = `translate3d(${st.x.toFixed(2)}px, ${st.y.toFixed(2)}px, 0)`;
  };
  const step = (now) => {
    const dt = Math.min(0.034, Math.max(0.001, (now - st.last) / 1000));
    st.last = now;
    const n = Math.ceil(dt / 0.004);
    const h = dt / n;
    const c = 2 * st.z * Math.sqrt(st.k);
    for (let i = 0; i < n; i += 1) {
      st.vx += (-st.k * (st.x - st.tx) - c * st.vx) * h;
      st.vy += (-st.k * (st.y - st.ty) - c * st.vy) * h;
      st.x += st.vx * h;
      st.y += st.vy * h;
    }
    if (Math.abs(st.x - st.tx) < 0.25 && Math.abs(st.y - st.ty) < 0.25 && Math.hypot(st.vx, st.vy) < 6) {
      st.x = st.tx; st.y = st.ty; st.vx = 0; st.vy = 0;
      write();
      st.raf = 0;
      return;
    }
    write();
    st.raf = requestAnimationFrame(step);
  };
  return {
    st,
    to(tx, ty, cfg, v) {
      st.tx = tx; st.ty = ty;
      if (cfg) { st.k = cfg.k; st.z = cfg.z; }
      if (v) { st.vx = v.x; st.vy = v.y; }
      if (!st.raf) { st.last = performance.now(); st.raf = requestAnimationFrame(step); }
    },
    set(x, y) {
      if (st.raf) cancelAnimationFrame(st.raf);
      st.raf = 0;
      st.x = st.tx = x; st.y = st.ty = y; st.vx = 0; st.vy = 0;
      write();
    },
    stop() { if (st.raf) cancelAnimationFrame(st.raf); st.raf = 0; },
  };
}

export default function MusicBubble({ open, playing, progress, blocked, onToggle, onClose, onDismiss, children }) {
  const [vp, setVp] = useState(measureBubble);
  const [pos, setPos] = useState(readBubblePos);
  const [dragging, setDragging] = useState(false);
  const [hot, setHot] = useState(false);        // đang nằm trên vòng ×
  const [tucked, setTucked] = useState(false);
  const [away, setAway] = useState(false);
  const [entered, setEntered] = useState(false);
  const [bye, setBye] = useState(false);
  const [popReady, setPopReady] = useState(open); // bảng đã dựng (ẩn) chưa
  const [popOn, setPopOn] = useState(false);      // bảng đang hiện / đang chạy hiệu ứng
  const elRef = useRef(null);
  const popRef = useRef(null);
  const anims = useRef([]);
  const drag = useRef(null);
  const skipClick = useRef(false);
  const spring = useRef(null);
  if (!spring.current) spring.current = makeSpring(() => elRef.current);
  const reduce = mqMatches('(prefers-reduced-motion: reduce)');

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 700);
    const remeasure = () => setVp((p) => {
      const n = measureBubble();
      return n.w === p.w && n.h === p.h && n.nav === p.nav && n.s === p.s ? p : n;
    });
    remeasure();
    const t2 = setTimeout(remeasure, 300);
    const onOrient = () => setTimeout(remeasure, 250);
    const vv = window.visualViewport;
    window.addEventListener('resize', remeasure);
    window.addEventListener('orientationchange', onOrient);
    if (vv) vv.addEventListener('resize', remeasure);
    // Dựng sẵn bảng nhạc lúc trình duyệt rảnh → lần chạm đầu mở ngay, không rớt khung
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(() => setPopReady(true), { timeout: 2500 })
      : setTimeout(() => setPopReady(true), 1500);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
      window.removeEventListener('resize', remeasure);
      window.removeEventListener('orientationchange', onOrient);
      if (vv) vv.removeEventListener('resize', remeasure);
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle); else clearTimeout(idle);
      spring.current.stop();
    };
  }, []);

  // Cuộn → nép vào mép; dừng 0,65 giây → ra lại
  useEffect(() => {
    let t = 0;
    const onScroll = () => {
      if (drag.current) return;
      setTucked(true);
      clearTimeout(t);
      t = setTimeout(() => setTucked(false), 650);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); clearTimeout(t); };
  }, []);

  // Gõ form (RSVP) → lánh ra ngoài, khỏi che ô nhập và bàn phím
  useEffect(() => {
    const isField = (el) => !!el && !!el.matches && el.matches('input, textarea, select');
    const onIn = (e) => { if (isField(e.target)) setAway(true); };
    const onOut = () => setTimeout(() => setAway(isField(document.activeElement)), 0);
    document.addEventListener('focusin', onIn);
    document.addEventListener('focusout', onOut);
    return () => { document.removeEventListener('focusin', onIn); document.removeEventListener('focusout', onOut); };
  }, []);

  const { w, h, s, nav, land } = vp;
  const right = pos.side === 'r';
  const minY = nav + 12;
  const maxY = Math.max(minY, h - s - 20);
  const restY = Math.min(maxY, Math.max(minY, pos.ry * h));
  const restX = right ? w - s - BUB_M : BUB_M;
  const topY = nav + 10;
  const binX = w / 2;
  const binY = h - BIN_B - BIN_R;

  // Đích của lò xo. Xoay máy / đổi cỡ → đặt thẳng, không bay ngang màn.
  const vpRef = useRef(null); // null → lần đầu đặt thẳng vị trí, không bay từ góc 0,0
  useLayoutEffect(() => {
    if (drag.current?.moved || bye) return;
    const ty = open ? topY : restY;
    if (vpRef.current !== vp || reduce) { vpRef.current = vp; spring.current.set(restX, ty); return; }
    spring.current.to(restX, ty, SPRING_MOVE);
  }, [vp, open, restX, restY, topY, bye, reduce]);

  // Bảng nhạc
  const popTop = land ? topY : topY + s + 12;
  const popW = land ? Math.min(640, w - s - BUB_M * 2 - 24) : Math.min(360, w - 24);
  const popSideOff = land ? BUB_M + s + 12 : 12;
  const popLeft = right ? w - popSideOff - popW : popSideOff;
  const tailOff = BUB_M + s / 2 - 12; // tâm bong bóng tính từ mép bảng (dọc)
  // Gốc phóng = tâm bong bóng ở vị trí mở, tính trong toạ độ của bảng
  const ax = land ? (right ? popW + 12 + s / 2 : -(12 + s / 2)) : (right ? popW - tailOff : tailOff);
  const ay = land ? s / 2 : -(12 + s / 2);
  const popStyle = {
    top: popTop,
    left: popLeft,
    width: popW,
    '--pop-max': `${Math.max(160, h - popTop - 14)}px`,
    transformOrigin: `${ax}px ${ay}px`,
  };
  const tailStyle = land ? { top: s / 2 - 7 } : { [right ? 'right' : 'left']: tailOff - 7 };
  const tailCls = land ? (right ? 't-r' : 't-l') : 't-u';

  // Mở / đóng: bảng mọc ra từ bong bóng đang bay (cùng lò xo), co về đúng chỗ bong bóng nghỉ
  const firstRun = useRef(true);
  useEffect(() => {
    if (open && !popReady) { setPopReady(true); return undefined; }
    const el = popRef.current;
    if (!el) return undefined;
    if (firstRun.current) { firstRun.current = false; if (!open) return undefined; }
    // Từ đúng chỗ đang dừng nếu hiệu ứng trước còn chạy (bấm liên tiếp không giật)
    const cur = anims.current.length ? getComputedStyle(el) : null;
    const curT = cur && cur.transform !== 'none' ? cur.transform : null;
    const curO = cur ? cur.opacity : null;
    anims.current.forEach((an) => an.cancel());
    anims.current = [];
    // Tâm bong bóng lúc nghỉ, so với gốc phóng
    const dx = (restX + s / 2) - (popLeft + ax);
    const dy = (restY + s / 2) - (popTop + ay);
    const shut = `translate(${dx}px, ${dy}px) scale(0.1)`;
    if (!el.animate || reduce) { setPopOn(open); return undefined; }
    let live = true;
    if (open) {
      setPopOn(true);
      anims.current = [
        el.animate([{ transform: curT || shut }, { transform: 'none' }], { duration: POP_MS, easing: EASE_SPRING }),
        el.animate([{ opacity: curO ?? 0 }, { opacity: 1 }], { duration: 200, easing: 'ease-out' }),
      ];
    } else {
      const t = el.animate([{ transform: curT || 'none' }, { transform: shut }], { duration: POP_MS, easing: EASE_SPRING, fill: 'forwards' });
      const o = el.animate([{ opacity: curO ?? 1 }, { opacity: 0 }], { duration: 220, delay: 90, easing: 'ease-in', fill: 'forwards' });
      anims.current = [t, o];
      // Xong thì ẩn NGAY trên DOM (không chờ React) và GIỮ hai hiệu ứng ở khung cuối
      // (fill: forwards). Huỷ chúng lúc này thì có một khung bảng về trạng thái gốc
      // (hiện rõ, đủ cỡ) trước khi React kịp gỡ class → bảng loé lên một cái.
      // Lần mở sau sẽ huỷ chúng và đi tiếp từ đúng khung cuối.
      t.finished.then(() => {
        if (!live) return;
        el.classList.remove('on');
        setPopOn(false);
      }).catch(() => {});
    }
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', onKey);
    return () => { live = false; document.removeEventListener('keydown', onKey); };
  }, [open, popReady]);

  // ── Kéo ──
  const onPointerDown = (e) => {
    if (open || bye || (e.pointerType === 'mouse' && e.button !== 0)) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* con trỏ tổng hợp */ }
    const m = measureBubble();
    if (m.w !== w || m.h !== h) setVp(m);
    const st = spring.current.st;
    drag.current = {
      id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: st.x, oy: st.y, moved: false, near: false,
      gx: st.x, gy: st.y, samples: [[e.timeStamp, e.clientX, e.clientY]],
    };
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved) {
      if (Math.hypot(dx, dy) < 8) return; // dưới 8px vẫn là chạm
      d.moved = true;
      setDragging(true);
    }
    d.samples.push([e.timeStamp, e.clientX, e.clientY]);
    while (d.samples.length > 2 && e.timeStamp - d.samples[0][0] > 90) d.samples.shift();
    let gx = Math.min(w - s, Math.max(0, d.ox + dx));
    let gy = Math.min(h - s, Math.max(0, d.oy + dy));
    const near = Math.hypot(gx + s / 2 - binX, gy + s / 2 - binY) < 90;
    if (near) { gx = binX - s / 2; gy = binY - s / 2; } // hút vào vòng ×
    if (near !== d.near) {
      d.near = near;
      setHot(near);
      if (near && navigator.vibrate) navigator.vibrate(12);
    }
    d.gx = gx; d.gy = gy;
    spring.current.to(gx, gy, SPRING_DRAG);
  };
  const finish = (cancelled) => (e) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    skipClick.current = d.moved;
    if (!d.moved) return;
    setDragging(false);
    if (d.near && !cancelled) {
      setBye(true);
      setTimeout(onDismiss, 380);
      return;
    }
    setHot(false);
    // Vận tốc thả (px/giây) từ 90ms cuối — giữ đà hất
    const a0 = d.samples[0];
    const a1 = d.samples[d.samples.length - 1];
    const dt = Math.max(16, a1[0] - a0[0]) / 1000;
    const lim = (v) => Math.max(-4000, Math.min(4000, v));
    const vx = lim((a1[1] - a0[1]) / dt);
    const vy = lim((a1[2] - a0[2]) / dt);
    const side = d.gx + s / 2 + vx * 0.18 < w / 2 ? 'l' : 'r';
    const ny = Math.min(maxY, Math.max(minY, d.gy + vy * 0.12));
    const tx = side === 'r' ? w - s - BUB_M : BUB_M;
    spring.current.to(tx, ny, SPRING_MOVE, { x: vx, y: vy });
    const next = { side, ry: ny / h };
    setPos(next);
    try { localStorage.setItem(BUB_KEY, JSON.stringify(next)); } catch { /* chế độ riêng tư */ }
  };
  const onClick = () => {
    if (skipClick.current) { skipClick.current = false; return; }
    onToggle();
  };

  const showHint = entered && blocked && !playing && !dragging && !open && !away;
  const cls = [
    'mbub',
    entered && 'in',
    dragging && 'is-drag',
    hot && 'is-hot',
    tucked && !open && !dragging && 'is-tucked',
    away && !open && 'is-away',
    playing && 'is-playing',
    open && 'is-open',
    bye && 'is-bye',
  ].filter(Boolean).join(' ');

  return (
    <>
      <div className={`mbub-scrim ${open ? 'on' : ''}`} onClick={onClose} aria-hidden="true" />
      {popReady && (
        <div
          ref={popRef}
          className={`mbub-pop ${popOn ? 'on' : ''} ${open ? 'is-open' : ''}`}
          style={popStyle}
          role="dialog"
          aria-label="Trình phát nhạc nền"
          aria-hidden={!open}
        >
          <span className={`mbub-tail ${tailCls}`} style={tailStyle} aria-hidden="true" />
          {children}
        </div>
      )}
      <div className={`mbub-bin ${dragging ? 'on' : ''} ${hot ? 'hot' : ''}`} aria-hidden="true">
        <span className="mbub-bin-ring">×</span>
        <span className="mbub-bin-txt">Thả vào đây để tắt nhạc</span>
      </div>
      <div ref={elRef} className={cls} data-side={pos.side} style={{ '--s': `${s}px` }}>
        <button
          type="button"
          className="mbub-btn"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={finish(false)}
          onPointerCancel={finish(true)}
          onClick={onClick}
          onContextMenu={(e) => e.preventDefault()}
          aria-label={open ? 'Thu gọn trình phát nhạc' : 'Mở trình phát nhạc'}
          aria-expanded={open}
        >
          <svg className="mbub-ring" viewBox="0 0 100 100" aria-hidden="true">
            <circle className="bg" cx="50" cy="50" r="46.5" />
            <circle className="fg" cx="50" cy="50" r="46.5" pathLength="100" style={{ strokeDasharray: `${progress} 100` }} />
          </svg>
          <span className="mbub-disc" aria-hidden="true"><img src="/assets/medallion-gold.png" alt="" draggable="false" /></span>
          <span className="mbub-badge" aria-hidden="true"><Ico name="play" /></span>
        </button>
        <span className={`mbub-hint ${showHint ? 'on' : ''}`} aria-hidden="true">Chạm vào màn hình để nghe nhạc</span>
      </div>
    </>
  );
}
