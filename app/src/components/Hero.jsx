import { useState, useEffect, useCallback, useRef } from 'react';
import { formatDateParts } from '../lib/config';
import { useMediaList } from '../hooks/useMedia';
import { useViewport, PHONE_MAX, TABLET_MAX } from '../hooks/useViewport';
import { useLightbox } from './Lightbox';

/**
 * Hero — carousel 3D kiểu coverflow.
 *
 * Thẻ 0 là thiệp chữ, các thẻ sau là ảnh cưới lấy từ Supabase Storage.
 *
 * Khổ thẻ tính bằng JS chứ không phải CSS, vì phụ thuộc ba thứ cùng lúc: bề ngang
 * màn hình, chiều cao màn hình, và hướng của từng tấm ảnh. Thẻ luôn giữ đúng tỉ lệ
 * ảnh (dọc 3:4, ngang 3:2) và co lại nếu cao hơn sân khấu — nhờ vậy điện thoại
 * quay ngang vẫn thấy trọn thẻ, không bị cắt cụt.
 *
 * Trên điện thoại chuyển sang chế độ một-thẻ-một-lần: bỏ nghiêng 3D, thẻ kề chỉ
 * ló ra một chút, thẻ xa ẩn hẳn.
 */
export default function Hero({ config, siteText = {}, visible }) {
  const parts = formatDateParts(config.weddingDate);
  const { files } = useMediaList('carousel');
  const openLightbox = useLightbox();
  const { vw, vh } = useViewport();

  const [slide, setSlide] = useState(0);
  const [orient, setOrient] = useState({});
  const [dragging, setDragging] = useState(false);
  const stageRef = useRef(null);
  // Chỉ nạp ảnh của những thẻ nằm trong tầm nhìn (|d| ≤ 2, đúng tập thẻ mà
  // thiết kế cho hiện). Ảnh đã nạp thì giữ luôn, khỏi tải lại khi lật qua lại.
  const [mounted, setMounted] = useState(() => new Set());

  const dragStartX = useRef(0);
  const dragged = useRef(0);
  const touchStartX = useRef(0);

  const photos = files;
  const total = 1 + photos.length;
  const phone = vw < PHONE_MAX;
  const tablet = !phone && vw < TABLET_MAX;

  // Bản kê đã biết kích thước từ lúc upload — dùng ngay, khỏi đợi ảnh tải xong.
  // Thiếu số đo thì `w`/`h` là 0 (bản kê không đo được) hoặc undefined (đang đọc
  // thẳng từ storage, chưa có bản kê); cả hai đều coi như chưa biết và nhường cho
  // `onImgLoad`. Tuyệt đối không suy hướng từ số 0, kẻo thẻ nào cũng hoá ảnh ngang.
  // Trộn kiểu `{ ...known, ...prev }` để giá trị `onImgLoad` đo được (nếu đã có)
  // đè lên bản kê, nhờ vậy thẻ không đổi khổ hai lần.
  useEffect(() => {
    const known = {};
    photos.forEach((p, k) => {
      if (p.w && p.h) known[k + 1] = p.w > p.h ? 'l' : 'p';
    });
    if (Object.keys(known).length) setOrient((prev) => ({ ...known, ...prev }));
  }, [photos]);

  const go = useCallback(
    (i) => setSlide((prev) => {
      const t = 1 + photos.length;
      return t > 0 ? ((i % t) + t) % t : prev;
    }),
    [photos.length]
  );

  useEffect(() => {
    if (!visible) return undefined;
    const onKey = (e) => {
      if (document.querySelector('.lb-overlay')) return; // lightbox đang mở thì nhường phím
      if (e.key === 'ArrowRight') go(slide + 1);
      if (e.key === 'ArrowLeft') go(slide - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, slide, go]);

  // Mở rộng dần tập ảnh cần nạp mỗi khi khách lật sang thẻ khác.
  // Điện thoại chỉ giữ thẻ kề (|d| ≤ 1) vì ảnh gốc 24 megapixel ngốn khoảng
  // 92 MB bộ nhớ mỗi tấm sau khi giải nén — giữ ít tấm là giữ máy không nghẹt.
  useEffect(() => {
    const t = 1 + photos.length;
    if (t <= 1) return;
    const reach = phone ? 1 : 2;
    setMounted((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (let i = 1; i < t; i += 1) {
        let d = i - slide;
        if (d > t / 2) d -= t;
        if (d < -t / 2) d += t;
        if (Math.abs(d) <= reach && !next.has(i)) {
          next.add(i);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [slide, photos.length, phone]);

  /** Chiều cao sân khấu — chừa chỗ cho Nav phía trên và hàng chấm phía dưới */
  const stageH = Math.min(Math.max(vh * 0.62, 220), Math.max(vh - 150, 200), 760);

  /** Khổ thẻ i, giữ đúng tỉ lệ ảnh và không bao giờ cao hơn sân khấu */
  const boxOf = (i) => {
    if (i === 0) {
      const w = phone ? vw * 0.84 : Math.min(1180, vw - Math.max(150, vw * 0.16));
      return { w, h: phone ? Math.min(stageH, w * 1.34) : stageH };
    }

    if (orient[i] === 'l') {
      // Ảnh ngang → thẻ 3:2
      let w = phone ? vw * 0.86 : Math.min(1080, vw - Math.max(150, vw * 0.18));
      let h = w / 1.5;
      if (h > stageH) { h = stageH; w = stageH * 1.5; }
      return { w, h };
    }

    // Ảnh dọc → thẻ 3:4
    let w = phone ? vw * 0.72 : tablet ? Math.min(460, vw * 0.42) : Math.min(420, Math.max(250, vw * 0.32));
    let h = w * 1.34;
    if (h > stageH) { h = stageH; w = stageH / 1.34; }
    return { w, h };
  };

  /** Khoảng cách vòng tròn từ thẻ i tới thẻ đang ở giữa */
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
    const step = phone
      ? cw / 2 + box.w * 0.46 + (a - 1) * box.w * 0.62
      : cw / 2 + box.w * 0.31 + (a - 1) * box.w * 0.5;
    const x = d === 0 ? 0 : Math.sign(d) * step;

    return {
      width: `${Math.round(box.w)}px`,
      height: `${Math.round(box.h)}px`,
      // Độ lệch khi kéo nằm trong biến CSS --drag, do trình duyệt cộng vào lúc
      // dựng hình. Nhờ vậy mỗi lần ngón tay nhúc nhích chỉ ghi một thuộc tính
      // trên một phần tử, thay vì bắt React dựng lại cả 8 thẻ.
      transform: `translate(-50%,-50%) translateX(${Math.round(x)}px) translateX(var(--drag, 0px)) translateZ(${-a * (phone ? 90 : 170)}px) rotateY(${phone ? 0 : -d * 20}deg) scale(${1 - a * (phone ? 0.07 : 0.04)})`,
      opacity: far ? 0 : d === 0 ? 1 : a === 1 ? (phone ? 0.3 : 0.72) : phone ? 0 : 0.34,
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
    setDragging(true);
  };

  const onDragMove = (e) => {
    if (!dragging) return;
    dragged.current = e.clientX - dragStartX.current;
    setDrag(Math.round(Math.max(-140, Math.min(140, dragged.current * 0.45))));
  };

  const onDragEnd = () => {
    if (!dragging) return;
    setDragging(false);
    setDrag(0);
    const d = dragged.current;
    if (Math.abs(d) > 45) go(slide + (d < 0 ? 1 : -1));
  };

  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) go(slide + (diff > 0 ? 1 : -1));
  };

  // Kéo quá 8px thì coi là vuốt, không tính là bấm
  const wasDrag = () => Math.abs(dragged.current) > 8;

  const bgSrc = photos.length
    ? (slide === 0 ? photos[photos.length - 1].url : photos[slide - 1].url)
    : null;

  return (
    <section className="hero" id="hero" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
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
                // Chú thích chưa hiện ra thành chữ ở đâu cả, nhưng nó là lời tả
                // ảnh do chủ nhà viết — đưa vào đây thì ít ra trình đọc màn hình
                // đọc được, thay cho cái tên file vô nghĩa.
                if (i === slide) openLightbox(p.url, p.caption || p.name);
                else go(i);
              }}
            >
              <div className="hero-card-inner">
                {mounted.has(i) && (
                  <img
                    src={p.url}
                    alt="Ảnh cưới Hiếu và Minh"
                    onLoad={onImgLoad(i)}
                    decoding="async"
                    fetchPriority={i === slide ? 'high' : 'low'}
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
          {/* Mũi tên tự ẩn trên thiết bị cảm ứng (media query trong sections.css) */}
          <button className="hero-arrow hero-arrow--left" onClick={() => go(slide - 1)} aria-label="Ảnh trước">‹</button>
          <button className="hero-arrow hero-arrow--right" onClick={() => go(slide + 1)} aria-label="Ảnh sau">›</button>

          <div className="hero-swipe-hint" aria-hidden="true">Vuốt để xem ảnh</div>

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
