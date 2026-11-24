import { useEffect, useRef, useState } from 'react';

/**
 * Phong bì mở thiệp — màn đầu của IntroVideo. Phong bì đỏ rượu vang, ren đục lỗ, hoa dập nổi, dấu sáp vàng logo HM.
 * Clip đặt theo khung thẻ hero thật (`rect`, clipBox) nên ở máy nào thẻ trong clip cũng trùng thẻ trang.
 * Mở ra bốn vạt; ở giữa: lần đầu (`reveal` false) là khung đầu video cưới, tải lại (`reveal` true) là thẻ đỏ trống.
 * - Khổ dọc: clip 2:3 khít thẻ, nền đục (nền hoa + thẻ ghép sẵn trong clip).
 * - Khổ ngang / máy tính (`wide`): clip dọc xoay 90° (vạt mang dấu sáp mở lên trên, dấu sáp vẽ lại đứng thẳng),
 *   phong bì 3:2 giữa thẻ (IntroVideo fit32), NỀN TRONG SUỐT để lộ đúng nền hoa của trang.
 * Ảnh chờ = khung đầu của đúng clip sẽ phát → lúc chạm không nháy. Nguồn dựng: ~/Downloads/wedding-video/envelope/v2/.
 */

const A = '/assets/intro/envelope/';
const GV = '?v=20261125c'; // 25/11: open-video*.{mp4,webm} — vạt dưới hết bạc trắng (flap_fix.py); b: dấu sáp dọc không còn thấu ảnh; c: vạt trên hết nháy xám
// Thẻ trong khung hình clip (tỉ lệ theo rộng/cao clip), đo ở khung cuối: khổ dọc / xoay ngang
const CLIP_CARD = { x: 0.1791, y: 0.2324, w: 0.6409, h: 0.5353 };
const CLIP_CARD_W = { x: 0.2324, y: 0.1791, w: 0.5353, h: 0.6409 };
// Clip chiếu mọi khung Kling ở 60 khung/giây (chủ thiệp: "mở hơi chậm" → 2,5×): vạt nằm yên ở ~1,77 s
const GATE_CUT_S = 1.77;
const GATE_FADE_MS = 900; // = .intro-gate transition; review 25/11: 0,65 s nhìn như hai vạt bên "tắt phụt"
export const GATE_LEAD_S = GATE_CUT_S; // chạm → video chạy (IntroVideo canh nhạc)
// Clip nền trong suốt: Safari / iPhone / iPad đọc HEVC có alpha; trình duyệt khác WebM VP9 có alpha
const APPLE = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent)
  || (/Safari/.test(navigator.userAgent) && !/Chrome|Chromium|CriOS|Edg|OPR|Android/.test(navigator.userAgent)));

/** Khung clip (toạ độ màn hình) sao cho thẻ trong clip trùng `rect` của thẻ thật. */
function clipBox(rect, wide) {
  if (!rect) return null;
  const C = wide ? CLIP_CARD_W : CLIP_CARD;
  const w = rect.w / C.w;
  const h = rect.h / C.h;
  return { left: rect.x - C.x * w, top: rect.y - C.y * h, width: w, height: h };
}

/** Nút "Chạm để mở thiệp": giữa khoảng trống dưới phong bì; phong bì ngang mà dưới không còn chỗ (điện thoại ngang,
 *  máy gập) thì giữa khoảng trống phía trên phong bì; hết chỗ nữa mới nằm trên vạt dưới (giữa mép dưới dấu sáp, ~69%
 *  cao thẻ, và mép phong bì); còn lại để CSS. */
const CTA_H = 64;
const PILL_H = 38;
function ctaPlace(rect, wide) {
  if (!rect || typeof window === 'undefined') return undefined;
  const bottom = rect.y + rect.h;
  const below = window.innerHeight - bottom;
  if (below >= CTA_H + 16) return { top: Math.round(bottom + Math.min(48, (below - CTA_H) / 2)), bottom: 'auto' };
  if (wide) {
    // Còn chỗ phía trên phong bì (khổ ngang: nav chưa hiện, ~76px) → nút nằm giữa khoảng trống đó, không đè lên thiệp
    // (chủ thiệp 25/11, iPhone Duo). Không đủ chỗ mới đặt lên vạt dưới như cũ.
    if (rect.y >= PILL_H + 20) {
      return { top: Math.round((rect.y - PILL_H) / 2), bottom: 'auto', left: Math.round(rect.x + rect.w / 2) };
    }
    const band = rect.h * 0.31;
    return { top: Math.round(rect.y + rect.h * 0.69 + Math.max(0, (band - PILL_H) / 2)), bottom: 'auto', left: Math.round(rect.x + rect.w / 2) };
  }
  return undefined;
}

