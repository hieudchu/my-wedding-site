/**
 * Nhạc mở đầu — riêng với danh sách nhạc nền; admin đổi được (site_config intro_music / intro_music_start,
 * admin/sections/IntroMusic.jsx). Mặc định "Một đời" không lời, cắt sẵn từ giây 6 cho khớp nhịp video.
 * Âm lượng qua Web Audio GainNode: iOS bỏ qua `audio.volume`. File Supabase có CORS `*` nên dùng được crossOrigin.
 */
export const MUSIC_DEFAULT = '/assets/intro/intro-music.m4a?v=20261120';
export const SFX_URL = '/assets/intro/envelope/sfx.mp3?v=20261122d'; // tiếng giấy + bóc sáp của phong bì
export const MUSIC_FADE_S = 1.2; // lắng xuống khi lớp phủ mờ đi
const VOL_LO = 0.16; // vào nhỏ, nhẹ
const VOL_HI = 0.55; // to dần tới mức vừa ở cuối video

export function createMusic(url, sfxUrl) {
  // iOS: Web Audio mặc định là loại "ambient" (tắt theo công tắc im lặng). Safari 16.4+ cho đặt "playback".
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
  // Tiếng phong bì — chung AudioContext để iOS cho kêu cùng lúc với nhạc
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
  // Video dừng (Safari tự dừng video câm khi bị che, hoặc đang tải) → nhạc dừng theo; chạy lại → tua đúng chỗ.
  const hold = () => { if (!a.paused) a.pause(); };
  const follow = (at) => {
    try { if (Math.abs(a.currentTime - at) > 0.25) a.currentTime = at; } catch { /* chưa tua được */ }
    if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
    if (a.paused) a.play().catch(() => {});
  };
  return { el: a, play, sfx, fadeOut, destroy, state, hold, follow };
}
