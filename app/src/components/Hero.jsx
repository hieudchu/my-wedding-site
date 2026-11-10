import { useState, useEffect, useCallback, useRef } from 'react';
import { formatDateParts } from '../lib/config';
import { useMediaList } from '../hooks/useMedia';
import { useViewport, TABLET_MAX } from '../hooks/useViewport';
import { useLightbox } from './Lightbox';
import ScriptName from './ScriptName';
import Tagline from './Tagline';

const pad2 = (n) => String(n).padStart(2, '0');

/**
 * Hai cách trình bày, chọn theo `PHONE_QUERY`:
 *   PhoneHero — điện thoại và tablet: thiên trượt toàn khung, một thẻ một lần,
 *               vuốt bằng cuộn ngang gốc của trình duyệt (scroll-snap).
 *   StageHero — desktop: coverflow 3D như cũ, đã sửa các lỗi dùng chung.
 */
export default function Hero(props) {
  const { isPhone, vw, vh } = useViewport();
  return isPhone ? <PhoneHero {...props} /> : <StageHero {...props} vw={vw} vh={vh} />;
}

/*
 * PhoneHero — SỬA 1, 2, 3, 8, 12, 13.
 * Không còn JS xử lý vuốt: dùng `scroll-snap` + `scroll-snap-stop: always` của
 * trình duyệt, nên không thể nhảy hai ảnh một lần nữa. Khổ thẻ tính bằng CSS
 * (`svh`), không đọc `innerHeight`, nên thanh địa chỉ iOS co giãn không làm thẻ
 * đổi khổ. Chỉ gắn `<img>` cho thẻ đang xem và hai thẻ kề.
 */
