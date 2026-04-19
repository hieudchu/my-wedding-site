import { formatDateParts } from '../lib/config';

export default function Footer({ config }) {
  const parts = formatDateParts(config.weddingDate);
  return (
    <footer className="footer">
      <div className="names">
        {config.brideShort} &amp; {config.groomShort}
      </div>
      <div>
        {parts.dd}.{parts.mm}.{parts.yyyy} — {config.venueName}
      </div>
      <div className="small">With love · Made for our beloved guests</div>
    </footer>
  );
}
