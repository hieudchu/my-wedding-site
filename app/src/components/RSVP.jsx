import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatDateParts } from '../lib/config';
import { formatVNPhone, toE164VN, GUEST_OPTIONS, guestLabel } from '../lib/phone';

const WISH_MAX = 500;
const NOTE_MAX = 300;

/**
 * Xác nhận tham dự. Dùng chung cho MỌI màn hình, kể cả desktop.
 *
 * Hai nút lớn loại trừ nhau; bấm lại nút đang chọn thì đóng phần đang mở mà vẫn
 * giữ nội dung đã gõ. Thứ tự DOM: nút Đồng ý → form → thẻ cảm ơn (yes) →
 * nút Gửi lời chúc → ô lời chúc → thẻ cảm ơn (no), để mỗi phần mở ra ngay dưới
 * nút của nó.
 *
 * "Đồng ý tham dự" ghi vào bảng `rsvps`; "Gửi lời chúc" ghi vào bảng `wishes`
 * (lời chúc ẩn danh — form cố ý không có ô tên).
 *
 * Ô nhập cao 56px và chữ 17px: dưới 16px là iOS Safari tự phóng to trang mỗi lần
 * khách bấm vào ô.
 */
export default function RSVP({ config, siteText = {} }) {
  const [mode, setMode] = useState(null);
  const [name, setName] = useState('');
  const [guests, setGuests] = useState('');
  const [side, setSide] = useState(''); // 'groom' | 'bride' — khách nhà trai / nhà gái
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [wish, setWish] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const parts = formatDateParts(config.weddingDate);

  // Lời chúc có sẵn cho khách muốn gửi nhanh, không phải gõ.
  const presetWish = `Chúc ${config.groomShort} & ${config.brideShort} trăm năm hạnh phúc, mãi bên nhau yêu thương và đầm ấm!`;

  // Bấm lại nút đang chọn → đóng form / thẻ cảm ơn (nội dung đã điền vẫn giữ nếu mở lại)
  const pickYes = () => { setSent(false); setMode((m) => (m === 'yes' ? null : 'yes')); };
  const pickNo = () => { setSent(false); setMode((m) => (m === 'no' ? null : 'no')); };

  const submit = async () => {
    if (sending || !name.trim()) return;
    setSending(true);
    // Cột khớp schema THẬT của bảng `rsvps` (xem migration
    // supabase/migrations/20261110000000_rsvp_form_v3_and_rls.sql):
    //   guest_count là SỐ NGUYÊN đã có sẵn → "Trên 10 người" lưu 10 + cờ guests_over_10
    //   ô "Ghi chú" dùng lại cột `message` đã có, không tạo cột `note` trùng nghĩa
    const row = {
      name: name.trim().slice(0, 120),
      attending: true,
      side: side || null,
      guest_count: guests ? (guests === '10+' ? 10 : parseInt(guests, 10)) : null,
      guests_over_10: guests === '10+',
      phone: phone.trim() || null,
      phone_e164: toE164VN(phone),
      message: note.trim().slice(0, NOTE_MAX) || null,
    };
    try {
      // KHÔNG gọi .select() sau insert — anon không có quyền đọc (RLS) nên sẽ
      // báo lỗi giả dù bản ghi đã vào.
      const { error } = await supabase.from('rsvps').insert(row);
      if (error) throw error;
    } catch (err) {
      // Không chặn khách lại vì lỗi mạng — vẫn hiện lời cảm ơn, nhưng ghi log
      // để chủ nhà còn lần ra được khi đối soát danh sách.
      console.error('[rsvp] insert failed', err);
    }
    setSending(false);
    setSent(true);
  };

  const sendWish = async (text, isPreset = false) => {
    const msg = (text || '').trim().slice(0, WISH_MAX);
    if (sending || !msg) return;
    setSending(true);
    try {
      const { error } = await supabase.from('wishes').insert({ message: msg, is_preset: isPreset });
      if (error) throw error;
    } catch (err) {
      console.error('[wish] insert failed', err);
    }
    setSending(false);
    setSent(true);
  };

  const headingText = siteText.rsvp_heading || 'Trân trọng cảm ơn bạn và gia đình!';
  const headingParts = headingText.split(/(bạn và gia đình!)/);

  const showForm = mode === 'yes' && !sent;
  const showThanks = sent;

  // Thẻ cảm ơn: hiện ngay dưới nút mà khách đã chọn.
  const thanksCard = (
    <div className="rsvp-thanks">
      <div className="check">✓</div>
      <p className="title">
        {mode === 'no' ? 'Chân thành cảm ơn bạn!' : 'Đã nhận xác nhận của bạn!'}
      </p>
      <p className="body">
        {mode === 'no'
          ? 'Chúng em rất tiếc vì không thể đón tiếp bạn và gia đình trong ngày vui này. Cảm ơn bạn đã gửi những lời chúc tốt đẹp nhất đến tụi em.'
          : `Chúng em đã ghi nhận lượt tham dự của bạn${guests ? ` (${guestLabel(guests).toLowerCase()})` : ''}. Hai gia đình xin trân trọng cảm ơn và rất mong được gặp bạn.`}
      </p>
      <p className="see-you">
        {mode === 'no'
          ? 'Xin chúc bạn và gia đình mọi điều tốt lành!'
          : `Hẹn gặp bạn ngày ${parts.dd}.${parts.mm}.${parts.yyyy}`}
      </p>
    </div>
  );

  return (
    <section className="rsvp" id="rsvp">
      <div className="rsvp-inner">
        <div className="rv" data-rv>
          <span className="eyebrow">{siteText.rsvp_eyebrow || 'Xác nhận tham dự'}</span>
          <h2>
            {headingParts.length > 1
              ? headingParts.map((p, i) => (p === 'bạn và gia đình!' ? <em key={i} style={{ whiteSpace: 'nowrap' }}>{p}</em> : p))
              : headingText}
          </h2>
          <p className="rsvp-lede">{siteText.rsvp_paragraph}</p>
        </div>

        <div className="rsvp-scene" data-rv>
          <img
            className="rsvp-couple"
            src="/assets/rsvp/couple.jpg"
            alt={`Tranh minh hoạ ${config.groomShort} và ${config.brideShort} bên bờ biển`}
            width="1400"
            height="1045"
            loading="lazy"
          />
          <p>{config.groomShort} &amp; {config.brideShort} · sắp về chung một nhà</p>
        </div>

        {/* data-rv đặt ở KHUNG, không đặt trên từng nút: nút đổi className khi bấm
            → React ghi đè mất class .rv-in → nút biến mất. */}
        <div className="rsvp-picks" data-rv>
          <button
            className={`pick-card pick-yes ${mode === 'yes' ? 'active' : ''}`}
            onClick={pickYes}
            aria-pressed={mode === 'yes'}
          >
            <img className="pick-heart" src="/assets/rsvp/heart.png" width="46" height="46" alt="" aria-hidden="true" />
            <span className="title">{siteText.rsvp_attend_yes || 'Đồng ý tham dự'}</span>
            <span className="sub">{siteText.rsvp_attend_yes_sub || 'Chúng tôi sẽ đến'}</span>
          </button>

          {showForm && (
            <div className="rsvp-form">
              <div className="rsvp-fields">
                <label className="rsvp-field full">
                  <span>Họ và tên</span>
                  <input
                    type="text"
                    value={name}
                    placeholder="Nguyễn Văn A"
                    autoComplete="name"
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </label>

                <div className="rsvp-field full" role="radiogroup" aria-label="Bạn là khách của">
                  <span>Bạn là khách của</span>
                  <div className="rsvp-side">
                    {[['groom', 'Nhà trai'], ['bride', 'Nhà gái']].map(([v, label]) => (
                      <button
                        key={v}
                        type="button"
                        role="radio"
                        aria-checked={side === v}
                        className={`rsvp-side-btn ${side === v ? 'on' : ''}`}
                        onClick={() => setSide(v)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="rsvp-field">
                  <span>Số người tham dự</span>
                  <select
                    className={guests ? '' : 'is-empty'}
                    value={guests}
                    onChange={(e) => setGuests(e.target.value)}
                  >
                    <option value="" disabled>Chọn số người</option>
                    {GUEST_OPTIONS.map((v) => (
                      <option key={v} value={v}>{guestLabel(v)}</option>
                    ))}
                  </select>
                </label>

                <label className="rsvp-field">
                  <span>Số điện thoại liên hệ</span>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={phone}
                    placeholder="0912 345 678"
                    maxLength={16}
                    onChange={(e) => setPhone(formatVNPhone(e.target.value))}
                  />
                </label>

                <label className="rsvp-field full">
                  <span>Ghi chú</span>
                  <textarea
                    className="rsvp-note"
                    value={note}
                    rows={3}
                    maxLength={NOTE_MAX}
                    placeholder="Gia đình có em bé"
                    onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
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

          {showThanks && mode === 'yes' && thanksCard}

          <button
            className={`pick-card pick-no ${mode === 'no' ? 'active' : ''}`}
            onClick={pickNo}
            aria-pressed={mode === 'no'}
          >
            <img className="pick-letter" src="/assets/rsvp/envelope.png?v=2" width="62" height="62" alt="" aria-hidden="true" />
            <span className="title">{siteText.rsvp_attend_no || 'Gửi lời chúc'}</span>
            <span className="sub">{siteText.rsvp_attend_no_sub || 'Không thể tham dự'}</span>
          </button>

          {mode === 'no' && !sent && (
            <div className="rsvp-form rsvp-wish">
              <label className="rsvp-field full">
                <span>Lời chúc của bạn</span>
                <textarea
                  value={wish}
                  rows={5}
                  maxLength={WISH_MAX}
                  placeholder="Gửi đến Hiếu &amp; Minh đôi lời chúc mừng…"
                  onChange={(e) => setWish(e.target.value.slice(0, WISH_MAX))}
                />
              </label>
              <p className="rsvp-count" aria-live="polite">{wish.length}/{WISH_MAX}</p>

              <button className="rsvp-submit" onClick={() => sendWish(wish)} disabled={sending || !wish.trim()}>
                {sending ? 'Đang gửi…' : 'Gửi'}
              </button>
              <button
                className="rsvp-submit rsvp-submit--ghost"
                onClick={() => sendWish(presetWish, true)}
                disabled={sending}
              >
                Gửi form sẵn
              </button>
            </div>
          )}

          {showThanks && mode === 'no' && thanksCard}
        </div>
      </div>
    </section>
  );
}
