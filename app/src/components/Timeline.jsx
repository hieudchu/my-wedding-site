import { useCountdown } from '../hooks/useCountdown';
import MediaImage from './MediaImage';

const items = [
  { time: '14:30', label: 'Chụp ảnh gia đình', en: 'Family photo session', img: 'timeline/photo.jpg' },
  { time: '15:00', label: 'Đón khách', en: 'Guest welcome', img: 'timeline/welcome.jpg' },
  { time: '16:30', label: 'Bắt đầu buổi lễ', en: 'Ceremony begins', img: 'timeline/ceremony.jpg' },
  { time: '17:00', label: 'Trao nhẫn', en: 'Ring exchange', img: 'timeline/vows.jpg' },
  { time: '18:00', label: 'Khai tiệc', en: 'Reception', img: 'timeline/reception.jpg' },
];

export default function Timeline({ config }) {
  const cd = useCountdown(config.weddingDate);

  return (
    <section className="timeline" id="timeline">
      <div className="container">
        <div className="timeline-head reveal">
          <span className="eyebrow">Timeline · Lịch trình</span>
          <h2>Một ngày <em>trọn vẹn</em></h2>
        </div>

        <div className="timeline-track">
          {items.map((it, i) => (
            <div key={i} className={`tl-item reveal ${i % 2 ? 'alt' : ''}`}>
              <div className="side-time">
                <span className="t">{it.time}</span>
                <span className="label">{it.label}</span>
                <span className="en">{it.en}</span>
              </div>
              <div className="dot" />
              <div className="side-img">
                <MediaImage storagePath={it.img} label={it.en} />
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
