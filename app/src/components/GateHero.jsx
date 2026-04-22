import { useState } from 'react';

export default function GateHero({ siteText = {}, onOpen }) {
  const [opened, setOpened] = useState(false);

  const handleOpen = () => {
    if (opened) return;
    setOpened(true);
    setTimeout(() => onOpen?.(), 400);
  };

  return (
    <div className={`gate-overlay ${opened ? 'opened' : ''}`} id="home">
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
        <span className="sub">{siteText.gate_prompt_sub || 'Bấm để mở thiệp'}</span>
        <span className="pulse" />
      </button>
    </div>
  );
}
