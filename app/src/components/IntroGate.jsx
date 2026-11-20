import { useEffect, useRef, useState } from 'react';

/**
 * Phong bì mở thiệp (11/2026) — màn đầu của IntroVideo; khổ dọc, từ 20/11 cả khổ ngang + máy tính (`wide`).
 *
 * Bản 2 (chủ thiệp 20/11: "đặt khung cho tấm thiệp, cố định 1 size, mở ra phần bên trong khít với trang"):
 * phong bì là một hình chữ nhật 2:3 ĐÚNG BẰNG thẻ hero, nằm trên nền hoa đỏ y như trang. Clip được đặt theo
 * khung của thẻ thật (`rect`), không phủ kín màn kiểu cover nữa → máy dài / ngắn nào thẻ trong clip cũng trùng
 * thẻ trang. Mở ra: bốn vạt nằm phẳng ra ngoài, dấu sáp theo vạt trái ra khỏi khung hình, ở giữa là:
 * - lần đầu (`reveal` false): khung đầu của video cưới trong thẻ (open-video.mp4) → video chạy đúng chỗ đó;
 * - tải lại (`reveal` true): thẻ đỏ trống (open-card.mp4) → lớp phủ rời đi, chữ thẻ thật trồi lên.
 * Clip KHÔNG có kênh trong suốt (bản 1 tách nền lòng phong bì bị sót mảnh kem trên Android) — cả nền hoa lẫn
 * tấm thẻ đều nằm trong clip, ghép từ ảnh chụp thẻ thật (wedding-video/envelope/v2/).
 * Ảnh tĩnh: phong bì đóng (idle-p.jpg bản 1 cắt 2:3) trên nền; clip: Kling 3 Pro khoá khung đầu + khung cuối.
 * Ảnh chờ idle-card / idle-video = khung đầu của đúng clip sẽ phát → lúc chạm không nháy.
 */

const A = '/assets/intro/envelope/';
const GV = '?v=20261122d';
// Thẻ trong khung hình clip (tỉ lệ theo rộng/cao clip) — đo ở khung cuối của clip (v2/measure).
export const CLIP_CARD = { x: 0.1791, y: 0.2324, w: 0.6409, h: 0.5353 };
// Bản ngang (khổ ngang + máy tính, 20/11 — chủ thiệp: "chính thiệp bản dọc xoay ngang ra, huy hiệu sáp đúng hướng"):
// clip dọc đã duyệt xoay 90° theo kim đồng hồ (vạt mang dấu sáp mở lên trên), dấu sáp vẽ lại đứng thẳng
// (envelope/v2/rot_clip.py + seal_fix.py). Phong bì 3:2 đặt giữa thẻ hero (thẻ giữ cỡ cũ, rộng hơn — IntroVideo fit32).
export const CLIP_CARD_W = { x: 0.2324, y: 0.1791, w: 0.5353, h: 0.6409 };
// Clip đã cắt 9 khung đứng yên đầu và đoạn lắng cuối, chiếu 60 khung/giây (đủ mọi khung Kling, nhanh 2,5× —
// chủ thiệp: "mở hơi chậm", "lên 40", rồi "lên 60"; envelope/v2/finish_clip.py): vạt nằm yên ở ~1,77 s → giao cho IntroVideo.
export const GATE_CUT_S = 1.77;
export const GATE_FADE_MS = 650;
export const GATE_LEAD_S = GATE_CUT_S; // chạm → video chạy (IntroVideo canh nhạc)

// Phong bì ngang có nền TRONG SUỐT (chủ thiệp: "background đỏ của thiệp lệch với background hero") — envelope/v2/alpha_w.py.
// iPhone / iPad / Safari: HEVC có kênh trong suốt; trình duyệt khác: WebM VP9 có kênh trong suốt.
const APPLE = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent)
  || (/Safari/.test(navigator.userAgent) && !/Chrome|Chromium|CriOS|Edg|OPR|Android/.test(navigator.userAgent)));

/** Khung clip (toạ độ màn hình) sao cho thẻ trong clip trùng `rect` của thẻ thật. */
export function clipBox(rect, wide) {
  if (!rect) return null;
  const C = wide ? CLIP_CARD_W : CLIP_CARD;
  const w = rect.w / C.w;
  const h = rect.h / C.h;
  return { left: rect.x - C.x * w, top: rect.y - C.y * h, width: w, height: h };
}

