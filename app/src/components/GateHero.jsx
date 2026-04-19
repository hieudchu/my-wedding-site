import { useState } from 'react';
import { formatDateParts } from '../lib/config';
import MediaImage from './MediaImage';

export default function GateHero({ config, siteText = {}, onOpen }) {
  const [opened, setOpened] = useState(false);
  const parts = formatDateParts(config.weddingDate);

  const handleOpen = () => {
    if (opened) return;
    setOpened(true);
    setTimeout(() => onOpen?.(), 400);
  };

  return (
    <section className={`gate-hero ${opened ? 'opened' : ''}`} id="home">
      <div className="gate-bg" />

      <div className="gate-hero-content">
        <MediaImage
          storagePath="icons/medallion-gold.png"
          localFallback="/assets/medallion-gold.png"
          label="Medallion"
          alt="H&M medallion"
          className="medallion"
          style={{ width: 200, height: 'auto', objectFit: 'contain' }}
        />
        <h1>
          {config.brideShort}<span className="amp">&amp;</span>{config.groomShort}
        </h1>
        <div className="ornament" />
        <p className="tagline">
          {siteText.gate_tagline || '"Cùng nhau đón những hoàng hôn rực rỡ nhất của cuộc đời."'}
        </p>
        <div className="date-line">
          {parts.dd} · {parts.mm} · {parts.yyyy}
        </div>
      </div>

      <div
        className="gate-door gate-door-l"
        style={{ transform: opened ? 'translateX(-100%)' : 'translateX(0)' }}
      >
        <div className="door-inner" />
        <div className="lantern">
          <div className="glow" />
          <div className="lbl">囍</div>
        </div>
      </div>

      <div
        className="gate-door gate-door-r"
        style={{ transform: opened ? 'translateX(100%)' : 'translateX(0)' }}
      >
        <div className="door-inner" />
        <div className="lantern">
          <div className="glow" />
          <div className="lbl">囍</div>
        </div>
      </div>

      <button className="gate-prompt" onClick={handleOpen} aria-label="Mở thiệp">
        <span className="label">{siteText.gate_prompt || 'Trân trọng kính mời'}</span>
        <span className="sub">{siteText.gate_prompt_sub || 'Tap to open · Bấm để mở thiệp'}</span>
        <span className="pulse" />
      </button>
    </section>
  );
}
