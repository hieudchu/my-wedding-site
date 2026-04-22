import { formatDateParts } from '../lib/config';

export default function Footer({ config, siteText = {} }) {
  const parts = formatDateParts(config.weddingDate);
  return (
    <footer className="footer">
      <div className="names">
        {config.groomShort} &amp; {config.brideShort}
      </div>
      <div>
        {parts.dd}.{parts.mm}.{parts.yyyy} — {config.venueName}
      </div>
      <div className="small">{siteText.footer_text || 'Với tất cả tình yêu'}</div>
    </footer>
  );
}
