import { useEffect } from 'react';
import { mqMatches } from './useViewport';

/**
 * Hiện-khi-cuộn cho điện thoại.
 *
 * SỬA 5 + 6 — trên điện thoại chỉ còn MỘT cơ chế: thuộc tính `data-rv` +
 * IntersectionObserver gắn class `rv-in`. Không phụ thuộc `animation-timeline`
 * nên chạy được cả trên iOS cũ. Không có IO, hoặc khách bật giảm chuyển động,
 * thì không gắn `rv-io` → mọi thứ hiện sẵn.
 *
 * Desktop vẫn dùng `.rv` + `view()` như cũ, không đổi.
 */
export function usePhoneReveal(isPhone) {
  useEffect(() => {
    const root = document.documentElement;
    const reduce = mqMatches('(prefers-reduced-motion: reduce)');
    if (!isPhone || reduce || !('IntersectionObserver' in window)) {
      root.classList.remove('rv-io');
      return undefined;
    }
    // Phần tử đã hiện. Dùng để trả lại `rv-in` khi React ghi đè className của nó.
    const revealed = new WeakSet();

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        // Phần tử đã nằm phía trên màn hình (nhảy bằng nav) cũng phải hiện
        if (e.isIntersecting || e.boundingClientRect.bottom < 0) {
          e.target.classList.add('rv-in');
          revealed.add(e.target);
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -6% 0px' });

    const watch = (el) => {
      if (revealed.has(el)) el.classList.add('rv-in');
      else if (!el.classList.contains('rv-in')) io.observe(el);
    };
    document.querySelectorAll('[data-rv]').forEach(watch);

    // Phải theo dõi cả phần tử sinh ra SAU lượt dựng đầu. Lịch trình dựng trước bằng
    // dữ liệu dự phòng rồi mới thay bằng dữ liệu Supabase; mốc nào có id mới là một
    // nút DOM mới, không ai theo dõi, và nằm ở opacity 0 mãi mãi — đã gặp trên
    // production với mốc 19:30 Khai tiệc.
    // Thêm nữa: React đặt lại className khi phần tử đổi vị trí (trái ↔ phải), và
    // lượt đặt lại đó xoá mất `rv-in` mà ta gắn tay → phần tử đang hiện bỗng biến mất.
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes') {
          if (revealed.has(m.target) && !m.target.classList.contains('rv-in')) m.target.classList.add('rv-in');
          continue;
        }
        m.addedNodes.forEach((n) => {
          if (n.nodeType !== 1) return;
          if (n.matches('[data-rv]')) watch(n);
          n.querySelectorAll('[data-rv]').forEach(watch);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

    root.classList.add('rv-io');
    return () => {
      io.disconnect();
      mo.disconnect();
      root.classList.remove('rv-io');
    };
  }, [isPhone]);
}
