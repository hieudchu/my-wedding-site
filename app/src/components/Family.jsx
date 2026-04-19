import MediaImage from './MediaImage';

export default function Family({ side, config, reverse }) {
  const isGroom = side === 'groom';
  const data = isGroom
    ? {
        eyebrow: 'Nhà trai · Groom\'s Family',
        name: config.groomName,
        nameEn: 'The Chu Family',
        bio: 'Cậu con trai lớn của gia đình, sinh ra và lớn lên tại Hà Nội. Nay chính thức trao gửi trái tim cho một nửa kia của cuộc đời.',
        hometown: 'Hà Nội · Việt Nam',
        members: [
          { role: 'Cha · Father', name: 'Ông Chu Văn Anh', en: 'Mr. Chu Van Anh' },
          { role: 'Mẹ · Mother', name: 'Bà Trần Thị Lan', en: 'Mrs. Tran Thi Lan' },
          { role: 'Anh trai · Brother', name: 'Chu Đăng Khôi', en: 'Chu Dang Khoi' },
        ],
        photoLabel: 'Portrait · The Groom',
        storagePath: 'portraits/groom.jpg',
      }
    : {
        eyebrow: 'Nhà gái · Bride\'s Family',
        name: config.brideName,
        nameEn: 'The Nguyen Family',
        bio: 'Cô con gái út của gia đình, sinh ra và lớn lên tại Sài Gòn. Nay xin gửi trọn niềm tin và tình yêu cho người bạn đồng hành.',
        hometown: 'TP. Hồ Chí Minh · Việt Nam',
        members: [
          { role: 'Cha · Father', name: 'Ông Nguyễn Văn Thiện', en: 'Mr. Nguyen Van Thien' },
          { role: 'Mẹ · Mother', name: 'Bà Lê Thị Hương', en: 'Mrs. Le Thi Huong' },
          { role: 'Chị gái · Sister', name: 'Nguyễn Thu Thảo', en: 'Nguyen Thu Thao' },
        ],
        photoLabel: 'Portrait · The Bride',
        storagePath: 'portraits/bride.jpg',
      };

  return (
    <section
      className={`family ${reverse ? 'reverse' : ''}`}
      id={isGroom ? 'groom' : 'bride'}
    >
      <div className="container">
        <div className="family-portrait reveal">
          <MediaImage
            storagePath={data.storagePath}
            label={data.photoLabel}
            alt={data.photoLabel}
          />
          <div className="sig">{isGroom ? 'H' : 'M'}</div>
        </div>
        <div className="family-info reveal d1">
          <span className="eyebrow">{data.eyebrow}</span>
          <h3>
            <em>{isGroom ? 'Chú rể' : 'Cô dâu'}</em>
            <br />
            {data.name}
          </h3>
          <p className="bio">{data.bio}</p>
          <div className="family-list">
            {data.members.map((m, i) => (
              <div key={i} className="row">
                <div className="role">{m.role}</div>
                <div className="name">
                  {m.name}
                  <span className="en">{m.en}</span>
                </div>
              </div>
            ))}
            <div className="row">
              <div className="role">Quê quán · Hometown</div>
              <div className="name">{data.hometown}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
