import { useRef } from 'react';
import MediaImage from './MediaImage';
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

// Card type cycle for dynamically loaded photos
const TYPE_CYCLE = ['tall', 'wide', 'sq'];

export default function Details() {
  const trackRef = useRef(null);
  const { files, loading } = useMediaList('carousel');

  const scrollBy = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 400, behavior: 'smooth' });
  };

  // Use storage photos if available, otherwise fall back to placeholders
  const hasRemote = files.length > 0;
  const photos = hasRemote
    ? files.map((f, i) => ({
        type: TYPE_CYCLE[i % TYPE_CYCLE.length],
        url: f.url,
        label: f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
        cap: f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
      }))
    : FALLBACK_PHOTOS;

  return (
    <section className="details" id="story">
      <div className="details-intro reveal">
        <span className="eyebrow">Save the date · 08.11.2026</span>
        <h2>
          Cùng nhau đón những hoàng hôn <em>rực rỡ nhất</em> của cuộc đời.
        </h2>
        <p>
          Sau bao mùa mưa nắng, hai con tim cuối cùng cũng tìm được cùng một nhịp đập.
          Chúng em xin trân trọng mời bạn đến chia vui trong ngày trọng đại của chúng em.
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
