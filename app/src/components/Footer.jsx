import { formatDateParts } from '../lib/config';
import MediaImage from './MediaImage';
import ScriptName from './ScriptName';

export default function Footer({ config, siteText = {} }) {
  const parts = formatDateParts(config.weddingDate);

  return (
    <footer className="footer">
      <MediaImage
        storagePath="icons/medallion-gold.png"
        localFallback="/assets/medallion-gold.png"
        alt=""
        clickable={false}
        sizes="74px"
      />
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
