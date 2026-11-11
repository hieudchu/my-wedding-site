import { formatDateParts } from '../lib/config';
import ScriptName from './ScriptName';

export default function Footer({ config, siteText = {} }) {
  const parts = formatDateParts(config.weddingDate);

  return (
    <footer className="footer">
      {/* Con dấu có sẵn trong bộ cài (16 KB), không còn ô tải lên ở admin (11/2026).
          Tải ngay: lazy làm logo trống một lúc khi khách kéo nhanh xuống cuối trang. */}
      <img src="/assets/medallion-gold.png" alt="" loading="eager" decoding="async" />
      {/* Tên viết TAN Whistling như thẻ thiệp đầu trang (ScriptName lo dấu "ế") */}
      <div className="names">
        <ScriptName short={config.groomShort} /> <em>&amp;</em> <ScriptName short={config.brideShort} />
      </div>
      <div className="meta">
        {parts.dd}.{parts.mm}.{parts.yyyy} — {config.venueName}
      </div>
      <div className="small">
        {siteText.footer_text || 'With love · Made for our beloved guests'}
      </div>
    </footer>
  );
}
