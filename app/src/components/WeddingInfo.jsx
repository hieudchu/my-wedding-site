import { formatDateParts } from '../lib/config';
import MediaImage from './MediaImage';
import ScriptName from './ScriptName';
import { useViewport } from '../hooks/useViewport';

/**
 * Tấm thiệp mời — trung tâm của cả trang.
 *
 * Hai mảng ảnh bo méo nằm sau thiệp, trôi ngược chiều cuộn tạo hiệu ứng parallax
 * (keyframes `par` / `parSm` chạy theo animation-timeline: view()).
 * Bốn góc thiệp là nét vàng, giữa là toàn bộ thông tin hôn lễ.
 *
 * Hai nút hành động cố ý cao 56px và chữ 17px — nhiều khách mời đã lớn tuổi.
 */
/*
 * DeskInfo — thẻ Lễ thành hôn cho DESKTOP (2026-11). Cùng chất liệu với thẻ điện thoại:
 * nền #F4EAE1 (không logo, không phụ đề EN), Playfair, "Hiếu & Minh" TAN Whistling đỏ.
 * Hai ảnh blob (giữ đúng khung 3:4 blob như cũ) đứng TRỌN hai bên thẻ, có bóng đổ,
 * không còn tràn ra ngoài mép màn. Hai nút cao 56px, chữ 18px.
 */
/* Góc "bậc thang" vẽ bằng SVG nội tuyến (để nét tự vẽ được khi hiện — xem DeskMotion) */
const STEP_CORNER = (
  <svg viewBox="0 0 96 96" fill="none" stroke="#A8803C" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path className="ln" pathLength="1" d="M12 96V32H32V12H96" strokeWidth="1.1" />
    <path className="ln ln2" pathLength="1" d="M18 96V38H38V18H96" strokeWidth="0.7" opacity="0.55" />
    <rect className="gem" x="18" y="18" width="8" height="8" fill="#A8803C" stroke="none" transform="rotate(45 22 22)" />
    <path className="tick" d="M44 12v6M50 12v4M12 44h6M12 50h4" strokeWidth="0.9" />
  </svg>
);

function DeskInfo({ config, siteText = {} }) {
  const parts = formatDateParts(config.weddingDate);
  const telHref = `tel:${(config.phone || '').replace(/\s/g, '')}`;

  return (
    <section className="d-info" id="details">
      <figure className="d-info-photo d-info-photo--l rv" data-rv>
        <MediaImage storagePath="background/left.jpg" label="Ảnh cưới" alt="" sizes="(min-width: 1560px) 340px, 22vw" />
      </figure>

      <div className="d-info-card rv" data-rv data-dv="">
        <span className="corner tl">{STEP_CORNER}</span>
        <span className="corner tr">{STEP_CORNER}</span>
        <span className="corner bl">{STEP_CORNER}</span>
        <span className="corner br">{STEP_CORNER}</span>

        <p className="d-info-announce">{siteText.info_announce || 'Trân trọng báo tin'}</p>

        <h2 className="d-info-heading">{siteText.info_heading || 'Lễ thành hôn'}</h2>
        <p className="d-info-couple" data-dv="">
          <ScriptName short={config.groomShort} /> <em>&amp;</em> <ScriptName short={config.brideShort} />
        </p>

        <div className="d-orn" aria-hidden="true" data-dv=""><span className="rule" /><span className="mark">❖</span><span className="rule" /></div>

        <div className="d-info-date">
          <span className="num">{parts.dd}</span>
          <span className="mid">
            <span>{parts.monthVn}</span>
            <span>{parts.weekday}</span>
          </span>
          <span className="num">{parts.yyyy}</span>
        </div>
        <p className="d-info-time">
          {siteText.info_time_label || 'Hôn lễ bắt đầu lúc'} <strong>{config.weddingTime}</strong>
        </p>

        <div className="d-orn" aria-hidden="true" data-dv=""><span className="rule" /><span className="mark">❖</span><span className="rule" /></div>

        <p className="d-info-venue">{siteText.info_venue_prefix || 'Tại'} · {config.venueName}</p>
        <p className="d-info-address">{config.venueAddress}</p>

        <div className="d-info-actions">
          <a href={config.mapUrl} target="_blank" rel="noreferrer" className="d-btn d-btn--primary">
            <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M12 21s-7-8-7-13a7 7 0 0114 0c0 5-7 13-7 13z" strokeLinejoin="round" />
              <circle cx="12" cy="8" r="2.5" />
            </svg>
            {siteText.info_map_button || 'Xem bản đồ'}
          </a>
          <a href={telHref} className="d-btn d-btn--ghost">
            <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7 12.8 12.8 0 00.7 2.8 2 2 0 01-.4 2.1L8 10a16 16 0 006 6l1.4-1.4a2 2 0 012.1-.4 12.8 12.8 0 002.8.7 2 2 0 011.7 2z" strokeLinejoin="round" />
            </svg>
            {config.phone}
          </a>
        </div>
      </div>

      <figure className="d-info-photo d-info-photo--r rv" data-rv>
        <MediaImage storagePath="background/right.jpg" label="Ảnh cưới" alt="" sizes="(min-width: 1560px) 340px, 22vw" />
      </figure>
    </section>
  );
}

export default function WeddingInfo({ config, siteText = {} }) {
  // Desktop: thẻ thiệp mời dựng riêng (DeskInfo). Điện thoại giữ nguyên markup dưới đây.
  const { isPhone } = useViewport();
  if (!isPhone) return <DeskInfo config={config} siteText={siteText} />;
  const parts = formatDateParts(config.weddingDate);
  const telHref = `tel:${(config.phone || '').replace(/\s/g, '')}`;

  return (
    <section className="info" id="details">
      <div className="info-blob info-blob-1" data-rv>
        <MediaImage storagePath="background/right.jpg" label="Ảnh cưới" alt="" sizes="(max-width: 759.98px) 80vw, 30vw" />
      </div>
      <div className="info-blob info-blob-2" data-rv>
        <MediaImage storagePath="background/left.jpg" label="Ảnh cưới" alt="" sizes="(max-width: 759.98px) 80vw, 30vw" />
      </div>

      {/* data-dv: bốn góc tự vẽ nét, vạch ❖ mọc ra, tên viết tay (mobile.css + DeskMotion) */}
      <div className="info-card" data-rv data-dv="">
        <span className="corner tl">{STEP_CORNER}</span>
        <span className="corner tr">{STEP_CORNER}</span>
        <span className="corner bl">{STEP_CORNER}</span>
        <span className="corner br">{STEP_CORNER}</span>

        <MediaImage
          storagePath="icons/medallion-ink.png"
          localFallback="/assets/medallion-ink.png"
          alt=""
          className="info-medallion"
          clickable={false}
          sizes="96px"
        />

        <p className="info-announce">{siteText.info_announce || 'Trân trọng báo tin'}</p>

        <h2 className="info-heading">{siteText.info_heading || 'Lễ thành hôn'}</h2>
        <p className="info-couple" data-dv="">
          <ScriptName short={config.groomShort} /> <em>&amp;</em> <ScriptName short={config.brideShort} />
        </p>

        <div className="orn-divider" data-dv="">
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

        <div className="orn-divider" data-dv="">
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
