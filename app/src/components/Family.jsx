import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
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
      });
  }, [side]);

  const fallbackMembers = isGroom
    ? [
        { role_label: 'Cha · Father', name_vi: 'Ông Chu Văn Anh', name_en: 'Mr. Chu Van Anh' },
        { role_label: 'Mẹ · Mother', name_vi: 'Bà Trần Thị Lan', name_en: 'Mrs. Tran Thi Lan' },
        { role_label: 'Anh trai · Brother', name_vi: 'Chu Đăng Khôi', name_en: 'Chu Dang Khoi' },
      ]
    : [
        { role_label: 'Cha · Father', name_vi: 'Ông Nguyễn Văn Thiện', name_en: 'Mr. Nguyen Van Thien' },
        { role_label: 'Mẹ · Mother', name_vi: 'Bà Lê Thị Hương', name_en: 'Mrs. Le Thi Huong' },
        { role_label: 'Chị gái · Sister', name_vi: 'Nguyễn Thu Thảo', name_en: 'Nguyen Thu Thao' },
      ];

  const displayMembers = members.length > 0 ? members : fallbackMembers;

  const bio = isGroom
    ? siteText.groom_bio || 'Cậu con trai lớn của gia đình, sinh ra và lớn lên tại Hà Nội. Nay chính thức trao gửi trái tim cho một nửa kia của cuộc đời.'
    : siteText.bride_bio || 'Cô con gái út của gia đình, sinh ra và lớn lên tại Sài Gòn. Nay xin gửi trọn niềm tin và tình yêu cho người bạn đồng hành.';

  const hometown = isGroom
    ? siteText.groom_hometown || 'Hà Nội · Việt Nam'
    : siteText.bride_hometown || 'TP. Hồ Chí Minh · Việt Nam';

  const eyebrow = isGroom ? 'Nhà trai · Groom\'s Family' : 'Nhà gái · Bride\'s Family';
  const name = isGroom ? config.groomName : config.brideName;
  const photoLabel = isGroom ? 'Portrait · The Groom' : 'Portrait · The Bride';
  const storagePath = isGroom ? 'portraits/groom.jpg' : 'portraits/bride.jpg';

  return (
    <section
      className={`family ${reverse ? 'reverse' : ''}`}
      id={isGroom ? 'groom' : 'bride'}
    >
      <div className="container">
        <div className="family-portrait reveal">
          <MediaImage storagePath={storagePath} label={photoLabel} alt={photoLabel} />
          <div className="sig">{isGroom ? 'H' : 'M'}</div>
        </div>
        <div className="family-info reveal d1">
          <span className="eyebrow">{eyebrow}</span>
          <h3>
            <em>{isGroom ? 'Chú rể' : 'Cô dâu'}</em>
            <br />
            {name}
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