/**
 * @param rect    khung phong bì (thẻ hero; khổ ngang: phần 3:2 giữa thẻ) — chưa đo được thì chưa hiện
 * @param reveal  tải lại: clip mở ra thẻ đỏ trống
 * @param wide    khổ ngang / máy tính: clip xoay ngang, nền trong suốt
 * @param onOpen  gọi trong cú chạm (đồng bộ) — nhạc + tiếng giấy, làm nóng video
 * @param onCut   vạt nằm yên (GATE_CUT_S)
 * @param onDone  clip đã mờ hết: gỡ phong bì
 */
export default function IntroGate({ rect, reveal, wide, onOpen, onCut, onDone }) {
  // Khổ ngang tải lại: thẻ trong phong bì là 3:2, thẻ trang rộng hơn → phong bì cũng mờ đi (như lần đầu) để
  // IntroVideo giãn thẻ đỏ ra đúng thẻ trang; khổ dọc giữ khung cuối rồi rời lớp phủ.
  const hold = reveal && !wide;
  const [step, setStep] = useState('idle'); // idle → (fs: chờ toàn màn) → vid → fade / hold (tải lại khổ dọc)
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
    // Điện thoại ngang (Android): cú chạm này vừa xin toàn màn (useLandscapeFullscreen, chạy trước ở pha capture) → màn
    // sắp cao lên, thẻ hero đổi chỗ. Chờ màn đổi cỡ xong + IntroVideo đo lại thẻ (~100 ms) rồi mới mở, để phong bì mở
    // đúng chỗ thẻ mới (nhạc + tiếng giấy cũng vào lúc đó cho khớp vạt; trang đã được chạm nên vẫn phát được).
    const de = document.documentElement;
    if (de.dataset.fsPending !== undefined) {
      setStep('fs');
      const t0 = Date.now();
      const wait = () => {
        if (de.dataset.fsPending !== undefined && Date.now() - t0 < 1500) { later(wait, 50); return; }
        later(start, 350);
      };
      wait();
      return;
    }
    start();
  };
  const start = () => {
    onOpen?.(); // đồng bộ, trong cú chạm (trừ khi vừa chờ toàn màn ở trên)
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
  // Vệt ánh kim trên dấu sáp (gợi ý chạm): lớp tròn cắt đúng chỗ dấu trên ảnh chờ (tâm ~giữa clip, Ø ≈ 23% bề ngắn).
  // Chỉ khi còn chờ chạm; chạm là gỡ (clip mở có dấu sáp riêng).
  const seal = box ? (() => {
    const d = Math.min(box.width, box.height) * 0.25;
    const cx = box.left + box.width * (wide ? 0.5015 : 0.4995);
    const cy = box.top + box.height * (wide ? 0.498 : 0.495);
    return {
      left: cx - d / 2, top: cy - d / 2, width: d, height: d,
      backgroundImage: `url(${idleSrc})`,
      backgroundSize: `${box.width}px ${box.height}px`,
      backgroundPosition: `${box.left - (cx - d / 2)}px ${box.top - (cy - d / 2)}px`,
    };
  })() : null;
  // "Trân trọng kính mời": trên phong bì nếu còn chỗ (dọc, máy tính); điện thoại ngang thì dưới nút như cũ
  // Khổ ngang mà dưới phong bì hết chỗ: nút "Chạm để mở thiệp" chiếm khoảng trống phía trên (ctaPlace) → bỏ dòng mời
  const ctaUp = wide && !!rect && window.innerHeight - rect.y - rect.h < CTA_H + 16 && rect.y >= PILL_H + 20;
  const inviteAbove = !!rect && rect.y >= 78 && !ctaUp;
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
      {seal && <div className="ig-seal" style={seal} aria-hidden="true" />}
      {inviteAbove && (
        <div className="ig-invite" style={{ top: Math.round(rect.y - 34) }} aria-hidden="true">
          <i /><b>Trân trọng kính mời</b><i />
        </div>
      )}
      <div className={`ig-cta ${wide && rect && window.innerHeight - rect.y - rect.h < CTA_H + 16 ? 'on-flap' : ''}`} style={ctaPlace(rect, wide)}>
        <span>Chạm để mở thiệp</span>
        {!inviteAbove && <small>Trân trọng kính mời</small>}
      </div>
    </div>
  );
}
