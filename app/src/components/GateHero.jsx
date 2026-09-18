import { useState } from 'react';

/**
 * Cổng mở thiệp — màn hình đầu tiên khách gặp.
 *
 * Hai cánh cửa sơn mài đỏ, hoa văn nét vàng vẽ hoàn toàn bằng CSS gradient
 * (xem .gate-door trong sections.css), dải mây ngũ sắc vắt ngang, tem 囍 dập nhũ
 * ở giữa. Bấm bất kỳ đâu thì hai cánh trượt ra hai bên trong 1.8s.
 *
 * Chất liệu là giấy in — cố ý không có hiệu ứng phát sáng hay đốm sáng bay.
 */
export default function GateHero({ siteText = {}, opened, onOpen }) {
  const [tapped, setTapped] = useState(false);

  const handleOpen = () => {
    if (tapped) return;
    setTapped(true);
    onOpen?.();
  };

  return (
    <div
      className={`gate ${opened ? 'opened' : ''}`}
      id="home"
      onClick={handleOpen}
      role="button"
      tabIndex={0}
      aria-label="Mở thiệp"
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleOpen(); }}
    >
      <div className="gate-door gate-door-l">
        <i className="pat-1" /><i className="pat-2" /><i className="pat-3" /><i className="pat-4" />
        <i className="fan" /><i className="rings" /><i className="shade" />
        <div className="cloud-band"><i /></div>
        <span className="door-edge" />
        <span className="door-dot" />
      </div>

      <div className="gate-door gate-door-r">
        <i className="pat-1" /><i className="pat-2" /><i className="pat-3" /><i className="pat-4" />
        <i className="fan" /><i className="rings" /><i className="shade" />
        <div className="cloud-band"><i /></div>
        <span className="door-edge" />
        <span className="door-dot" />
      </div>

      {/* Tem 囍 — hai khung vuông tự vẽ nét, chữ tô gradient nhũ vàng */}
      <div className="seal">
        <div className="seal-face">
          <svg viewBox="0 0 100 100" fill="none" aria-hidden="true">
            <rect x="1" y="1" width="98" height="98" pathLength="1" strokeDasharray="1" />
            <rect x="6.5" y="6.5" width="87" height="87" pathLength="1" strokeDasharray="1" />
          </svg>
          <span className="seal-char">囍</span>
        </div>
      </div>

      <div className="gate-prompt">
        <span className="label">{siteText.gate_prompt || 'Trân trọng kính mời'}</span>
        <span className="sub">{siteText.gate_prompt_sub || 'Bấm để mở thiệp · Tap to open'}</span>
        <span className="gate-pulse">
          <i /><i />
          <b><s /></b>
        </span>
      </div>
    </div>
  );
}
