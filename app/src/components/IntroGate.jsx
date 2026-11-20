import { useEffect, useRef, useState } from 'react';

/**
 * Phong bì mở thiệp (11/2026, chủ thiệp chọn "A · gần video mẫu") — màn đầu của IntroVideo, khổ dọc.
 *
 * Phong bì giấy đỏ rượu vang kín màn, hai vạt viền ren lượn sóng có hàng lỗ đục, hoa nổi chìm, ở giữa là
 * dấu sáp vàng dập logo HM (medallion-gold.png). Phong cách châu Âu theo video mẫu chủ thiệp gửi.
 * Ảnh tĩnh: Nano Banana Pro; clip mở: Kling 3 Pro từ khung đó (wedding-video/envelope/).
 *
 * Khách chạm → nhạc + tiếng giấy/sáp vào ngay (cú chạm trình duyệt cần để cho phát tiếng) → clip mở. Lòng
 * phong bì TRONG SUỐT (chỉ giữ vạt đỏ + dấu sáp): bên dưới là lớp phủ của IntroVideo — lần đầu là khung video
 * viền vàng (như main, đang hiện ảnh chờ của video), lần tải lại là thẻ đỏ trống đúng chỗ thẻ hero. Tới
 * GATE_CUT_S IntroVideo chạy video / rời lớp phủ, clip mờ dần trong GATE_FADE_MS → chỉ có các vạt tan đi.
 *
 * Ảnh chờ = chính khung đầu của clip (cùng nguồn, clip gắn nhãn màu BT.709/sRGB) → lúc chạm không nháy.
 */

const A = '/assets/intro/envelope/';
const GV = '?v=20261121m';
// Clip Kling 3 Pro khoá khung đầu (phong bì đóng) + khung cuối (bốn vạt nằm hẳn ra mép), giữ NGUYÊN tốc độ
// và 24 khung/giây gốc, độ phân giải gốc (chủ thiệp: không bỏ khung, không hạ chất lượng) — chỉ cắt 0,58 s
// đứng yên đầu (envelope/clips/open-fast1.json). Mở hết ~3,8 s → GIỮ YÊN 0,4 s → mới tan (GATE_FADE_MS).
export const GATE_CUT_S = 4.23;
export const GATE_FADE_MS = 650;
export const GATE_LEAD_S = GATE_CUT_S; // chạm → video chạy (IntroVideo canh nhạc)


/**
 * @param onOpen  gọi NGAY trong cú chạm (đồng bộ) — nhạc + tiếng giấy/sáp, làm nóng video
 * @param onCut   tới GATE_CUT_S: IntroVideo hiện khung (dưới phong bì) và chạy video
 * @param onDone  clip đã mờ hết: gỡ phong bì
 */
// iPhone / iPad / Safari: HEVC có kênh trong suốt; trình duyệt khác: WebM VP9 có kênh trong suốt
const APPLE = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent)
  || (/Safari/.test(navigator.userAgent) && !/Chrome|Chromium|CriOS|Edg|OPR|Android/.test(navigator.userAgent)));

export default function IntroGate({ onOpen, onCut, onDone }) {
  const [step, setStep] = useState('idle'); // idle → vid → fade
  const [imgReady, setImgReady] = useState(false);
  const [clipReady, setClipReady] = useState(false);
  const ready = imgReady && clipReady;
  const clipRef = useRef(null);
  const timers = useRef([]);
  const raf = useRef(0);
  const cut = useRef(false);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));
  useEffect(() => () => { timers.current.forEach(clearTimeout); cancelAnimationFrame(raf.current); }, []);

  // decode() xong mới hiện (onLoad bắn trước khi ảnh giải mã xong)
  const onImg = (e) => {
    const done = () => setImgReady(true);
    const img = e?.currentTarget;
    if (e?.type === 'load' && img?.decode) img.decode().then(done, done); else done();
  };
  // Clip chưa tải đủ thì chưa cho chạm (không thì clip khựng lúc đầu); quá 4 s vẫn cho (bỏ qua clip)
  useEffect(() => {
    const v = clipRef.current;
    const ok = () => setClipReady(true);
    if (!v || v.readyState >= 4) { ok(); return undefined; }
    v.addEventListener('canplaythrough', ok);
    v.addEventListener('error', ok);
    const t = setTimeout(ok, 4000);
    return () => { v.removeEventListener('canplaythrough', ok); v.removeEventListener('error', ok); clearTimeout(t); };
  }, []);

  /** Giao cho video: IntroVideo chạy video dưới phong bì, phong bì mờ dần rồi gỡ. */
  const toVideo = () => {
    if (cut.current) return;
    cut.current = true;
    cancelAnimationFrame(raf.current);
    onCut?.();
    setStep('fade');
    later(() => onDone?.(), GATE_FADE_MS + 50);
  };

  const open = () => {
    if (step !== 'idle' || !ready) return;
    onOpen?.(); // đồng bộ, trong cú chạm
    const v = clipRef.current;
    if (!v) { toVideo(); return; }
    let shown = false;
    const show = () => { if (!shown) { shown = true; setStep('vid'); } };
    if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(show);
    else v.addEventListener('playing', show, { once: true });
    const watch = () => {
      if (v.currentTime >= GATE_CUT_S || v.ended) { toVideo(); return; }
      raf.current = requestAnimationFrame(watch);
    };
    v.play().then(() => { raf.current = requestAnimationFrame(watch); }, toVideo); // không phát được → vào video
  };

  return (
    <div
      className={`intro-gate step-${step} ${ready ? 'ready' : ''}`}
      role="button"
      tabIndex={0}
      aria-label="Chạm để mở thiệp"
      onClick={open}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}
    >
      <img className="ig-idle" src={`${A}idle-p.jpg${GV}`} alt="" decoding="async" onLoad={onImg} onError={onImg} />
      <video
        className="ig-clip"
        ref={clipRef}
        // bên trong trong suốt (envelope/make_alpha.py): lộ khung video (lần đầu) hoặc thẻ đỏ trống (tải lại)
        src={`${A}${APPLE ? 'open-p-page.mp4' : 'open-p-page.webm'}${GV}`}
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        onEnded={toVideo}
        onError={() => { if (step !== 'idle') toVideo(); }}
      />
      <div className="ig-cta">
        <span>Chạm để mở thiệp</span>
        <small>Trân trọng kính mời</small>
      </div>
    </div>
  );
}
