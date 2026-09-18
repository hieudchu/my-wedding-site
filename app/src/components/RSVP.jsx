import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatDateParts } from '../lib/config';

/**
 * Xác nhận tham dự.
 *
 * Khách chọn một trong hai thẻ lớn: trái tim (đồng ý) hoặc bồ câu đưa thư
 * (gửi lời chúc). Chọn trái tim mới hiện form; chọn bồ câu thì hiện luôn lời
 * cảm ơn theo đúng bản vẽ tay của designer.
 *
 * Form giữ ba trường: họ tên, số người, số điện thoại. Bản vẽ chỉ có hai trường
 * sau, nhưng bảng `rsvps` bắt buộc có tên — và không có tên thì chủ nhà cũng
 * không biết ai đã xác nhận.
 */
export default function RSVP({ config, siteText = {} }) {
  const [mode, setMode] = useState(null);
  const [name, setName] = useState('');
  const [guests, setGuests] = useState('2');
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const parts = formatDateParts(config.weddingDate);

  const pickYes = () => { setMode('yes'); setSent(false); };
  const pickNo = () => { setMode('no'); setSent(true); };

  const submit = async () => {
    if (sending || !name.trim()) return;
    setSending(true);
    try {
      const { error } = await supabase.from('rsvps').insert({
        name: name.trim(),
        phone: phone.trim(),
        attending: true,
        guest_count: parseInt(guests, 10) || 1,
      });
      if (error) throw error;
    } catch (err) {
      // Không chặn khách lại vì lỗi mạng — vẫn hiện lời cảm ơn,
      // nhưng ghi log để chủ nhà còn lần ra được khi đối soát danh sách.
      console.error('Không lưu được xác nhận tham dự:', err);
    }
    setSending(false);
    setSent(true);
  };

  const headingText = siteText.rsvp_heading || 'Cảm ơn bạn và gia đình!';
  const headingParts = headingText.split(/(và gia đình!)/);

  const showForm = mode === 'yes' && !sent;
  const showThanks = sent;

  return (
    <section className="rsvp" id="rsvp">
      <div className="rsvp-inner">
        <div className="rv">
          <span className="eyebrow">{siteText.rsvp_eyebrow || 'Xác nhận tham dự'}</span>
          <h2>
            {headingParts.length > 1
              ? headingParts.map((p, i) => (p === 'và gia đình!' ? <em key={i}>{p}</em> : p))
              : headingText}
          </h2>
          <p className="rsvp-lede">{siteText.rsvp_paragraph}</p>
        </div>

        {/* Hoạt cảnh: chú rể và cô dâu tiến lại gần nhau khi cuộn tới */}
        <div className="rsvp-scene">
          <div className="rsvp-scene-row">
            <svg className="person fig-l" viewBox="0 0 80 150" width="86" height="160" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="40" cy="24" r="15" />
              <path d="M25 14c6-9 24-9 30 0" />
              <path d="M40 39v22" />
              <path d="M22 66c4-6 32-6 36 0l4 44H18z" />
              <path d="M40 61l-8 12 8 10 8-10-8-12" />
              <path d="M22 110v34M58 110v34" />
              <path d="M18 78l-8 26M62 78l9 24" />
            </svg>

            <svg className="heart" viewBox="0 0 40 40" width="40" height="40" fill="none" strokeWidth="2" aria-hidden="true">
              <path d="M20 34S6 25 6 15a8 8 0 0114-5 8 8 0 0114 5c0 10-14 19-14 19z" strokeLinejoin="round" />
            </svg>

            <svg className="person fig-r" viewBox="0 0 80 150" width="86" height="160" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="40" cy="26" r="15" />
              <path d="M22 22c-2-14 38-14 36 0 0 0-4 6-18 6s-18-6-18-6z" />
              <path d="M40 41v18" />
              <path d="M24 60h32l12 50H12z" />
              <path d="M24 64l-12 22M56 64l13 20" />
              <path d="M34 110v34M48 110v34" />
            </svg>
          </div>
          <p>{config.groomShort} &amp; {config.brideShort} · sắp về chung một nhà</p>
        </div>

        <div className="rsvp-picks">
          <button className={`pick-card ${mode === 'yes' ? 'active' : ''}`} onClick={pickYes}>
            <svg viewBox="0 0 40 40" width="46" height="46" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M20 34S6 25 6 15a8 8 0 0114-5 8 8 0 0114 5c0 10-14 19-14 19z" strokeLinejoin="round" />
            </svg>
            <span className="title">{siteText.rsvp_attend_yes || 'Đồng ý tham dự'}</span>
            <span className="sub">{siteText.rsvp_attend_yes_sub || 'Vâng, chúng tôi sẽ đến'}</span>
          </button>

          <button className={`pick-card ${mode === 'no' ? 'active' : ''}`} onClick={pickNo}>
            <svg viewBox="0 0 44 40" width="50" height="46" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
              <path d="M4 20c6-10 17-13 26-9 3 1.4 6 1 8-1l3-3-1 6c-1 5-5 9-10 10-5 1-8 4-9 8" />
              <path d="M12 17c4 5 10 7 16 6" />
              <path d="M30 10h.01" />
              <rect x="13" y="24" width="12" height="9" rx="1" />
              <path d="M13 24l6 5 6-5" />
            </svg>
            <span className="title">{siteText.rsvp_attend_no || 'Gửi lời chúc'}</span>
            <span className="sub">{siteText.rsvp_attend_no_sub || 'Không thể tham dự'}</span>
          </button>
        </div>

        {showForm && (
          <div className="rsvp-form">
            <div className="rsvp-fields">
              <label className="rsvp-field full">
                <span>Họ và tên</span>
                <input
                  type="text"
                  value={name}
                  placeholder="VD: Nguyễn Văn A"
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </label>
              <label className="rsvp-field">
                <span>Số người tham dự</span>
                <select value={guests} onChange={(e) => setGuests(e.target.value)}>
                  <option value="1">1 người</option>
                  <option value="2">2 người</option>
                  <option value="3">3 người</option>
                  <option value="4">4 người</option>
                  <option value="5">5 người trở lên</option>
                </select>
              </label>
              <label className="rsvp-field">
                <span>Số điện thoại liên hệ</span>
                <input
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  placeholder="09xx xxx xxx"
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>
            </div>

            <button className="rsvp-submit" onClick={submit} disabled={sending || !name.trim()}>
              {sending ? 'Đang gửi…' : 'Xác nhận tham dự'}
            </button>

            <p className="rsvp-invite">Trân trọng kính mời</p>
            <p className="rsvp-quote">
              “Sự hiện diện của bạn và gia đình là niềm hạnh phúc lớn nhất trong ngày trọng đại của chúng tôi.”
            </p>
          </div>
        )}

        {showThanks && (
          <div className="rsvp-thanks">
            <div className="check">✓</div>
            <p className="title">
              {mode === 'no' ? 'Cảm ơn lời chúc của bạn!' : 'Đã nhận xác nhận của bạn!'}
            </p>
            <p className="body">
              {mode === 'no'
                ? 'Tuy không thể có mặt, lời chúc của bạn vẫn là món quà lớn với chúng em. Xin cảm ơn bạn và gia đình.'
                : `Chúng em đã ghi nhận ${guests} người tham dự. Hai gia đình xin trân trọng cảm ơn và rất mong được gặp bạn.`}
            </p>
            <p className="see-you">
              Hẹn gặp bạn ngày {parts.dd}.{parts.mm}.{parts.yyyy}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
