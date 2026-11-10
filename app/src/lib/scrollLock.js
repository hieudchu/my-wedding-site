import { mqMatches, COARSE_QUERY } from '../hooks/useViewport';

/**
 * Khoá cuộn trang.
 *
 * SỬA 7 — `body.style.overflow = 'hidden'` không chặn được cuộn bằng ngón tay trên
 * iOS. Trên thiết bị cảm ứng, ghim hẳn body bằng `position: fixed` và trả lại vị trí
 * cuộn khi mở khoá. Máy tính giữ cách cũ (overflow) → desktop không đổi.
 *
 * Có bộ đếm vì nhiều chỗ có thể cùng khoá. Hiện chỉ lightbox dùng (cổng đã bỏ).
 */

let lockDepth = 0;
let lockY = 0;

function instantScrollTo(y) {
  const root = document.documentElement;
  const prev = root.style.scrollBehavior;
  root.style.scrollBehavior = 'auto'; // html có scroll-behavior: smooth
  window.scrollTo(0, y);
  root.style.scrollBehavior = prev;
}

export function lockScroll({ toTop = false } = {}) {
  lockDepth += 1;
  if (lockDepth > 1) return;
  const b = document.body.style;
  if (mqMatches(COARSE_QUERY)) {
    if (toTop) instantScrollTo(0);
    lockY = window.scrollY;
    b.position = 'fixed';
    b.top = `-${lockY}px`;
    b.left = '0';
    b.right = '0';
    b.width = '100%';
  }
  b.overflow = 'hidden';
}

export function unlockScroll() {
  if (lockDepth === 0) return;
  lockDepth -= 1;
  if (lockDepth > 0) return;
  const b = document.body.style;
  const pinned = b.position === 'fixed';
  b.position = '';
  b.top = '';
  b.left = '';
  b.right = '';
  b.width = '';
  b.overflow = '';
  if (pinned) instantScrollTo(lockY);
}
