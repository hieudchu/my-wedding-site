import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useCountdown } from '../hooks/useCountdown';
import { PLACEHOLDERS } from '../lib/placeholders';
import MediaImage from './MediaImage';

const FALLBACK_ITEMS = [
  { time: '14:30', label_vi: 'Chụp ảnh gia đình', label_en: 'Family photo session', image_path: 'timeline/photo.jpg' },
  { time: '15:00', label_vi: 'Đón khách', label_en: 'Guest welcome', image_path: 'timeline/welcome.jpg' },
  { time: '16:30', label_vi: 'Bắt đầu buổi lễ', label_en: 'Ceremony begins', image_path: 'timeline/ceremony.jpg' },
  { time: '17:00', label_vi: 'Trao nhẫn', label_en: 'Ring exchange', image_path: 'timeline/vows.jpg' },
  { time: '18:00', label_vi: 'Khai tiệc', label_en: 'Reception', image_path: 'timeline/reception.jpg' },
];

export default function Timeline({ config }) {
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
          <span className="eyebrow">Timeline · Lịch trình</span>
          <h2>Một ngày <em>trọn vẹn</em></h2>
        </div>

        <div className="timeline-track">
          {items.map((it, i) => (
            <div key={it.id || i} className={`tl-item reveal ${i % 2 ? 'alt' : ''}`}>
              <div className="side-time">
                <span className="t">{it.time}</span>
                <span className="label">{it.label_vi}</span>
                <span className="en">{it.label_en}</span>
              </div>
              <div className="dot" />
              <div className="side-img">
                <MediaImage
                  storagePath={it.image_path}
                  placeholder={PLACEHOLDERS.timeline[it.image_path]}
                  label={it.label_en}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="countdown-card reveal">
          <div className="lbl">Cùng đếm ngược đến ngày vui · Counting down</div>
          <div className="countdown-grid">
            <div className="cd-unit">
              <div className="n">{String(cd.d).padStart(3, '0')}</div>
              <div className="u">Days</div>
            </div>
            <div className="cd-unit">
              <div className="n">{String(cd.h).padStart(2, '0')}</div>
              <div className="u">Hours</div>
            </div>
            <div className="cd-unit">
              <div className="n">{String(cd.m).padStart(2, '0')}</div>
              <div className="u">Minutes</div>
            </div>
            <div className="cd-unit">
              <div className="n">{String(cd.s).padStart(2, '0')}</div>
              <div className="u">Seconds</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
