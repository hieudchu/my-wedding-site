import { formatDateParts } from '../lib/config';
import MediaImage from './MediaImage';

export default function Hero({ config, siteText = {}, visible }) {
  const parts = formatDateParts(config.weddingDate);

  return (
    <section className={`hero ${visible ? 'visible' : ''}`} id="hero">
      <div className="gate-bg" />
      <div className="hero-content">
        <MediaImage
          storagePath="icons/medallion-gold.png"
          localFallback="/assets/medallion-gold.png"
          label="Medallion"
          alt="H&M medallion"
          className="medallion"
          style={{ width: 200, height: 'auto', objectFit: 'contain' }}
        />
        <h1>
          <span className="initial">{config.groomShort?.[0]}</span>{config.groomShort?.slice(1)}<span className="amp">&amp;</span><span className="initial">{config.brideShort?.[0]}</span>{config.brideShort?.slice(1)}
        </h1>
        <div className="ornament" />
        <p className="tagline">
          {siteText.gate_tagline || '"Cùng nhau đón những hoàng hôn rực rỡ nhất của cuộc đời."'}
        </p>
        <div className="date-line">
          {parts.dd} · {parts.mm} · {parts.yyyy}
        </div>
      </div>
    </section>
  );
}
