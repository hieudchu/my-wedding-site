import { useState, useRef, useEffect, useCallback } from 'react';
import { formatDateParts } from '../lib/config';
import { useMediaList } from '../hooks/useMedia';
import { PLACEHOLDERS } from '../lib/placeholders';
import { useLightbox } from './Lightbox';
import MediaImage from './MediaImage';

function SlideImage({ url, cap, onOpen }) {
  const [orient, setOrient] = useState(null);

  const handleLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.target;
    setOrient(naturalHeight > naturalWidth ? 'portrait' : 'landscape');
  };

  return (
    <img
      src={url}
      alt={cap}
      className={`hero-slide-img ${orient || ''}`}
      onLoad={handleLoad}
      onClick={() => onOpen(url, cap)}
      role="button"
      tabIndex={0}
      loading="lazy"
    />
  );
}

export default function Hero({ config, siteText = {}, visible }) {
  const parts = formatDateParts(config.weddingDate);
  const { files, loading } = useMediaList('carousel');
  const openLightbox = useLightbox();
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef(0);
  const sliderRef = useRef(null);

  // Parse captions JSON keyed by filename
  let captionMap = {};
  try { captionMap = JSON.parse(siteText.carousel_captions || '{}'); } catch {}

  const hasRemote = files.length > 0;
  const photos = hasRemote
    ? files.map((f) => ({
        url: f.url,
        cap: captionMap[f.name] || '',
      }))
    : (PLACEHOLDERS.carousel || []).map((p) => ({
        url: p.url || null,
        cap: '',
      }));

  const totalSlides = 1 + photos.length;

  const goTo = useCallback((idx) => {
    setCurrent(((idx % totalSlides) + totalSlides) % totalSlides);
  }, [totalSlides]);

  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [next, prev]);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? next() : prev();
    }
  };

  return (
    <section
      className={`hero hero-slider ${visible ? 'visible' : ''}`}
      id="hero"
      ref={sliderRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slides container */}
      <div
        className="hero-slides"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {/* Slide 0: Title card */}
        <div className="hero-slide hero-slide--title">
          <div className="gate-bg" />
          <div className="hero-content">
            <MediaImage
              storagePath="icons/medallion-gold.png"
              localFallback="/assets/medallion-gold.png"
              label="Medallion"
              alt="H&M medallion"
              className="medallion"
              style={{ width: 200, height: 'auto', objectFit: 'contain' }}
            />
            <h1>
              <span className="initial">{config.groomShort?.[0]}</span>{config.groomShort?.slice(1)}
              <span className="amp">&amp;</span>
              <span className="initial">{config.brideShort?.[0]}</span>{config.brideShort?.slice(1)}
            </h1>
            <div className="ornament" />
            <p className="tagline">
              {siteText.gate_tagline || '"Cùng nhau đón những hoàng hôn rực rỡ nhất của cuộc đời."'}
            </p>
            <div className="date-line">
              {parts.dd} · {parts.mm} · {parts.yyyy}
            </div>
          </div>
        </div>

        {/* Photo slides */}
        {!loading && photos.map((p, i) => (
          <div key={i} className="hero-slide hero-slide--photo">
            {p.url ? (
              <SlideImage url={p.url} cap={p.cap} onOpen={openLightbox} />
            ) : (
              <div
                className="ph"
                data-label={p.cap}
                style={{ width: '100%', height: '100%' }}
              />
            )}
            {p.cap && <span className="hero-slide-cap">{p.cap}</span>}
          </div>
        ))}
      </div>

      {/* Navigation arrows */}
      {visible && totalSlides > 1 && (
        <>
          <button
            className="hero-arrow hero-arrow--left"
            onClick={prev}
            aria-label="Previous"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            className="hero-arrow hero-arrow--right"
            onClick={next}
            aria-label="Next"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Dot indicators */}
          <div className="hero-dots">
            {Array.from({ length: totalSlides }, (_, i) => (
              <button
                key={i}
                className={`hero-dot ${i === current ? 'active' : ''}`}
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
