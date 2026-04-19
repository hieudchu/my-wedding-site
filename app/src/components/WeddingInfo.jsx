import { formatDateParts } from '../lib/config';
import { PLACEHOLDERS } from '../lib/placeholders';
import MediaImage from './MediaImage';

export default function WeddingInfo({ config, siteText = {} }) {
  const parts = formatDateParts(config.weddingDate);
  const bg = PLACEHOLDERS.background;

  return (
    <section className="info" id="details">
      <div className="info-bg-photos">
        <MediaImage storagePath="background/left.jpg" placeholder={bg['background/left.jpg']} label="Couple · Left" className="l" />
        <MediaImage storagePath="background/right.jpg" placeholder={bg['background/right.jpg']} label="Couple · Right" className="r" />
        <MediaImage storagePath="background/moment-1.jpg" placeholder={bg['background/moment-1.jpg']} label="Moment" className="l2" />
        <MediaImage storagePath="background/moment-2.jpg" placeholder={bg['background/moment-2.jpg']} label="Moment" className="r2" />
      </div>

      <div className="info-card reveal">
        <span className="corner tl" />
        <span className="corner tr" />
        <span className="corner bl" />
        <span className="corner br" />

        <MediaImage
          storagePath="icons/medallion-ink.png"
          localFallback="/assets/medallion-ink.png"
          label="Medallion"
          alt=""
          className="medallion-ink"
          style={{ width: 110, height: 'auto', objectFit: 'contain' }}
        />
        <p className="announce">{siteText.info_announce || 'Trân trọng báo tin'}</p>
        <p className="announce announce-en">{siteText.info_announce_en || 'We joyfully announce our wedding'}</p>

        <h2 className="names">
          {config.brideShort}
          <span className="amp">&amp;</span>
          {config.groomShort}
        </h2>

        <div className="divider" />

        <div className="date-big">
          <div className="d">{parts.dd}</div>
          <div className="mid">
            <span className="big">{parts.monthVn}</span>
            {parts.weekday} · {parts.weekdayEn}
          </div>
          <div className="d">{parts.yyyy}</div>
        </div>
        <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 18, color: 'var(--muted)' }}>
          Hôn lễ bắt đầu lúc {config.weddingTime}
        </div>

        <div className="divider" />

        <p className="location">
          {siteText.info_venue_prefix || 'Tại tư gia'} · {config.venueName}
          <span className="addr">{config.venueAddress}</span>
        </p>

        <div className="actions">
          <a href={config.mapUrl} target="_blank" rel="noreferrer" className="btn btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 21s-7-8-7-13a7 7 0 0114 0c0 5-7 13-7 13z" strokeLinejoin="round" />
              <circle cx="12" cy="8" r="2.5" />
            </svg>
            Xem bản đồ
          </a>
          <a href={`tel:${config.phone.replace(/\s/g, '')}`} className="btn btn-ghost">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7 12.8 12.8 0 00.7 2.8 2 2 0 01-.4 2.1L8 10a16 16 0 006 6l1.4-1.4a2 2 0 012.1-.4 12.8 12.8 0 002.8.7 2 2 0 011.7 2z" strokeLinejoin="round" />
            </svg>
            {config.phone}
          </a>
        </div>
      </div>
    </section>
  );
}
