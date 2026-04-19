import { useRef } from 'react';
import { useMediaList } from '../hooks/useMedia';

const FALLBACK_PHOTOS = [
  { type: 'tall', label: 'Photo 01 · Engagement', cap: 'Đà Lạt · 2024' },
  { type: 'wide', label: 'Photo 02 · Wide', cap: 'Mùa hè đầu tiên' },
  { type: 'sq', label: 'Photo 03 · Square', cap: 'Buổi chiều Sài Gòn' },
  { type: 'tall', label: 'Photo 04 · Portrait', cap: 'Nụ cười' },
  { type: 'wide', label: 'Photo 05 · Wide', cap: 'Hoàng hôn' },
  { type: 'sq', label: 'Photo 06 · Square', cap: 'Tay trong tay' },
  { type: 'tall', label: 'Photo 07 · Portrait', cap: 'Một ngày bình yên' },
];

const TYPE_CYCLE = ['tall', 'wide', 'sq'];

export default function Details({ siteText = {} }) {
  const trackRef = useRef(null);
  const { files, loading } = useMediaList('carousel');

  const scrollBy = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 400, behavior: 'smooth' });
  };

  const hasRemote = files.length > 0;
  const photos = hasRemote
    ? files.map((f, i) => ({
        type: TYPE_CYCLE[i % TYPE_CYCLE.length],
        url: f.url,
        label: f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
        cap: f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
      }))
    : FALLBACK_PHOTOS;

  const heading = siteText.details_heading || 'Cùng nhau đón những hoàng hôn rực rỡ nhất của cuộc đời.';
  // Split heading to wrap italic part if it contains a pattern like "rực rỡ nhất"
  const headingParts = heading.split(/(rực rỡ nhất)/);

  return (
    <section className="details" id="story">
      <div className="details-intro reveal">
        <span className="eyebrow">{siteText.details_eyebrow || 'Save the date · 08.11.2026'}</span>
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
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  loading="lazy"
                />
              ) : (
                <div className="ph" data-label={p.label} style={{ width: '100%', height: '100%' }} />
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
