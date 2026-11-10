import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useCountdown } from '../hooks/useCountdown';
import MediaImage from './MediaImage';

// Nét bút uốn lượn cho DESKTOP — chạy dọc hành lang giữa hai cột, tự vẽ khi cuộn.
// Điện thoại ẩn nó đi và dùng <TimelineWave> (SỬA 18).
const SILK_PATH =
  'M50 0 C57 70 60 130 50 200 C40 270 40 322 52 392 C62 452 60 502 46 546 ' +
  'C38 573 36 601 46 605 C55 609 54 577 45 579 C36 581 40 642 50 700 ' +
  'C60 760 62 812 50 872 C42 922 46 962 50 1000';

// Lịch trình thật nằm trong bảng `timeline_events`. Đây chỉ là bản dự phòng khi
// chưa lấy được dữ liệu — phải khớp với DB (17:30 · 18:00 · 19:00 · 19:30).
const FALLBACK_ITEMS = [
  { time: '17:30', label_vi: 'Chụp ảnh gia đình', label_en: 'Family photo session', image_path: '' },
  { time: '18:00', label_vi: 'Đón khách', label_en: 'Guest welcome', image_path: '' },
  { time: '19:00', label_vi: 'Bắt đầu buổi lễ', label_en: 'Ceremony begins', image_path: '' },
  { time: '19:30', label_vi: 'Khai tiệc', label_en: 'Reception', image_path: '' },
];

/* Nét SVG tạm, dùng khi chưa có minh hoạ thật cho mốc đó */
const TL_ICON_PATHS = [
  // Chụp ảnh
  ['M4 8.5h3.2l1.6-2.5h6.4l1.6 2.5H20a1 1 0 011 1V18a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5a1 1 0 011-1z', 'M12 16.6a3.4 3.4 0 100-6.8 3.4 3.4 0 000 6.8z', 'M17.6 11h.01'],
  // Đón khách — hai ly
  ['M3.5 4h6c0 3.2-1.3 5.2-3 5.2S3.5 7.2 3.5 4z', 'M6.5 9.2V18M4.4 18h4.2', 'M14.5 4h6c0 3.2-1.3 5.2-3 5.2s-3-2-3-5.2z', 'M17.5 9.2V18M15.4 18h4.2', 'M12 2.2v2M10.6 3.2h2.8'],
  // Bắt đầu lễ — nhẫn
  ['M9.2 20.5a5 5 0 100-10 5 5 0 000 10z', 'M14.8 20.5a5 5 0 100-10 5 5 0 000 10z', 'M9.2 10.5L7.4 8.2l1-1.8h1.6l1 1.8z'],
  // Khai tiệc — đĩa, dao, dĩa
  ['M12 18.4a6.4 6.4 0 100-12.8 6.4 6.4 0 000 12.8z', 'M12 15.6a3.6 3.6 0 100-7.2 3.6 3.6 0 000 7.2z', 'M2.6 4v3.4a1.2 1.2 0 002.4 0V4M3.8 4v16', 'M21.4 4c-1.3 1-1.7 4-1.7 7.2h1.7V20'],
];

// Minh hoạ thật (PNG đã tô #4A000B, nền trong) — ưu tiên hơn nét SVG tạm
const TL_ICON_IMAGES = {
  0: '/assets/icons/timeline-camera-flowers-v2.png',
  1: '/assets/icons/timeline-glasses.png',
  2: '/assets/icons/timeline-rings.png',
  3: '/assets/icons/timeline-dinner.png?v=2',
};

function TlIcon({ i }) {
  const k = i % TL_ICON_PATHS.length;
  const src = TL_ICON_IMAGES[k];
  if (src) return <img className={`tlw-icon tlw-icon-img tlw-icon-${k}`} src={src} alt="" aria-hidden="true" />;
  return (
    <svg className="tlw-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {TL_ICON_PATHS[k].map((d, n) => <path key={n} d={d} />)}
    </svg>
  );
}

/** Đường chỉ: mỗi mốc chiếm 100 đơn vị dọc; chỗ cong ra nằm giữa hàng, đối diện mốc. */
function wavePath(n) {
  const x = (i) => (i % 2 === 0 ? 88 : 12);
  let d = `M 64 0 C 64 25, ${x(0)} 20, ${x(0)} 50`; // đầu chỉ lệch phải để không cắt icon mốc 1
  for (let i = 1; i < n; i += 1) {
    const y0 = (i - 1) * 100 + 50;
    const y1 = i * 100 + 50;
    d += ` C ${x(i - 1)} ${y0 + 50}, ${x(i)} ${y1 - 50}, ${x(i)} ${y1}`;
  }
  const yl = (n - 1) * 100 + 50;
  d += ` C ${x(n - 1)} ${yl + 40}, 40 ${n * 100 - 10}, 50 ${n * 100}`; // đuôi dừng giữa, không cắt chữ mốc cuối
  return d;
}

