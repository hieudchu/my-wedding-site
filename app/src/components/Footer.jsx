import { formatDateParts } from '../lib/config';

export default function Footer({ config, siteText = {} }) {
  const parts = formatDateParts(config.weddingDate);
  return (
    <footer className="footer">
      <div className="names">
        {config.brideShort} &amp; {config.groomShort}
      </div>
      <div>
        {parts.dd}.{parts.mm}.{parts.yyyy} — {config.venueName}
      </div>
      <div className="small">{siteText.footer_text || 'With love · Made for our beloved guests'}</div>
    </footer>
  );
}
