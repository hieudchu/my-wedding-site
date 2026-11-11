import { useEffect } from 'react';

const SECTIONS = ['hero', 'groom', 'bride', 'details', 'timeline', 'rsvp'];
const PIN_MS = 6000;

/**
 * Mở trang bằng link có neo (vd. mã QR trỏ tới …/#rsvp) → cuộn thẳng tới mục đó.
 *
 * Trình duyệt tự tìm neo lúc trang vừa tải, khi React chưa dựng các mục → nó đứng ở
 * đầu trang. Hook này cuộn sau khi dựng, rồi GIỮ mục đó ngay dưới thanh nav trong vài
 * giây: ảnh phía trên tải xong làm trang dài ra, không giữ thì mục bị đẩy trôi xuống.
 * Khách chạm / cuộn / bấm phím là thôi giữ ngay, không giành quyền cuộn với khách.
 */
export function useHashLanding() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!SECTIONS.includes(id) || id === 'hero') return undefined;
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

    let done = false;
    let raf = 0;
    const pin = () => {
      if (done) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = document.getElementById(id);
        if (!el) return;
        const nav = document.querySelector('.nav')?.offsetHeight || 70;
        const top = Math.round(el.getBoundingClientRect().top + window.scrollY - nav);
        if (Math.abs(window.scrollY - top) > 1) window.scrollTo({ top, behavior: 'instant' });
      });
    };

    const ro = new ResizeObserver(pin);
    ro.observe(document.body);
    pin();

    const stop = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      clearTimeout(timer);
      STOP_EVENTS.forEach((ev) => window.removeEventListener(ev, stop, true));
    };
    const STOP_EVENTS = ['wheel', 'touchstart', 'pointerdown', 'keydown'];
    STOP_EVENTS.forEach((ev) => window.addEventListener(ev, stop, { capture: true, passive: true }));
    const timer = setTimeout(stop, PIN_MS);
    return stop;
  }, []);
}
