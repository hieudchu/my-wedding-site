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

  const bio = isGroom ? siteText.groom_bio : siteText.bride_bio;
  const hometown = isGroom ? siteText.groom_hometown : siteText.bride_hometown;

  const photoLabel = isGroom ? 'Chân dung chú rể' : 'Chân dung cô dâu';
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
          <span className="eyebrow">{isGroom ? 'Nhà trai · Groom\'s Family' : 'Nhà gái · Bride\'s Family'}</span>
          <h3>
            <em>{isGroom ? 'Chú rể' : 'Cô dâu'}</em>
            <br />
            {isGroom ? config.groomName : config.brideName}
          </h3>
          {bio && <p className="bio">{bio}</p>}
          {(displayMembers.length > 0 || hometown) && (
            <div className="family-list">
              {displayMembers.map((m, i) => (
                <div key={m.id || i} className="row">
                  <div className="role">{m.role_label}</div>
                  <div className="name">
                    {m.name_vi}
                  </div>
                </div>
              ))}
              {hometown && (
                <div className="row">
                  <div className="role">Quê quán</div>
                  <div className="name">{hometown}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
