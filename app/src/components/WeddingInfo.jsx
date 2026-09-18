import { formatDateParts } from '../lib/config';
import MediaImage from './MediaImage';

/**
 * Tấm thiệp mời — trung tâm của cả trang.
 *
 * Hai mảng ảnh bo méo nằm sau thiệp, trôi ngược chiều cuộn tạo hiệu ứng parallax
 * (keyframes `par` / `parSm` chạy theo animation-timeline: view()).
 * Bốn góc thiệp là nét vàng, giữa là toàn bộ thông tin hôn lễ.
 *
 * Hai nút hành động cố ý cao 56px và chữ 17px — nhiều khách mời đã lớn tuổi.
 */
export default function WeddingInfo({ config, siteText = {} }) {
  const parts = formatDateParts(config.weddingDate);
  const telHref = `tel:${(config.phone || '').replace(/\s/g, '')}`;

  return (
    <section className="info" id="details">
      <div className="info-blob info-blob-1" data-rv>
        <MediaImage storagePath="background/right.jpg" label="Ảnh cưới" alt="" />
      </div>
      <div className="info-blob info-blob-2" data-rv>
        <MediaImage storagePath="background/left.jpg" label="Ảnh cưới" alt="" />
      </div>

      <div className="info-card" data-rv>
        <span className="corner tl" />
        <span className="corner tr" />
        <span className="corner bl" />
        <span className="corner br" />

        <MediaImage
          storagePath="icons/medallion-ink.png"
          localFallback="/assets/medallion-ink.png"
          alt=""
          className="info-medallion"
          clickable={false}
        />

        <p className="info-announce">{siteText.info_announce || 'Trân trọng báo tin'}</p>
        <p className="info-announce-en">
          {siteText.info_announce_en || 'We joyfully announce our wedding'}
        </p>

        <h2 className="info-heading">{siteText.info_heading || 'Lễ thành hôn'}</h2>
        <p className="info-couple">
          {config.groomShort} <em>&amp;</em> {config.brideShort}
        </p>

        <div className="orn-divider">
          <span className="rule" /><span className="mark">❖</span><span className="rule" />
        </div>

        <div className="date-row">
          <span className="num">{parts.dd}</span>
          <span className="mid">
            <span className="month">{parts.monthVn}</span>
            <span className="weekday">{parts.weekday}</span>
          </span>
          <span className="num">{parts.yyyy}</span>
        </div>
        <p className="info-time">
          {siteText.info_time_label || 'Hôn lễ bắt đầu lúc'} <strong>{config.weddingTime}</strong>
        </p>

        <div className="orn-divider">
          <span className="rule" /><span className="mark">❖</span><span className="rule" />
        </div>

        <p className="info-venue">
          {siteText.info_venue_prefix || 'Tại'} · {config.venueName}
        </p>
        <p className="info-address">{config.venueAddress}</p>

        <div className="info-actions">
          <a href={config.mapUrl} target="_blank" rel="noreferrer" className="btn btn-primary">
            <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M12 21s-7-8-7-13a7 7 0 0114 0c0 5-7 13-7 13z" strokeLinejoin="round" />
              <circle cx="12" cy="8" r="2.5" />
            </svg>
            {siteText.info_map_button || 'Xem bản đồ'}
          </a>
          <a href={telHref} className="btn btn-ghost">
            <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7 12.8 12.8 0 00.7 2.8 2 2 0 01-.4 2.1L8 10a16 16 0 006 6l1.4-1.4a2 2 0 012.1-.4 12.8 12.8 0 002.8.7 2 2 0 011.7 2z" strokeLinejoin="round" />
            </svg>
            {config.phone}
          </a>
        </div>
      </div>
    </section>
  );
}
