import { useEffect, useRef } from 'react';
import { mqMatches } from '../hooks/useViewport';

/**
 * Chuyển động "vào tiệc cưới" — desktop và (từ 2026-11-11) cả điện thoại. Nhẹ, chậm,
 * mỗi chỗ chạy một lần. desktop.css vẽ cho desktop, mobile.css cho điện thoại.
 *  · [data-dv] hiện trên màn → gắn [data-in] (một lần). desktop.css lo phần vẽ nét /
 *    viết chữ: vạch ❖, bốn góc thiệp, sợi chỉ lịch trình, chữ ký H/M, "Hiếu & Minh".
 *  · Lấp lánh vàng nhỏ theo chuột (canvas, chỉ vẽ khi còn hạt).
 *  · Khách bật "giảm chuyển động" → không gắn html[data-dm] → mọi thứ hiện sẵn, đứng yên.
 * Đã chốt cả 5 hiệu ứng (FX_LIST). Giữ html[data-fx-*] để sau này tắt riêng từng cái nếu cần.
 */
const FX_LIST = [
  ['draw', 'Hoạ tiết vàng tự vẽ'],
  ['sign', 'Chữ ký viết tay'],
  ['flip', 'Đếm ngược bảng lật'],
  ['env', 'Phong thư bay đi'],
  ['spark', 'Lấp lánh theo chuột'],
];
const FX_ON = Object.fromEntries(FX_LIST.map(([k]) => [k, true])); // đã chốt: bật cả 5

export default function DeskMotion() {
  const reduce = mqMatches('(prefers-reduced-motion: reduce)');
  const fx = FX_ON;
  const canvasRef = useRef(null);

  useEffect(() => {
    const root = document.documentElement;
    if (!reduce) root.setAttribute('data-dm', '');
    FX_LIST.forEach(([k]) => root.setAttribute(`data-fx-${k}`, 'on'));
  }, [reduce]);
  useEffect(() => () => document.documentElement.removeAttribute('data-dm'), []);

  // Hiện-khi-cuộn cho [data-dv]
  useEffect(() => {
    if (reduce || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.setAttribute('data-in', '');
      io.unobserve(e.target);
    }), { rootMargin: '0px 0px -12% 0px' });
    // Theo dõi theo từng lần chạy effect (không gắn cờ lên phần tử): StrictMode chạy effect
    // hai lần, cờ trên phần tử làm lần hai bỏ qua hết → không gì được [data-in].
    const seen = new WeakSet();
    const scan = () => document.querySelectorAll('[data-dv]:not([data-in])').forEach((el) => {
      if (seen.has(el)) return;
      seen.add(el);
      io.observe(el);
    });
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.getElementById('root'), { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, [reduce]);

  // Lấp lánh theo chuột
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || reduce || !fx.spark || !mqMatches('(pointer: fine)')) return undefined;
    const ctx = cv.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = () => { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; };
    size();
    const parts = [];
    let raf = 0;
    let last = null;
    const draw = (now) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (let i = parts.length - 1; i >= 0; i -= 1) {
        const p = parts[i];
        const t = (now - p.t0) / p.life;
        if (t >= 1) { parts.splice(i, 1); continue; }
        p.x += p.vx; p.y += p.vy; p.vy += 0.012;
        const a = (1 - t) * (t < 0.15 ? t / 0.15 : 1);
        const r = p.r * (1 - t * 0.5);
        ctx.globalAlpha = a * 0.9;
        ctx.fillStyle = p.c;
        ctx.beginPath(); // ngôi sao 4 cánh nhỏ
        ctx.moveTo(p.x, p.y - r * 2.2);
        ctx.quadraticCurveTo(p.x, p.y, p.x + r * 2.2, p.y);
        ctx.quadraticCurveTo(p.x, p.y, p.x, p.y + r * 2.2);
        ctx.quadraticCurveTo(p.x, p.y, p.x - r * 2.2, p.y);
        ctx.quadraticCurveTo(p.x, p.y, p.x, p.y - r * 2.2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = parts.length ? requestAnimationFrame(draw) : 0;
    };
    const onMove = (e) => {
      if (last && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 18) return;
      last = { x: e.clientX, y: e.clientY };
      if (parts.length > 28) return;
      parts.push({
        x: e.clientX + (Math.random() - 0.5) * 8,
        y: e.clientY + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.2,
        r: 1 + Math.random() * 1.4,
        c: Math.random() < 0.7 ? '#C9A05A' : '#E9D3A4',
        t0: performance.now(),
        life: 700 + Math.random() * 400,
      });
      if (!raf) raf = requestAnimationFrame(draw);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('resize', size);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('resize', size);
      cancelAnimationFrame(raf);
      ctx.clearRect(0, 0, cv.width, cv.height);
    };
  }, [fx.spark, reduce]);

  return (
    <>
      <canvas ref={canvasRef} className="d-spark" aria-hidden="true" />
    </>
  );
}