function PhoneHero({ config, siteText = {}, visible }) {
  const parts = formatDateParts(config.weddingDate);
  const { files: photos } = useMediaList('carousel');
  const total = 1 + photos.length;
  const openLightbox = useLightbox();

  const trackRef = useRef(null);
  const slideRef = useRef(0);
  const [slide, setSlide] = useState(0);
  slideRef.current = slide;

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return undefined;
    let raf = 0;
    let width = el.clientWidth;

    const sync = () => {
      raf = 0;
      if (!el.clientWidth) return;
      const i = Math.max(0, Math.min(total - 1, Math.round(el.scrollLeft / el.clientWidth)));
      setSlide((s) => (s === i ? s : i));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(sync); };

    // Xoay máy: bề ngang đổi → đặt lại scrollLeft để vẫn đứng đúng thẻ đang xem
    const onResize = () => {
      if (el.clientWidth === width) return;
      width = el.clientWidth;
      el.scrollLeft = slideRef.current * width;
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
    if (ro) ro.observe(el); else window.addEventListener('resize', onResize);
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (ro) ro.disconnect(); else window.removeEventListener('resize', onResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [total]);

  const go = (i) => {
    const el = trackRef.current;
    if (!el) return;
    const t = Math.max(0, Math.min(total - 1, i));
    el.scrollTo({ left: t * el.clientWidth, behavior: 'smooth' });
  };

  return (
    <section className="hero hero--phone" id="hero" aria-roledescription="carousel" aria-label="Ảnh cưới">
      <div ref={trackRef} className={`hm-track ${visible ? 'ready' : ''}`}>
        {/* Thẻ 0 — thiệp chữ */}
        <div className="hm-slide">
          <div className="hm-card hero-title-card hm-title">
            <div className="frame" />
            <div className="hero-title-body">
              <div className="hero-kicker">
                <span className="rule" />
                <span className="txt">{siteText.hero_kicker || 'Thiệp cưới'}</span>
                <span className="rule" />
              </div>
              <h1 className="hero-names hm-names">
                <ScriptName full={siteText.couple_groom_full} short={config.groomShort} />
                <em>&amp;</em>
                <ScriptName full={siteText.couple_bride_full} short={config.brideShort} />
              </h1>
              <p className="hero-tagline">
                <Tagline text={siteText.gate_tagline} />
              </p>
              <div className="hero-meta hm-meta">
                <span>{parts.dd} · {parts.mm} · {parts.yyyy}</span>
                <span>{config.weddingTime} — {siteText.hero_venue || config.venueName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Thẻ ảnh — SỬA 12: chỉ gắn <img> cho thẻ đang xem và hai thẻ kề */}
        {photos.map((p, k) => {
          const i = k + 1;
          const near = Math.abs(i - slide) <= 1;
          return (
            <div className="hm-slide" key={p.name || i}>
              <button
                type="button"
                className="hm-card hm-photo"
                onClick={() => openLightbox(p.full || p.url, p.caption || p.name)}
                aria-label={`Phóng to ảnh ${i} trên ${photos.length}`}
              >
                {near && (
                  <img
                    src={p.url}
                    srcSet={p.srcSet}
                    sizes={p.srcSet ? '(orientation: landscape) 40vw, 92vw' : undefined}
                    alt="Ảnh cưới Hiếu và Minh"
                    decoding="async"
                    fetchpriority={i === slide ? 'high' : 'low'}
                  />
                )}
              </button>
            </div>
          );
        })}
      </div>

      {total > 1 && (
        <div className="hm-bar">
          <button className="hm-btn" onClick={() => go(slide - 1)} disabled={slide === 0} aria-label="Ảnh trước">‹</button>
          <div className="hm-count" aria-live="polite">
            <span><b>{pad2(slide + 1)}</b> / {pad2(total)}</span>
            <span className="hm-progress" aria-hidden="true">
              <i style={{ transform: `scaleX(${(slide + 1) / total})` }} />
            </span>
            <span className={`hm-hint ${slide === 0 ? '' : 'off'}`} aria-hidden="true">Vuốt để xem ảnh</span>
          </div>
          <button className="hm-btn" onClick={() => go(slide + 1)} disabled={slide === total - 1} aria-label="Ảnh sau">›</button>
        </div>
      )}
    </section>
  );
}

/*
 * StageHero — coverflow 3D cho desktop. Diện mạo giữ nguyên.
 * Chỉ sửa mã dùng chung thuộc danh sách mức 2 trong DESIGN-BRIEF.md:
 *   SỬA 1  Gỡ cặp touch handler trên <section> (B). Chỉ còn pointer events (A).
 *          Sau đó mới đổi sang bước tương đối `step()` cộng dồn từ `prev`.
 *          Cờ kéo nằm trong ref để pointerup + pointerleave cùng lượt không bước 2 lần.
 *   SỬA 4  Chấm có vùng chạm 44×44px, hình 8px giữ nguyên (xem .hero-dot trong CSS).
 *   SỬA 8  will-change chỉ bật khi đang kéo (CSS).
 * Nhánh `phone` cũ đã xoá vì StageHero không còn chạy trên điện thoại.
 */
function StageHero({ config, siteText = {}, visible, vw, vh }) {
  const parts = formatDateParts(config.weddingDate);
  const { files: photos } = useMediaList('carousel');
  const openLightbox = useLightbox();

  const [slide, setSlide] = useState(0);
  const [orient, setOrient] = useState({});
  const [dragging, setDragging] = useState(false);
  const stageRef = useRef(null);
  const [mounted, setMounted] = useState(() => new Set());

  const dragStartX = useRef(0);
  const dragged = useRef(0);
  const dragActive = useRef(false);

  const total = 1 + photos.length;
  const tablet = vw < TABLET_MAX;

  // Bản kê đã biết kích thước từ lúc upload — dùng ngay, khỏi đợi ảnh tải xong.
  useEffect(() => {
    const known = {};
    photos.forEach((p, k) => {
      if (p.w && p.h) known[k + 1] = p.w > p.h ? 'l' : 'p';
    });
    if (Object.keys(known).length) setOrient((prev) => ({ ...known, ...prev }));
  }, [photos]);

  const wrap = useCallback((i) => ((i % total) + total) % total, [total]);
  const go = useCallback((i) => setSlide(wrap(i)), [wrap]);
  const step = useCallback((delta) => setSlide((prev) => wrap(prev + delta)), [wrap]);

  useEffect(() => {
    if (!visible) return undefined;
    const onKey = (e) => {
      if (document.querySelector('.lb-overlay')) return; // lightbox đang mở thì nhường phím
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, step]);

  useEffect(() => {
    if (total <= 1) return;
    const reach = 2;
    setMounted((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (let i = 1; i < total; i += 1) {
        let d = i - slide;
        if (d > total / 2) d -= total;
        if (d < -total / 2) d += total;
        if (Math.abs(d) <= reach && !next.has(i)) { next.add(i); changed = true; }
      }
      return changed ? next : prev;
    });
  }, [slide, total]);

  const stageH = Math.min(Math.max(vh * 0.62, 220), Math.max(vh - 150, 200), 760);

  const boxOf = (i) => {
    if (i === 0) {
      const w = Math.min(1180, vw - Math.max(150, vw * 0.16));
      return { w, h: stageH };
    }
    if (orient[i] === 'l') {
      let w = Math.min(1080, vw - Math.max(150, vw * 0.18));
      let h = w / 1.5;
      if (h > stageH) { h = stageH; w = stageH * 1.5; }
      return { w, h };
    }
    let w = tablet ? Math.min(460, vw * 0.42) : Math.min(420, Math.max(250, vw * 0.32));
    let h = w * 1.34;
    if (h > stageH) { h = stageH; w = stageH / 1.34; }
    return { w, h };
  };

  const offset = (i) => {
    const half = total / 2;
    let d = i - slide;
    if (d > half) d -= total;
    if (d < -half) d += total;
    return d;
  };

  const cardStyle = (i) => {
    const d = offset(i);
    const a = Math.abs(d);
    const far = a > 2;
    const box = boxOf(i);
    const cw = boxOf(slide).w;
    const stepX = cw / 2 + box.w * 0.31 + (a - 1) * box.w * 0.5;
    const x = d === 0 ? 0 : Math.sign(d) * stepX;

    return {
      width: `${Math.round(box.w)}px`,
      height: `${Math.round(box.h)}px`,
      transform: `translate(-50%,-50%) translateX(${Math.round(x)}px) translateX(var(--drag, 0px)) translateZ(${-a * 170}px) rotateY(${-d * 20}deg) scale(${1 - a * 0.04})`,
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

  const setDrag = (px) => stageRef.current?.style.setProperty('--drag', `${px}px`);

  const onDragStart = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragStartX.current = e.clientX;
    dragged.current = 0;
    dragActive.current = true;
    setDragging(true);
  };

  const onDragMove = (e) => {
    if (!dragActive.current) return;
    dragged.current = e.clientX - dragStartX.current;
    setDrag(Math.round(Math.max(-140, Math.min(140, dragged.current * 0.45))));
  };

  const onDragEnd = () => {
    if (!dragActive.current) return;
    dragActive.current = false;
    setDragging(false);
    setDrag(0);
    const d = dragged.current;
    if (Math.abs(d) > 45) step(d < 0 ? 1 : -1);
  };

  // Kéo quá 8px thì coi là vuốt, không tính là bấm
  const wasDrag = () => Math.abs(dragged.current) > 8;

  const bgSrc = photos.length
    // Nền bị làm mờ 18–38px — bản nhỏ nhất là quá đủ, không ai phân biệt được
    ? (slide === 0 ? photos[photos.length - 1] : photos[slide - 1]).small
      || (slide === 0 ? photos[photos.length - 1] : photos[slide - 1]).url
    : null;

  return (
    <section className="hero" id="hero">
      {bgSrc && <img className="hero-bg" src={bgSrc} alt="" aria-hidden="true" />}
      <div className="hero-veil" />

      <div
        ref={stageRef}
        className={`hero-stage ${visible ? 'ready' : ''} ${dragging ? 'dragging' : ''}`}
        style={{ height: `${Math.round(stageH)}px` }}
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
        onPointerLeave={onDragEnd}
      >
        {/* Thẻ 0 — thiệp chữ */}
        <div
          className="hero-card"
          style={{ ...cardStyle(0), cursor: slide === 0 ? 'default' : 'pointer' }}
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
              {/* Tên viết TAN Whistling như thẻ thiệp điện thoại (ScriptName lo dấu "ế") */}
              <h1 className="hero-names hero-names--script">
                <ScriptName full={siteText.couple_groom_full} short={config.groomShort} />
                <em>&amp;</em>
                <ScriptName full={siteText.couple_bride_full} short={config.brideShort} />
              </h1>
              <p className="hero-tagline">
                <Tagline text={siteText.gate_tagline} />
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
                if (i === slide) openLightbox(p.full || p.url, p.caption || p.name);
                else go(i);
              }}
            >
              <div className="hero-card-inner">
                {mounted.has(i) && (
                  <img
                    src={p.url}
                    srcSet={p.srcSet}
                    sizes={p.srcSet ? '(max-width: 1080px) 42vw, 420px' : undefined}
                    alt="Ảnh cưới Hiếu và Minh"
                    onLoad={onImgLoad(i)}
                    decoding="async"
                    fetchpriority={i === slide ? 'high' : 'low'}
                  />
                )}
                <div className="fade" />
              </div>
            </div>
          );
        })}
      </div>

      {total > 1 && (
        <>
          <button className="hero-arrow hero-arrow--left" onClick={() => step(-1)} aria-label="Ảnh trước">‹</button>
          <button className="hero-arrow hero-arrow--right" onClick={() => step(1)} aria-label="Ảnh sau">›</button>

          <div className="hero-swipe-hint" aria-hidden="true">Vuốt để xem ảnh</div>

          {/* SỬA 4 — .hero-dot là vùng chạm 44×44 trong suốt; <i> là chấm 8px nhìn thấy */}
          <div className="hero-dots">
            {Array.from({ length: total }, (_, i) => (
              <button
                key={i}
                className={`hero-dot ${i === slide ? 'active' : ''}`}
                onClick={() => go(i)}
                aria-label={`Chuyển tới ảnh ${i + 1}`}
              >
                <i />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