/**
 * Trục lịch trình cho ĐIỆN THOẠI — một sợi chỉ uốn lượn, mỗi mốc là icon + tên +
 * giờ, so le trái/phải đối diện chỗ chỉ cong ra. CSS ẩn khối này ở desktop.
 *
 * SỬA 18 — thay nét bút lụa, vốn bị nén méo 3,9 lần khi khung thu còn 48px.
 */
function TimelineWave({ items }) {
  const n = items.length;
  if (!n) return null;
  return (
    <div className="tlw" style={{ '--n': n }}>
      <svg className="tlw-line" viewBox={`0 0 100 ${n * 100}`} preserveAspectRatio="none" aria-hidden="true">
        <path d={wavePath(n)} fill="none" stroke="currentColor" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
      </svg>
      {items.map((it, i) => (
        <div key={it.id || i} className={`tlw-item ${i % 2 ? 'r' : 'l'}`} style={{ '--i': i }} data-rv>
          <TlIcon i={i} />
          <div className="tlw-label">{it.label_vi}</div>
          {it.label_en && <div className="tlw-en">{it.label_en}</div>}
          <div className="tlw-time">{it.time}</div>
        </div>
      ))}
    </div>
  );
}

/**
 * Lịch trình trong ngày + đồng hồ đếm ngược.
 *
 * Hai cách trình bày cùng tồn tại, CSS chọn một: `.tlw` cho điện thoại,
 * `.tl-track` cho desktop.
 */
export default function Timeline({ config, siteText = {} }) {
  const cd = useCountdown(config.weddingDate, config.weddingTime);
  const [items, setItems] = useState(FALLBACK_ITEMS);

  useEffect(() => {
    supabase
      .from('timeline_events')
      .select('*')
      .order('sort_order')
      .then(({ data }) => {
        if (data && data.length > 0) setItems(data);
      })
      .catch(() => {});
  }, []);

  const heading = siteText.timeline_heading || 'Một ngày trọn vẹn';
  const headingParts = heading.split(/(trọn vẹn)/);

  return (
    <section className="timeline" id="timeline">
      <div className="tl-head rv" data-rv>
        <span className="eyebrow">{siteText.timeline_eyebrow || 'Lịch trình'}</span>
        <h2>
          {headingParts.length > 1
            ? headingParts.map((p, i) => (p === 'trọn vẹn' ? <em key={i}>{p}</em> : p))
            : heading}
        </h2>
      </div>

      {/* Điện thoại */}
      <TimelineWave items={items} />

      {/* Desktop */}
      <div className="tl-track">
        <div className="tl-silk" data-rv>
          <svg viewBox="0 0 100 1000" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="silk" x1="0" y1="0" x2="0.3" y2="1">
                <stop offset="0" stopColor="#8E1719" />
                <stop offset="0.55" stopColor="#8A2A20" />
                <stop offset="1" stopColor="#A8803C" />
              </linearGradient>
            </defs>
            <path
              d={SILK_PATH}
              fill="none"
              stroke="url(#silk)"
              strokeWidth="2.2"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              opacity="0.85"
            />
          </svg>
        </div>

        <div className="tl-rows">
          {items.map((it, i) => {
            const alt = i % 2 === 1;

            const text = (
              <div className="tl-text" key="text">
                <div className="tl-time">{it.time}</div>
                <div className="tl-label">{it.label_vi}</div>
                {it.label_en && <div className="tl-en">{it.label_en}</div>}
              </div>
            );

            const image = (
              <div className="tl-img" key="img">
                <MediaImage
                  storagePath={it.image_path}
                  label={`Ảnh ${it.time} · chờ ảnh thật`}
                  alt={it.label_vi}
                />
              </div>
            );

            // Desktop so le bằng thứ tự DOM. Điện thoại dùng `order` trong CSS
            // để chữ luôn đứng trước ảnh, không cần column-reverse.
            return (
              <div key={it.id || i} className={`tl-row ${alt ? 'alt' : ''}`} data-rv>
                {alt ? [image, text] : [text, image]}
              </div>
            );
          })}
        </div>
      </div>

      <div className="countdown rv" data-rv>
        <div className="countdown-photo">
          <MediaImage
            storagePath="background/moment-2.jpg"
            label="Hiếu và Minh"
            alt="Hiếu và Minh"
            sizes="(max-width: 860px) 100vw, 820px"
          />
        </div>
        <div className="countdown-card">
          <div className="lbl">
            {siteText.timeline_countdown_label || 'Cùng đếm ngược đến ngày vui'}
          </div>
          <div className="countdown-grid">
            <div className="cd-unit"><span className="n">{cd.d}</span><span className="u">Ngày</span></div>
            <span className="cd-sep">:</span>
            <div className="cd-unit"><span className="n">{cd.h}</span><span className="u">Giờ</span></div>
            <span className="cd-sep">:</span>
            <div className="cd-unit"><span className="n">{cd.m}</span><span className="u">Phút</span></div>
            <span className="cd-sep">:</span>
            <div className="cd-unit sec"><span className="n">{cd.s}</span><span className="u">Giây</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}
