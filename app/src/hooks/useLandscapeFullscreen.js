import { useEffect } from 'react';
import { mqMatches, onMediaChange, COARSE_QUERY } from './useViewport';

/**
 * Điện thoại / tablet cảm ứng quay NGANG → tự vào toàn màn hình (2026-11-17). File production MỚI.
 * Trình duyệt chỉ cho vào toàn màn hình trong một lần chạm của khách, nên: xoay ngang thì
 * "chờ sẵn", lần chạm đầu tiên (chạm vào đâu cũng được) mới vào. Xoay về dọc thì tự thoát.
 * Khách tự thoát (vuốt / nút back) khi đang ngang → thôi ép cho tới lần xoay sau.
 * html[data-fs-ask] khi đang chờ chạm (CSS hiện lời nhắc), html[data-fs] khi đang toàn màn.
 *
 * GIỚI HẠN: iPhone (Safari, Chrome, Zalo… trên iOS) KHÔNG có Fullscreen API cho trang web —
 * chỉ video mới toàn màn được. Ở iPhone hook này không làm gì (req không tồn tại).
 * Android Chrome / Samsung Internet / iPad: chạy. Webview trong app (Zalo, Messenger)
 * thường chặn → requestFullscreen bị từ chối, bỏ qua êm.
 */
export function useLandscapeFullscreen(isPhone) {
  useEffect(() => {
    const de = document.documentElement;
    const req = de.requestFullscreen || de.webkitRequestFullscreen;
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
    if (!isPhone || !req || !mqMatches(COARSE_QUERY)) return undefined;
    const LAND = '(orientation: landscape)';
    // touchend + click: cả hai đều được tính là "khách chạm" ở mọi trình duyệt
    const EVTS = ['touchend', 'click'];
    let armed = false;
    let ours = false;   // toàn màn do hook này mở → được phép tự thoát
    let optOut = false; // khách tự thoát khi đang ngang

    const disarm = () => {
      if (!armed) return;
      armed = false;
      EVTS.forEach((t) => document.removeEventListener(t, enter, true));
      de.removeAttribute('data-fs-ask');
    };
    const arm = () => {
      if (armed || fsEl() || optOut) return;
      armed = true;
      EVTS.forEach((t) => document.addEventListener(t, enter, true));
      de.setAttribute('data-fs-ask', '');
    };
    function enter() {
      disarm();
      if (!mqMatches(LAND) || fsEl() || optOut) return;
      ours = true;
      try {
        const p = req.call(de, { navigationUI: 'hide' });
        if (p && p.catch) p.catch(() => { ours = false; });
      } catch { ours = false; }
    }
    const onOrient = () => {
      if (mqMatches(LAND)) { optOut = false; arm(); return; }
      disarm();
      if (fsEl() && ours) {
        ours = false;
        try { const p = exit.call(document); if (p && p.catch) p.catch(() => {}); } catch { /* đã thoát */ }
      }
    };
    const onFsChange = () => {
      if (fsEl()) { de.setAttribute('data-fs', ''); disarm(); return; }
      de.removeAttribute('data-fs');
      if (ours && mqMatches(LAND)) optOut = true; // khách tự thoát
      ours = false;
    };

    const offOrient = onMediaChange(LAND, onOrient);
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    onOrient();
    return () => {
      disarm();
      offOrient();
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
      de.removeAttribute('data-fs');
    };
  }, [isPhone]);
}
