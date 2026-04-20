import { useRef } from 'react';
import { useMediaList } from '../hooks/useMedia';
import { PLACEHOLDERS } from '../lib/placeholders';
import { formatDateParts } from '../lib/config';
import { useLightbox } from './Lightbox';

const TYPE_CYCLE = ['tall', 'wide', 'sq'];

export default function Details({ config = {}, siteText = {} }) {
  const trackRef = useRef(null);
  const { files, loading } = useMediaList('carousel');
  const openLightbox = useLightbox();

  const scrollBy = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 400, behavior: 'smooth' });
  };

  // Use storage photos if available, otherwise placeholder images
  const hasRemote = files.length > 0;
  const photos = hasRemote
    ? files.map((f, i) => ({
        type: TYPE_CYCLE[i % TYPE_CYCLE.length],
        url: f.url,
        cap: f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
      }))
    : PLACEHOLDERS.carousel;

  const heading = siteText.details_heading || 'Cùng nhau đón những hoàng hôn rực rỡ nhất của cuộc đời.';
  const headingParts = heading.split(/(rực rỡ nhất)/);

  return (
    <section className="details" id="story">
      <div className="details-intro reveal">
        <span className="eyebrow">Save the date · {(() => { const p = formatDateParts(config.weddingDate); return `${p.dd}.${p.mm}.${p.yyyy}`; })()}</span>
        <h2>
          {headingParts.length > 1
            ? headingParts.map((part, i) =>
                part === 'rực rỡ nhất' ? <em key={i}>{part}</em> : part
              )
            : heading}
        </h2>
        <p>
          {siteText.details_paragraph ||
            'Sau bao mùa mưa nắng, hai con tim cuối cùng cũng tìm được cùng một nhịp đập. Chúng em xin trân trọng mời bạn đến chia vui trong ngày trọng đại của chúng em.'}
        </p>
      </div>

      <div className="carousel-wrap reveal d1">
        <div className="carousel" ref={trackRef}>
          {!loading && photos.map((p, i) => (
            <div key={i} className={`card ${p.type}`}>
              {p.url ? (
                <img
                  src={p.url}
                  alt={p.cap}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                  onClick={() => openLightbox(p.url, p.cap)}
                  role="button"
                  tabIndex={0}
                  loading="lazy"
                />
              ) : (
                <div
                  className="ph"
                  data-label={p.label || p.cap}
                  style={{ width: '100%', height: '100%', cursor: 'pointer' }}
                  onClick={() => openLightbox(null, p.label || p.cap)}
                  role="button"
                  tabIndex={0}
                />
              )}
              <span className="cap">{p.cap}</span>
            </div>
          ))}
        </div>
        <div className="carousel-nav">
          <button onClick={() => scrollBy(-1)} aria-label="Previous">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span>Scroll · Vuốt để xem thêm</span>
          <button onClick={() => scrollBy(1)} aria-label="Next">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
