import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useCountdown } from '../hooks/useCountdown';
import { PLACEHOLDERS } from '../lib/placeholders';
import MediaImage from './MediaImage';

const FALLBACK_ITEMS = [
  { time: '14:30', label_vi: 'Chụp ảnh gia đình', image_path: 'timeline/photo.jpg' },
  { time: '15:00', label_vi: 'Đón khách', image_path: 'timeline/welcome.jpg' },
  { time: '16:30', label_vi: 'Bắt đầu buổi lễ', image_path: 'timeline/ceremony.jpg' },
  { time: '17:00', label_vi: 'Trao nhẫn', image_path: 'timeline/vows.jpg' },
  { time: '18:00', label_vi: 'Khai tiệc', image_path: 'timeline/reception.jpg' },
];

export default function Timeline({ config, siteText = {} }) {
  const cd = useCountdown(config.weddingDate);
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

  return (
    <section className="timeline" id="timeline">
      <div className="container">
        <div className="timeline-head reveal">
          <span className="eyebrow">{siteText.timeline_eyebrow || 'Lịch trình'}</span>
          <h2>{(() => {
            const h = siteText.timeline_heading || 'Một ngày trọn vẹn';
            const parts = h.split(/(trọn vẹn)/);
            return parts.length > 1
              ? parts.map((p, i) => p === 'trọn vẹn' ? <em key={i}>{p}</em> : p)
              : h;
          })()}</h2>
        </div>

        <div className="timeline-track">
          {items.map((it, i) => (
            <div key={it.id || i} className={`tl-item reveal ${i % 2 ? 'alt' : ''}`}>
              <div className="side-time">
                <span className="t">{it.time}</span>
                <span className="label">{it.label_vi}</span>
                {it.label_en && <span className="en">{it.label_en}</span>}
              </div>
              <div className="dot" />
              <div className="side-img">
                <MediaImage
                  storagePath={it.image_path}
                  placeholder={PLACEHOLDERS.timeline[it.image_path]}
                  label={it.label_vi}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="countdown-card reveal">
          <div className="lbl">{siteText.timeline_countdown_label || 'Cùng đếm ngược đến ngày vui'}</div>
          <div className="countdown-grid">
            <div className="cd-unit">
              <div className="n">{String(cd.d).padStart(3, '0')}</div>
              <div className="u">Ngày</div>
            </div>
            <div className="cd-unit">
              <div className="n">{String(cd.h).padStart(2, '0')}</div>
              <div className="u">Giờ</div>
            </div>
            <div className="cd-unit">
              <div className="n">{String(cd.m).padStart(2, '0')}</div>
              <div className="u">Phút</div>
            </div>
            <div className="cd-unit">
              <div className="n">{String(cd.s).padStart(2, '0')}</div>
              <div className="u">Giây</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
