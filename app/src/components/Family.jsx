import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import MediaImage from './MediaImage';

/**
 * Giới thiệu hai họ. Dùng chung cho cả nhà trai và nhà gái — prop `side` chọn bên,
 * còn bố cục thì lật ngược nhau: nhà trai chữ bên trái, nhà gái chữ bên phải
 * (xem .family.bride trong sections.css).
 *
 * Ảnh chân dung bo vòm ở đỉnh như khung ảnh thờ truyền thống, chữ ký H/M viết tay
 * đặt lệch ra ngoài đáy khung.
 */
export default function Family({ side, config, siteText = {} }) {
  const isGroom = side === 'groom';
  const [members, setMembers] = useState([]);

  useEffect(() => {
    supabase
      .from('family_members')
      .select('*')
      .eq('side', side)
      .order('sort_order')
      .then(({ data }) => {
        if (data && data.length > 0) setMembers(data);
      })
      .catch(() => {});
  }, [side]);

  const bio = isGroom ? siteText.groom_bio : siteText.bride_bio;
  const hometown = isGroom ? siteText.groom_hometown : siteText.bride_hometown;
  const photoLabel = isGroom ? 'Chân dung chú rể' : 'Chân dung cô dâu';
  const storagePath = isGroom ? 'portraits/groom.jpg' : 'portraits/bride.jpg';

  const rows = [
    ...members.map((m) => ({ key: m.id ?? m.role_label, role: m.role_label, name: m.name_vi })),
    ...(hometown ? [{ key: 'hometown', role: 'Quê quán', name: hometown }] : []),
  ];

  return (
    <section className={`family ${isGroom ? 'groom' : 'bride'}`} id={isGroom ? 'groom' : 'bride'}>
      <div className="family-inner">
        <div className="family-text rv" data-rv>
          <span className="eyebrow">
            {isGroom ? 'Nhà trai · Groom’s family' : 'Nhà gái · Bride’s family'}
          </span>
          <h2 className="family-name">
            <em>{isGroom ? 'Chú rể' : 'Cô dâu'}</em>
            {isGroom ? config.groomName : config.brideName}
          </h2>
          {bio && <p className="family-bio">{bio}</p>}
          {rows.length > 0 && (
            <div className="family-list">
              {rows.map((r) => (
                <div key={r.key} className="family-row">
                  <span className="family-role">{r.role}</span>
                  <span className="family-person">{r.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="family-photo rv" data-rv>
          <div className="family-photo-frame">
            <MediaImage
              storagePath={storagePath}
              label={photoLabel}
              alt={photoLabel}
              sizes="(max-width: 759.98px) 86vw, 45vw"
            />
          </div>
          {/* <b> bên trong: chuyển động viết tay clip phần tử con (clip chính nó thì IntersectionObserver không thấy) */}
          <span className="family-sig" data-dv=""><b>{isGroom ? 'H' : 'M'}</b></span>
          {/* Desktop: chữ ký H/M nổi trên ảnh (desktop.css). Ẩn ở điện thoại. */}
          <span className="d-sig" aria-hidden="true" data-dv=""><b>{isGroom ? 'H' : 'M'}</b></span>
        </div>
      </div>
    </section>
  );
}
