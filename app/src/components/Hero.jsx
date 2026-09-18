import { useState, useEffect, useCallback, useRef } from 'react';
import { formatDateParts } from '../lib/config';
import { useMediaList } from '../hooks/useMedia';
import { useLightbox } from './Lightbox';

/**
 * Hero — carousel 3D kiểu coverflow.
 *
 * Thẻ 0 là thiệp chữ khổ ngang, các thẻ sau là ảnh cưới lấy từ Supabase Storage.
 * Thẻ hai bên lùi về sau theo trục Z và xoay quanh trục Y, tạo chiều sâu.
 * Điều khiển: mũi tên, chấm tròn, kéo chuột, vuốt, phím ←/→.
 *
 * Bề rộng thẻ tính bằng JS chứ không phải CSS, vì phụ thuộc cả bề rộng màn hình
 * lẫn hướng của từng tấm ảnh (ảnh ngang rộng gần hết màn, ảnh dọc hẹp hơn).
 */
export default function Hero({ config, siteText = {}, visible }) {
  const parts = formatDateParts(config.weddingDate);
  const { files } = useMediaList('carousel');
  const openLightbox = useLightbox();

  const [slide, setSlide] = useState(0);
  const [orient, setOrient] = useState({});
  const [vw, setVw] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1280));
  const [dragging, setDragging] = useState(false);
  const [dragX, setDragX] = useState(0);

  const dragStartX = useRef(0);
  const dragged = useRef(0);
  const touchStartX = useRef(0);

  const photos = files;
  const total = 1 + photos.length;

  const go = useCallback(
    (i) => setSlide((prev) => {
      const t = 1 + photos.length;
      return t > 0 ? ((i % t) + t) % t : prev;
    }),
    [photos.length]
  );

  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    const onKey = (e) => {
      // Lightbox đang mở thì nhường phím cho nó
      if (document.querySelector('.lb-overlay')) return;
      if (e.key === 'ArrowRight') go(slide + 1);
      if (e.key === 'ArrowLeft') go(slide - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, slide, go]);

  /** Khoảng cách vòng tròn từ thẻ i tới thẻ đang ở giữa */
  const offset = (i) => {
    const half = total / 2;
    let d = i - slide;
    if (d > half) d -= total;
    if (d < -half) d += total;
    return d;
  };

  const isWide = (i) => i === 0 || orient[i] === 'l';

  const widthOf = (i) =>
    isWide(i)
      ? Math.min(1180, vw - Math.max(150, vw * 0.16))
      : Math.min(420, Math.max(250, vw * 0.32));

  const cardStyle = (i) => {
    const d = offset(i);
    const a = Math.abs(d);
    const far = a > 2;
    const w = widthOf(i);
    const cw = widthOf(slide);
    const x = (d === 0 ? 0 : Math.sign(d) * (cw / 2 + w * 0.31 + (a - 1) * w * 0.5)) + dragX;
    return {
      width: `${Math.round(w)}px`,
      transform: `translate(-50%,-50%) translateX(${Math.round(x)}px) translateZ(${-a * 170}px) rotateY(${-d * 20}deg) scale(${1 - a * 0.04})`,
      opacity: far ? 0 : d === 0 ? 1 : a === 1 ? 0.72 : 0.34,
      zIndex: 20 - a,
      filter: d === 0 ? 'none' : `brightness(${a === 1 ? 0.6 : 0.42}) saturate(.8)`,
      pointerEvents: far ? 'none' : 'auto',
      cursor: d === 0 ? 'zoom-in' : 'pointer',
    };
  };

  const onImgLoad = (i) => (e) => {
    const o = e.target.naturalWidth > e.target.naturalHeight ? 'l' : 'p';
    setOrient((prev) => (prev[i] === o ? prev : { ...prev, [i]: o }));
  };

  const onDragStart = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragStartX.current = e.clientX;
    dragged.current = 0;
    setDragging(true);
  };

  const onDragMove = (e) => {
    if (!dragging) return;
    dragged.current = e.clientX - dragStartX.current;
    setDragX(Math.max(-140, Math.min(140, dragged.current * 0.45)));
  };

  const onDragEnd = () => {
    if (!dragging) return;
    setDragging(false);
    setDragX(0);
    const d = dragged.current;
    if (Math.abs(d) > 45) go(slide + (d < 0 ? 1 : -1));
  };

  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) go(slide + (diff > 0 ? 1 : -1));
  };

  // Kéo quá 8px thì coi là vuốt, không tính là click
  const wasDrag = () => Math.abs(dragged.current) > 8;

  const bgSrc = photos.length
    ? (slide === 0 ? photos[photos.length - 1].url : photos[slide - 1].url)
    : null;

  const titleStyle = cardStyle(0);

  return (
    <section
      className="hero"
      id="hero"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {bgSrc && <img className="hero-bg" src={bgSrc} alt="" aria-hidden="true" />}
      <div className="hero-veil" />

      <div
        className={`hero-stage ${visible ? 'ready' : ''} ${dragging ? 'dragging' : ''}`}
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
        onPointerLeave={onDragEnd}
      >
        {/* Thẻ 0 — thiệp chữ */}
        <div
          className="hero-card"
          style={{ ...titleStyle, cursor: slide === 0 ? 'default' : 'pointer' }}
          onClick={() => { if (!wasDrag() && slide !== 0) go(0); }}
        >
          <div className="hero-card-inner hero-title-card">
            <div className="frame" />
            <div className="hero-title-body">
              <div className="hero-kicker">
                <span className="rule" />
                <span className="txt">{siteText.hero_kicker || 'Thiệp cưới'}</span>
                <span className="rule" />
              </div>
              <h1 className="hero-names">
                <span className="initial">{config.groomShort?.[0]}</span>
                {config.groomShort?.slice(1)} <em>&amp;</em>{' '}
                <span className="initial">{config.brideShort?.[0]}</span>
                {config.brideShort?.slice(1)}
              </h1>
              <p className="hero-tagline">
                {siteText.gate_tagline || '“Cùng nhau đón những hoàng hôn rực rỡ nhất của cuộc đời.”'}
              </p>
              <div className="hero-meta">
                <span>{parts.dd} · {parts.mm} · {parts.yyyy}</span>
                <span className="dash">—</span>
                <span>{config.weddingTime}</span>
                <span className="dash">—</span>
                <span>{config.venueName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Các thẻ ảnh */}
        {photos.map((p, k) => {
          const i = k + 1;
          return (
            <div
              key={p.name || i}
              className="hero-card"
              style={cardStyle(i)}
              onClick={() => {
                if (wasDrag()) return;
                if (i === slide) openLightbox(p.url, p.name);
                else go(i);
              }}
            >
              <div className="hero-card-inner">
                <img src={p.url} alt="Ảnh cưới Hiếu và Minh" onLoad={onImgLoad(i)} />
                <div className="fade" />
              </div>
            </div>
          );
        })}
      </div>

      {total > 1 && (
        <>
          <button className="hero-arrow hero-arrow--left" onClick={() => go(slide - 1)} aria-label="Ảnh trước">‹</button>
          <button className="hero-arrow hero-arrow--right" onClick={() => go(slide + 1)} aria-label="Ảnh sau">›</button>

          <div className="hero-dots">
            {Array.from({ length: total }, (_, i) => (
              <button
                key={i}
                className={`hero-dot ${i === slide ? 'active' : ''}`}
                onClick={() => go(i)}
                aria-label={`Chuyển tới ảnh ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
