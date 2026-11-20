import { useEffect, useRef, useState } from 'react';

/**
 * Cổng mở thiệp (11/2026, kịch bản chủ thiệp duyệt) — màn đầu của IntroVideo.
 *
 * Thiệp đỏ hoa nổi nét vàng (vẽ lại từ ảnh hoa văn chủ thiệp gửi — wedding-video/card-gate:
 * build_vector_card.py / build_wide_card.py), dải sóng, ô 囍 nguyên khối GẮN CÁNH PHẢI.
 * Khách chạm → nhạc vào (cú chạm trình duyệt cần để cho phát tiếng) → hai cánh trượt ra hai bên
 * → lộ cảnh đầu của video. TẤM THIỆP CHÍNH LÀ KHUNG VIDEO: IntroVideo đặt khung đúng bằng lòng thiệp
 * (gateBox), nên từ lúc chạm tới lúc video chạy không có gì đổi cỡ (chủ thiệp: "đổi size liên tục" là hỏng).
 * Không loé sáng, không vệt sáng, không chữ (chủ thiệp bỏ).
 *
 * Chuyển động hai cánh là MỘT đường cong (easeInOutQuad) đi DIST px trong T giây. Đoạn đầu (tới
 * tư thế M) là clip Kling 3 Pro, chọn lại khung theo đúng đường cong (60 khung/giây —
 * card-gate/retime). Hết clip, code đi tiếp đúng đường cong đó → không khựng.
 * Khung đầu/cuối của clip = tư thế A/M của CHÍNH component này (?gaterender=A|M&gatekind=…,
 * chỉ khi phát triển — card-gate/render-site-keys.cjs). Đổi số nào ở đây / CSS ig-* là phải làm lại clip.
 *
 * Hai "thế giới" cố định: dọc 1080×1920 (thiệp cao 936×1800, tỉ lệ 0,52) và ngang 1920×1080 (thiệp ngang riêng
 * 1800×990 lấp gần kín màn — "bản ngang đặc biệt" của chủ thiệp).
 */

const A = '/assets/intro/gate/';
const GV = '?v=20261121h';
export const WORLDS = {
  portrait: {
    // thiệp dọc CAO (chủ thiệp: "cho cổng to dọc ra") — tỉ lệ ≈ màn điện thoại dài (card-gate/build_tall_card.py)
    W: 1080, H: 1920, card: { x: 72, y: 60, w: 936, h: 1800 }, dl: 463.5,
    doors: ['door-p-l.webp', 'door-p-r.webp'], inner: 'inner-p.jpg',
    tag: { x: -218.2, y: 665.4, w: 422.0, h: 417.5 }, // so với mép trái cánh phải
    clip: 'doors-portrait.mp4', M: 220, DIST: 760, T: 1.5, handoff: 0.5707,
  },
  wide: {
    W: 1920, H: 1080, card: { x: 60, y: 45, w: 1800, h: 990 }, dl: 900,
    doors: ['door-w-l.webp', 'door-w-r.webp'], inner: 'inner-w.jpg',
    tag: { x: -165, y: 331.7, w: 330, h: 326.6 },
    clip: 'doors-wide.mp4', M: 300, DIST: 1100, T: 1.5, handoff: 0.5539,
  },
};
const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - ((-2 * x + 2) ** 2) / 2); // easeInOutQuad — khớp clip
// Chạm → hai cánh đi hết (video chạy). Cả hai thế giới cùng T. IntroVideo dùng để canh nhạc.
export const GATE_LEAD_S = WORLDS.portrait.T;
const CLIP_FADE_S = 0.15; // clip mờ dần vào hình code (đã chạy song song bên dưới) trước lúc hết clip

// Giãn lệch một chiều tối đa chừng này để thiệp sát viền mọi máy (tỉ lệ màn khác nhau: Safari iPhone
// ~0,56, Android/Zalo ~0,49). Cánh, ô 囍 và clip giãn cùng nhau nên không lệch; 6% mắt không nhận ra.
const STRETCH = 1.06;
function fitWorld(w, kind) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const c = w.card;
  const aw = vw - (kind === 'portrait' ? 16 : 24);
  const ah = vh - 16;
  const s = Math.min(aw / c.w, ah / c.h, 1);
  const sx = Math.min(aw / c.w, s * STRETCH);
  const sy = Math.min(ah / c.h, s * STRETCH);
  return { sx, sy, x: vw / 2 - (c.x + c.w / 2) * sx, y: vh / 2 - (c.y + c.h / 2) * sy };
}

