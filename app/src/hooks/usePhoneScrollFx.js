import { useEffect } from 'react';
import { mqMatches } from './useViewport';

/**
 * Chuyển động theo cuộn cho điện thoại (2026-11-17). File production MỚI.
 * Không dùng animation-timeline (Safari < 26 không có): một trình nghe `scroll` thụ động
 * + requestAnimationFrame ghi vài biến CSS, chỉ cho phần tử đang ở gần màn hình.
 *  · html  --page-p     tiến độ cả trang 0–1 → vạch vàng dưới nav
 *          [data-nav-hide]  cuộn xuống (quá nửa màn đầu) thì nav trốn lên, cuộn lên thì hiện
 *          [data-scrolled]  đã rời đỉnh trang → nav có bóng
 *  · [data-sp]  --sp  đi qua màn (0 mép trên ở đáy màn → 1 mép dưới qua đỉnh màn)
 *               --sx  rời màn (0 → 1 khi mép trên trôi qua đỉnh một khoảng bằng chiều cao)
 *               --sf  lấp màn (0 → 1 khi hiện trọn, hoặc mép trên chạm đỉnh nếu cao hơn màn)
 *               --sd  "ngòi bút" ở 70% chiều cao màn: phần của phần tử đã nằm trên vạch đó
 * Giảm chuyển động / không có IntersectionObserver → không gắn html[data-sfx], CSS không áp.
 * Nav.jsx ghi html[data-nav-pin] (mốc thời gian) khi tự cuộn tới mục → nav không trốn lúc đó.
 */
export function usePhoneScrollFx(isPhone) {
  useEffect(() => {
    const root = document.documentElement;
    const reduce = mqMatches('(prefers-reduced-motion: reduce)');
    if (!isPhone || reduce || !('IntersectionObserver' in window)) {
      root.removeAttribute('data-sfx');
      return undefined;
    }
    const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
    const live = new Set();
    let raf = 0;
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) live.add(e.target); else live.delete(e.target); });
      queue();
    }, { rootMargin: '20% 0px 20% 0px' });
    const seen = new WeakSet();
    const scan = () => document.querySelectorAll('[data-sp]').forEach((el) => {
      if (seen.has(el)) return;
      seen.add(el);
      io.observe(el);
    });

    const t0 = Date.now();
    const landing = !!location.hash; // useHashLanding giữ mục dưới nav 6 giây
    let anchorY = window.scrollY;
    let hidden = false;
    let scrolled = null;
    const flag = (name, on) => (on ? root.setAttribute(name, '') : root.removeAttribute(name));
    const setHide = (v) => { if (v !== hidden) { hidden = v; flag('data-nav-hide', v); } };

    function frame() {
      raf = 0;
      const vh = window.innerHeight;
      const y = window.scrollY;
      // Đọc hết rồi mới ghi: không xen kẽ đọc/ghi bố cục
      const reads = [];
      live.forEach((el) => reads.push([el, el.getBoundingClientRect()]));
      const max = root.scrollHeight - vh;

      root.style.setProperty('--page-p', max > 0 ? clamp(y / max).toFixed(4) : '0');
      if ((y > 8) !== scrolled) { scrolled = y > 8; flag('data-scrolled', scrolled); }

      const pinned = Number(root.getAttribute('data-nav-pin') || 0) > Date.now()
        || (landing && Date.now() - t0 < 6500)
        || !!document.querySelector('.nav-menu');
      if (pinned || y < vh * 0.5) { setHide(false); anchorY = y; }
      else if (hidden) {
        if (y > anchorY) anchorY = y;
        else if (anchorY - y > 24) { setHide(false); anchorY = y; }
      } else if (y < anchorY) anchorY = y;
      else if (y - anchorY > 32) { setHide(true); anchorY = y; }

      reads.forEach(([el, r]) => {
        const h = r.height || 1;
        el.style.setProperty('--sp', clamp((vh - r.top) / (vh + h)).toFixed(4));
        el.style.setProperty('--sx', clamp(-r.top / h).toFixed(4));
        el.style.setProperty('--sf', clamp((vh - r.top) / Math.min(h, vh)).toFixed(4));
        el.style.setProperty('--sd', clamp((vh * 0.7 - r.top) / h).toFixed(4));
      });
    }
    function queue() { if (!raf) raf = requestAnimationFrame(frame); }

    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.getElementById('root'), { childList: true, subtree: true });
    root.setAttribute('data-sfx', '');
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    queue();
    return () => {
      io.disconnect();
      mo.disconnect();
      window.removeEventListener('scroll', queue);
      window.removeEventListener('resize', queue);
      if (raf) cancelAnimationFrame(raf);
      ['data-sfx', 'data-nav-hide', 'data-scrolled'].forEach((a) => root.removeAttribute(a));
    };
  }, [isPhone]);
}
