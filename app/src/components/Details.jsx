import { formatDateParts } from '../lib/config';

export default function Details({ config = {}, siteText = {} }) {
  const heading = siteText.details_heading || 'Cùng nhau đón những hoàng hôn rực rỡ nhất của cuộc đời.';
  const headingParts = heading.split(/(rực rỡ nhất)/);

  return (
    <section className="details" id="story">
      <div className="details-intro reveal">
        <span className="eyebrow">{siteText.details_eyebrow || 'Hẹn ngày'} · {(() => { const p = formatDateParts(config.weddingDate); return `${p.dd}.${p.mm}.${p.yyyy}`; })()}</span>
        <h2>
          {headingParts.length > 1
            ? headingParts.map((part, i) =>
                part === 'rực rỡ nhất' ? <em key={i}>{part}</em> : part
              )
            : heading}
        </h2>
        <p>
          {siteText.details_paragraph ||
            'Sau bao mùa mưa nắng, hai con tim cuối cùng cũng tìm được cùng một nhịp đập. Chúng em xin trân trọng mời bạn đến chia vui trong ngày trọng đại của chúng em.'}
        </p>
      </div>
    </section>
  );
}
