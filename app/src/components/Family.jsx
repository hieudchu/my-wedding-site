import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PLACEHOLDERS } from '../lib/placeholders';
import MediaImage from './MediaImage';

export default function Family({ side, config, siteText = {}, reverse }) {
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

  const displayMembers = members;

  const bio = isGroom
    ? siteText.groom_bio || 'Cậu con trai lớn của gia đình, sinh ra và lớn lên tại Hà Nội. Nay chính thức trao gửi trái tim cho một nửa kia của cuộc đời.'
    : siteText.bride_bio || 'Cô con gái út của gia đình, sinh ra và lớn lên tại Sài Gòn. Nay xin gửi trọn niềm tin và tình yêu cho người bạn đồng hành.';

  const hometown = isGroom
    ? siteText.groom_hometown || 'Hà Nội · Việt Nam'
    : siteText.bride_hometown || 'TP. Hồ Chí Minh · Việt Nam';

  const photoLabel = isGroom ? 'Portrait · The Groom' : 'Portrait · The Bride';
  const storagePath = isGroom ? 'portraits/groom.jpg' : 'portraits/bride.jpg';
  const placeholderImg = isGroom ? PLACEHOLDERS.groom : PLACEHOLDERS.bride;

  return (
    <section
      className={`family ${reverse ? 'reverse' : ''}`}
      id={isGroom ? 'groom' : 'bride'}
    >
      <div className="container">
        <div className="family-portrait reveal">
          <MediaImage
            storagePath={storagePath}
            placeholder={placeholderImg}
            label={photoLabel}
            alt={photoLabel}
          />
          <div className="sig">{isGroom ? 'H' : 'M'}</div>
        </div>
        <div className="family-info reveal d1">
          <span className="eyebrow">{isGroom ? "Nhà trai · Groom's Family" : "Nhà gái · Bride's Family"}</span>
          <h3>
            <em>{isGroom ? 'Chú rể' : 'Cô dâu'}</em>
            <br />
            {isGroom ? config.groomName : config.brideName}
          </h3>
          <p className="bio">{bio}</p>
          <div className="family-list">
            {displayMembers.map((m, i) => (
              <div key={m.id || i} className="row">
                <div className="role">{m.role_label}</div>
                <div className="name">
                  {m.name_vi}
                  <span className="en">{m.name_en}</span>
                </div>
              </div>
            ))}
            <div className="row">
              <div className="role">Quê quán · Hometown</div>
              <div className="name">{hometown}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