/** Lòng thiệp trên màn (px CSS) = khung video của IntroVideo khi có cổng. */
export function gateBox(kind) {
  const w = WORLDS[kind];
  const f = fitWorld(w, kind);
  const c = w.card;
  return { x: f.x + c.x * f.sx, y: f.y + c.y * f.sy, w: c.w * f.sx, h: c.h * f.sy };
}

/**
 * @param world   'portrait' | 'wide'
 * @param poster  ảnh khung đầu của bản video sẽ chiếu (hiện dần trong lòng thiệp lúc hai cánh đi nốt)
 * @param onOpen  gọi NGAY trong cú chạm (đồng bộ) — phát nhạc + tiếng cánh cửa
 * @param onDone  hai cánh đã đi hết → IntroVideo hiện khung (đúng chỗ lòng thiệp) và chiếu video
 * @param pose    chỉ để xuất khung then chốt: 'A' | 'M'
 */
export default function IntroGate({ world: kind, poster, onOpen, onDone, pose }) {
  const w = WORLDS[kind];
  // Clip Kling chỉ khớp khi video bắt đầu đúng cảnh của clip (poster-join, lần đầu). Lần sau (bản rút
  // gọn, cảnh đầu khác) code trượt trọn đường cong, lòng thiệp là cảnh của bản đó ngay từ đầu —
  // không có lúc hai hình chồng nhau (chủ thiệp: "phần ngắn bị lỗi, không mượt").
  const useClip = !pose && (!poster || /poster-join/.test(poster));
  const innerSrc = useClip || pose ? `${A}${w.inner}${GV}` : poster;
  const [fit, setFit] = useState(() => fitWorld(w, kind));
  const [step, setStep] = useState('idle'); // idle → vid (clip) → code (đi nốt đường cong)
  const [loaded, setLoaded] = useState(0);
  const [clipReady, setClipReady] = useState(false);
  const ready = !!pose || (loaded >= 4 && clipReady);
  const dlRef = useRef(null);
  const drRef = useRef(null);
  const clipRef = useRef(null);
  const timers = useRef([]);
  const raf = useRef(0);
  const handed = useRef(false);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));
  useEffect(() => () => { timers.current.forEach(clearTimeout); cancelAnimationFrame(raf.current); }, []);

  useEffect(() => {
    const on = () => setFit(fitWorld(w, kind));
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, [kind]);

  // decode() xong mới tính (onLoad bắn trước khi ảnh giải mã → thiệp hiện ra mà một cánh còn trống)
  const onImg = (e) => {
    const done = () => setLoaded((n) => n + 1);
    const img = e?.currentTarget;
    if (e?.type === 'load' && img?.decode) img.decode().then(done, done); else done();
  };
  // Clip chưa tải đủ thì chưa cho chạm (không thì clip khựng lúc đầu); quá 4 s vẫn cho (code tự trượt)
  useEffect(() => {
    if (pose) return undefined;
    const v = clipRef.current;
    if (!useClip || !v) { setClipReady(true); return undefined; }
    const ok = () => setClipReady(true);
    if (v.readyState >= 4) ok();
    v.addEventListener('canplaythrough', ok);
    v.addEventListener('error', ok);
    const t = setTimeout(ok, 4000);
    return () => { v.removeEventListener('canplaythrough', ok); v.removeEventListener('error', ok); clearTimeout(t); };
  }, []);

  const setDoors = (off) => {
    if (dlRef.current) dlRef.current.style.transform = `translate3d(${-off}px,0,0)`;
    if (drRef.current) drRef.current.style.transform = `translate3d(${off}px,0,0)`;
  };

  /**
   * Chạy đường cong từ mốc t0 (performance.now() ứng với giây 0 của đường cong). Code đẩy hai cánh
   * NGAY TỪ ĐẦU, nằm dưới clip và đúng đồng hồ của clip; clip mờ dần trong CLIP_FADE_S cuối (trước
   * handoff) → chỗ nối là một lần chuyển mềm giữa hai hình cùng vị trí, không phải nhát cắt
   * (chủ thiệp: bản máy tính "vẫn có độ khựng"). Hết T thì giao cho khung video của IntroVideo.
   */
  const run = (t0) => {
    if (handed.current) return;
    handed.current = true;
    const v = clipRef.current;
    const tick = (now) => {
      const t = Math.min(Math.max((now - t0) / 1000, 0), w.T);
      setDoors(w.DIST * ease(t / w.T));
      if (v) v.style.opacity = String(Math.min(1, Math.max(0, (w.handoff - t) / CLIP_FADE_S)));
      if (t < w.T) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    later(() => onDone?.(), Math.max(0, t0 + w.T * 1000 - performance.now()) + 30);
  };
  const codeOnly = () => { setStep('code'); run(performance.now()); };

  const open = () => {
    if (step !== 'idle' || !ready) return;
    onOpen?.(); // đồng bộ, trong cú chạm
    const v = useClip ? clipRef.current : null;
    if (!v) { codeOnly(); return; }
    let shown = false;
    // khung đầu của clip lên màn → đặt đồng hồ đường cong theo đúng lúc khung đó hiện
    const show = (now, meta) => {
      if (shown) return;
      shown = true;
      setStep('vid');
      const at = meta?.expectedDisplayTime && meta.mediaTime != null ? meta.expectedDisplayTime - meta.mediaTime * 1000 : performance.now();
      run(at);
    };
    if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(show);
    else v.addEventListener('playing', () => show(performance.now()), { once: true });
    v.play().catch(() => { if (!shown) codeOnly(); }); // không phát được clip → code đi cả đường cong
  };

  const c = w.card;
  const vars = {
    '--gw': `${w.W}px`, '--gh': `${w.H}px`,
    '--cx': `${c.x}px`, '--cy': `${c.y}px`, '--cw': `${c.w}px`, '--ch': `${c.h}px`,
    '--dl': `${w.dl}px`, '--dr': `${c.w - w.dl}px`,
    '--tx': `${w.tag.x}px`, '--ty': `${w.tag.y}px`, '--tw': `${w.tag.w}px`, '--th': `${w.tag.h}px`,
    '--fit': pose ? 'none' : `translate(${fit.x}px, ${fit.y}px) scale(${fit.sx}, ${fit.sy})`,
  };
  const cardBox = { x: fit.x + c.x * fit.sx, y: fit.y + c.y * fit.sy, w: c.w * fit.sx, h: c.h * fit.sy };
  const poseOff = pose === 'M' ? w.M : 0;
  // Lời mời: đè lên phần trơn cuối thiệp (thiệp lấp gần kín màn)
  const ctaStyle = { top: cardBox.y + cardBox.h * (kind === 'portrait' ? 0.84 : 0.8), transform: 'translate(-50%, -50%)' };
  return (
    <div
      className={`intro-gate ig-${kind} step-${step} ${step !== 'idle' || pose === 'M' ? 'moving' : ''} ${ready ? 'ready' : ''} ${pose ? 'ig-render' : ''}`}
      style={vars}
      role="button"
      tabIndex={0}
      aria-label="Chạm để mở thiệp"
      onClick={open}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}
    >
      {/* Hai lớp cùng một phép thu phóng: sau (nền, lòng thiệp) và trước (hai cánh, clip) —
          lòng thiệp nở (ig-reveal) nằm GIỮA, để hai cánh vẫn trượt đè lên khung đang nở */}
      <div className="ig-world back">
        <div className="ig-bg" />
        {/* Lòng thiệp = cảnh đầu video, ĐÚNG ảnh đã dùng khi xuất khung A/M cho clip Kling */}
        <div className="ig-inner">
          <img src={innerSrc} alt="" decoding="async" onLoad={onImg} onError={onImg} />
        </div>
        <div className="ig-shadow" />
      </div>
      {/* Viền vàng của khung video hiện dần đúng quanh lòng thiệp (px màn hình, như .intro-frame) */}
      {!pose && <div className="ig-edge" style={{ left: cardBox.x, top: cardBox.y, width: cardBox.w, height: cardBox.h }} />}
      <div className="ig-world front">
        <div className="ig-door l" ref={dlRef} style={poseOff ? { transform: `translate3d(${-poseOff}px,0,0)` } : undefined}>
          <img src={`${A}${w.doors[0]}${GV}`} alt="" decoding="async" onLoad={onImg} onError={onImg} />
        </div>
        <div className="ig-door r" ref={drRef} style={poseOff ? { transform: `translate3d(${poseOff}px,0,0)` } : undefined}>
          <img src={`${A}${w.doors[1]}${GV}`} alt="" decoding="async" onLoad={onImg} onError={onImg} />
          <div className="ig-tag"><img src={`${A}tag.webp${GV}`} alt="" decoding="async" onLoad={onImg} onError={onImg} /></div>
        </div>
        {useClip && (
          <video
            className="ig-clip"
            ref={clipRef}
            src={`${A}${w.clip}${GV}`}
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
            onEnded={() => setStep('code')}
            onError={() => { if (step === 'vid') setStep('code'); }}
          />
        )}
      </div>
      {!pose && (
        <div className="ig-cta" style={ctaStyle}>
          <span>Chạm để mở thiệp</span>
          <small>Trân trọng kính mời</small>
        </div>
      )}
    </div>
  );
}
