import { useEffect } from 'react';

/**
 * Chuyển động theo ngón tay của trang /adult (2026-11-17). Cùng cách với
 * hooks/usePhoneScrollFx.js của trang chính, nhưng khoá trong .a-page (không ghi lên html,
 * không đụng CSS trang chính) và chạy ở mọi khổ màn. Không có thời gian chạy: kéo tới đâu
 * hiện tới đó, cuộn ngược lên thì lui lại y như lúc tới.
 *  · .a-page  --page-p        tiến độ cả trang 0–1 → vạch vàng dưới nav
 *             [data-nav-hide] cuộn xuống quá nửa màn đầu → nav trốn; cuộn lên → hiện
 *             [data-scrolled] đã rời đỉnh trang → nav có bóng
 *             [data-nav-pin]  mốc thời gian: đang tự cuộn tới mục → nav không trốn
 *  · [data-sp] --sp đi qua màn (0 mép trên ở đáy màn → 1 mép dưới qua đỉnh màn)
 *              --sx rời màn (0 → 1 khi mép trên trôi qua đỉnh một khoảng bằng chiều cao)
 *              --sf lấp màn (0 → 1 khi hiện trọn, hoặc mép trên chạm đỉnh nếu cao hơn màn)
 * Bật Reduce motion / không có IntersectionObserver → không gắn [data-sfx]: CSS không áp,
 * mọi thứ hiện sẵn, đứng yên.
 */
export const A_PIN_MS = 1400;

// Điểm nhấn cả trang — chốt 7a + 7c + 7d + 7f (2026-11-18): nhũ vàng bay ở hero · mép giấy dó
// giữa nền đỏ và nền giấy · ảnh cưới kẹp album (4 góc giấy) · chữ ký chân trang tự viết theo cuộn.

export function adultNavH() {
  const nav = document.querySelector('.a-nav');
  return nav ? nav.getBoundingClientRect().height : 0;
}

// Cuộn tới mục, chừa chỗ cho nav. Không dùng scrollIntoView: trong webview Zalo / iframe
// nó cuộn cả trang cha.
export function adultScrollTo(target) {
  const page = document.querySelector('.a-page');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (page) page.setAttribute('data-nav-pin', String(Date.now() + A_PIN_MS));
  const el = typeof target === 'string' ? document.getElementById(target) : target;
  const top = !el || el.id === 'thiep-cuoi'
    ? 0
    : el.getBoundingClientRect().top + window.scrollY - adultNavH() - 12;
  window.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
}

export function useAdultScrollFx(ref) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
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
    const scan = () => root.querySelectorAll('[data-sp]').forEach((el) => {
      if (seen.has(el)) return;
      seen.add(el);
      io.observe(el);
    });

    let anchorY = window.scrollY;
    let hidden = false;
    let scrolled = null;
    const flag = (name, on) => (on ? root.setAttribute(name, '') : root.removeAttribute(name));
    const setHide = (v) => { if (v !== hidden) { hidden = v; flag('data-nav-hide', v); } };

    function frame() {
      raf = 0;
      const vh = window.innerHeight;
      const y = window.scrollY;
      const reads = []; // đọc hết rồi mới ghi
      live.forEach((el) => reads.push([el, el.getBoundingClientRect()]));
      const max = document.documentElement.scrollHeight - vh;

      root.style.setProperty('--page-p', max > 0 ? clamp(y / max).toFixed(4) : '0');
      if ((y > 8) !== scrolled) { scrolled = y > 8; flag('data-scrolled', scrolled); }

      const pinned = Number(root.getAttribute('data-nav-pin') || 0) > Date.now() || !!root.querySelector('.a-menu');
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
      });
    }
    function queue() { if (!raf) raf = requestAnimationFrame(frame); }

    scan();
    const mo = new MutationObserver(scan);
    mo.observe(root, { childList: true, subtree: true });
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
      ['data-sfx', 'data-nav-hide', 'data-scrolled'].forEach((n) => root.removeAttribute(n));
    };
  }, []);
}