/** Nút "Chạm để mở thiệp" nằm giữa khoảng trống dưới phong bì (không đè lên mép phong bì); chật quá thì để CSS. */
const CTA_H = 64;
const PILL_H = 38;
function ctaPlace(rect, wide) {
  if (!rect || typeof window === 'undefined') return undefined;
  const bottom = rect.y + rect.h;
  const below = window.innerHeight - bottom;
  if (below >= CTA_H + 16) return { top: Math.round(bottom + Math.min(48, (below - CTA_H) / 2)), bottom: 'auto' };
  // Phong bì ngang mà dưới không còn chỗ (điện thoại ngang, nhất là iPhone có thanh Safari): nút nằm giữa dải từ
  // mép dưới dấu sáp (dấu sáp cao ~36% thẻ, ở giữa) tới mép dưới phong bì — không đè lên dấu sáp.
  if (wide) {
    const band = rect.h * 0.31;
    return { top: Math.round(rect.y + rect.h * 0.69 + Math.max(0, (band - PILL_H) / 2)), bottom: 'auto', left: Math.round(rect.x + rect.w / 2) };
  }
  return undefined;
}

/**
 * @param rect    khung thẻ hero thật (x, y, w, h) — chưa đo được thì chưa hiện phong bì
 * @param reveal  tải lại: clip mở ra thẻ trống, mở xong giữ khung cuối (IntroVideo rời lớp phủ)
 * @param onOpen  gọi NGAY trong cú chạm (đồng bộ) — nhạc + tiếng giấy/sáp, làm nóng video
 * @param onCut   tới GATE_CUT_S: lần đầu thì IntroVideo chạy video dưới phong bì; tải lại thì rời lớp phủ
 * @param onDone  clip đã mờ hết (lần đầu): gỡ phong bì
 * @param wide    khổ ngang / máy tính: phong bì xoay ngang (clip *-w, thẻ 3:2)
 */
export default function IntroGate({ rect, reveal, wide, onOpen, onCut, onDone }) {
  // Khổ ngang tải lại: thẻ trong phong bì là 3:2, thẻ trang rộng hơn → phong bì cũng mờ đi (như lần đầu) để
  // IntroVideo giãn thẻ đỏ ra đúng thẻ trang; khổ dọc giữ khung cuối rồi rời lớp phủ.
  const hold = reveal && !wide;
  const [step, setStep] = useState('idle'); // idle → vid → fade (lần đầu) / hold (tải lại)
  const [imgReady, setImgReady] = useState(false);
  const [clipReady, setClipReady] = useState(false);
  const ready = imgReady && clipReady && !!rect;
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
  // Clip chưa tải đủ thì chưa cho chạm (không thì clip khựng lúc đầu); quá 1,5 s vẫn cho
  useEffect(() => {
    const v = clipRef.current;
    const ok = () => setClipReady(true);
    if (!v || v.readyState >= 4) { ok(); return undefined; }
    v.addEventListener('canplaythrough', ok);
    v.addEventListener('error', ok);
    const t = setTimeout(ok, 1500); // Safari iPhone không tải trước clip khi chưa chạm → không đợi lâu (ảnh chờ vẫn giữ tới khung đầu)
    return () => { v.removeEventListener('canplaythrough', ok); v.removeEventListener('error', ok); clearTimeout(t); };
  }, []);

  /** Mở xong. Lần đầu: video chạy dưới phong bì, phong bì mờ rồi gỡ. Tải lại: đứng ở khung cuối. */
  const toVideo = () => {
    if (cut.current) return;
    cut.current = true;
    cancelAnimationFrame(raf.current);
    if (hold) {
      clipRef.current?.pause();
      setStep('hold');
      onCut?.();
      return;
    }
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
    v.play().then(() => { raf.current = requestAnimationFrame(watch); }, toVideo); // không phát được → vào luôn
  };

  const box = clipBox(rect, wide);
  const name = reveal ? 'card' : 'video';
  const idleSrc = wide ? `${A}idle-${name}-w.webp${GV}` : `${A}idle-${name}.jpg${GV}`;
  const clipSrc = wide ? `${A}open-${name}-${APPLE ? 'wa.mp4' : 'w.webm'}${GV}` : `${A}open-${name}.mp4${GV}`;
  const place = box ? { left: box.left, top: box.top, width: box.width, height: box.height } : undefined;
  return (
    <div
      className={`intro-gate step-${step} ${ready ? 'ready' : ''}`}
      role="button"
      tabIndex={0}
      aria-label="Chạm để mở thiệp"
      onClick={open}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}
    >
      <img className="ig-idle" style={place} src={idleSrc} alt="" decoding="async" onLoad={onImg} onError={onImg} />
      <video
        className="ig-clip"
        style={place}
        ref={clipRef}
        src={clipSrc}
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        onEnded={toVideo}
        onError={() => { if (step !== 'idle') toVideo(); }}
      />
      <div className={`ig-cta ${wide && rect && window.innerHeight - rect.y - rect.h < CTA_H + 16 ? 'on-flap' : ''}`} style={ctaPlace(rect, wide)}>
        <span>Chạm để mở thiệp</span>
        <small>Trân trọng kính mời</small>
      </div>
    </div>
  );
}
