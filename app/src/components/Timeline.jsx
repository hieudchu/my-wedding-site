import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useCountdown } from '../hooks/useCountdown';
import MediaImage from './MediaImage';

// Nét bút uốn lượn chạy dọc hành lang giữa hai cột, tự vẽ khi cuộn tới.
const SILK_PATH =
  'M50 0 C57 70 60 130 50 200 C40 270 40 322 52 392 C62 452 60 502 46 546 ' +
  'C38 573 36 601 46 605 C55 609 54 577 45 579 C36 581 40 642 50 700 ' +
  'C60 760 62 812 50 872 C42 922 46 962 50 1000';

const FALLBACK_ITEMS = [
  { time: '14:30', label_vi: 'Chụp ảnh gia đình', label_en: 'Family photo session', image_path: '' },
  { time: '15:00', label_vi: 'Đón khách', label_en: 'Guest welcome', image_path: '' },
  { time: '16:30', label_vi: 'Bắt đầu buổi lễ', label_en: 'Ceremony begins', image_path: '' },
  { time: '17:00', label_vi: 'Trao nhẫn', label_en: 'Ring exchange', image_path: '' },
  { time: '18:00', label_vi: 'Khai tiệc', label_en: 'Reception', image_path: '' },
];

/**
 * Lịch trình trong ngày + đồng hồ đếm ngược.
 *
 * Năm mốc xếp so le hai bên, chừa hành lang giữa cho nét bút lụa uốn lượn —
 * nét này nằm dưới ô ảnh (z-index 0) và được vén dần ra bằng clip-path khi cuộn.
 * Trên màn hình hẹp nét bút được ẩn đi vì hai cột đã xếp chồng lên nhau.
 *
 * Ảnh từng mốc hiện chưa có; MediaImage tự render ô kẻ sọc có nhãn thay thế.
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
      <div className="tl-head rv">
        <span className="eyebrow">{siteText.timeline_eyebrow || 'Lịch trình'}</span>
        <h2>
          {headingParts.length > 1
            ? headingParts.map((p, i) => (p === 'trọn vẹn' ? <em key={i}>{p}</em> : p))
            : heading}
        </h2>
      </div>

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
          {items.map((it, i) => (
            <div key={it.id || i} className={`tl-row ${i % 2 ? 'alt' : ''}`} data-rv>
              <div className="tl-text">
                <div className="tl-time">{it.time}</div>
                <div className="tl-label">{it.label_vi}</div>
                {it.label_en && <div className="tl-en">{it.label_en}</div>}
              </div>
              <div className="tl-img">
                <MediaImage
                  storagePath={it.image_path}
                  label={`Ảnh ${it.time} · chờ ảnh thật`}
                  alt={it.label_vi}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="countdown rv">
        <div className="countdown-photo">
          <MediaImage
            storagePath="background/moment-2.jpg"
            label="Hiếu và Minh"
            alt="Hiếu và Minh"
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
