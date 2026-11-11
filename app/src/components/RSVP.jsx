import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { formatDateParts } from '../lib/config';
import { formatVNPhone, toE164VN, GUEST_OPTIONS, guestLabel } from '../lib/phone';
import { mqMatches, PHONE_QUERY } from '../hooks/useViewport';

const WISH_MAX = 500;

/**
 * Video lặp "sắp về chung một nhà" (4 giây, không tiếng, 2,1 MB). Tranh couple.jpg làm poster:
 * hiện ngay, và là thứ khách thấy khi video không chạy được (iPhone chế độ tiết kiệm pin,
 * người bật giảm chuyển động). preload="none" + chỉ tải/phát khi sắp cuộn tới, dừng khi
 * ra khỏi màn — khách không cuộn tới RSVP không tốn 2 MB.
 */
function CoupleLoop({ alt }) {
  const ref = useRef(null);
  useEffect(() => {
    const v = ref.current;
    if (!v || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    v.muted = true; // React không ghi thuộc tính muted vào HTML; iOS cần nó để tự phát
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { rootMargin: '300px 0px' }
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return (
    <video
      ref={ref}
      className="rsvp-couple"
      src="/assets/rsvp/couple-loop.mp4"
      poster="/assets/rsvp/couple.jpg"
      width="1400"
      height="1044"
      muted
      loop
      playsInline
      preload="none"
      disablePictureInPicture
      aria-label={alt}
    />
  );
}


const NOTE_MAX = 300;

/**
 * Xác nhận tham dự. Dùng chung cho MỌI màn hình, kể cả desktop.
 *
 * Hai nút lớn loại trừ nhau; bấm lại nút đang chọn thì đóng phần đang mở mà vẫn
 * giữ nội dung đã gõ. Thứ tự DOM: nút Đồng ý → form → thẻ cảm ơn (yes) →
 * nút Gửi lời chúc → ô lời chúc → thẻ cảm ơn (no), để mỗi phần mở ra ngay dưới
 * nút của nó.
 *
 * "Đồng ý tham dự" ghi vào bảng `rsvps`; "Gửi lời chúc" ghi vào bảng `wishes`.
 * Cả hai form đều bắt buộc họ tên, và dùng CHUNG một ô tên: khách gõ tên ở form này
 * rồi đổi sang form kia thì không phải gõ lại.
 *
 * Ô nhập cao 56px và chữ 17px: dưới 16px là iOS Safari tự phóng to trang mỗi lần
 * khách bấm vào ô.
 */
/** Lỗi do trigger chống spam trong database (raise 'rate_limited'). */
const isRateLimited = (err) => err?.code === 'P0001' && err?.message === 'rate_limited';

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
  // Database chặn vì gửi quá nhiều lần (trigger guard_guest_submit, migration
  // 20261111000400) → không hiện lời cảm ơn, mà nhắc khách thử lại sau.
  const [limited, setLimited] = useState(false);

  const parts = formatDateParts(config.weddingDate);

  const picksRef = useRef(null);
  // Tải sẵn tranh của thẻ cảm ơn (desktop) để thẻ hiện đúng kích thước ngay khi gửi
  useEffect(() => { const img = new Image(); img.src = '/assets/rsvp/couple.jpg'; }, []);

  // Giữ chiều cao khung khi form đổi sang thẻ cảm ơn → phần dưới không bị xô lên/xuống.
  // Bấm lại một nút thì nhả ra.
  // Chỉ desktop: ở điện thoại thẻ cảm ơn thấp hơn form, giữ chiều cao sẽ để lại khoảng trống.
  const holdHeight = () => {
    const el = picksRef.current;
    if (el && !mqMatches(PHONE_QUERY)) el.style.minHeight = `${el.offsetHeight}px`;
  };
  const releaseHeight = () => { const el = picksRef.current; if (el) el.style.minHeight = ''; };

  // Lời chúc có sẵn cho khách muốn gửi nhanh, không phải gõ.
  const presetWish = `Chúc ${config.groomShort} & ${config.brideShort} trăm năm hạnh phúc, mãi bên nhau yêu thương và đầm ấm!`;

  // Bấm lại nút đang chọn → đóng form / thẻ cảm ơn (nội dung đã điền vẫn giữ nếu mở lại)
  const pickYes = () => { releaseHeight(); setSent(false); setLimited(false); setMode((m) => (m === 'yes' ? null : 'yes')); };
  const pickNo = () => { releaseHeight(); setSent(false); setLimited(false); setMode((m) => (m === 'no' ? null : 'no')); };

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
      if (isRateLimited(err)) { setSending(false); setLimited(true); return; }
      // Không chặn khách lại vì lỗi mạng — vẫn hiện lời cảm ơn, nhưng ghi log
      // để chủ nhà còn lần ra được khi đối soát danh sách.
      console.error('[rsvp] insert failed', err);
    }
    setSending(false);
    setLimited(false);
    holdHeight();
    setSent(true);
  };

  const sendWish = async (text, isPreset = false) => {
    const msg = (text || '').trim().slice(0, WISH_MAX);
    const who = name.trim().slice(0, 120);
    if (sending || !msg || !who) return;
    setSending(true);
    try {
      const { error } = await supabase.from('wishes').insert({ name: who, message: msg, is_preset: isPreset });
      if (error) throw error;
    } catch (err) {
      if (isRateLimited(err)) { setSending(false); setLimited(true); return; }
      console.error('[wish] insert failed', err);
    }
    setSending(false);
    setLimited(false);
    holdHeight();
    setSent(true);
  };

  const headingText = siteText.rsvp_heading || 'Trân trọng cảm ơn Quý khách!';
  const headingParts = headingText.split(/(Quý khách!)/);

  const showForm = mode === 'yes' && !sent;
  const showThanks = sent;

  // Desktop: phong thư gập lại rồi tan ngay tại chỗ thẻ cảm ơn sắp hiện (desktop.css ẩn ở điện thoại)
  const envelope = (
    <div className="d-env" aria-hidden="true">
      <div className="d-env-box">
        <div className="d-env-back" />
        <div className="d-env-letter"><span>Hiếu &amp; Minh</span></div>
        <div className="d-env-front" />
        <div className="d-env-flap" />
      </div>
    </div>
  );

  const limitNote = limited && (
    <p role="alert" style={{ margin: '14px 0 0', textAlign: 'center', color: 'var(--red)', fontSize: 16, lineHeight: 1.5 }}>
      Quý khách đã gửi nhiều lần liên tiếp. Kính mong Quý khách vui lòng thử lại sau ít phút.
    </p>
  );

  // Thẻ cảm ơn: hiện ngay dưới nút mà khách đã chọn.
  const thanksCard = (
    <div className="rsvp-thanks">
      <div className="check">✓</div>
      <p className="title">
        {mode === 'no' ? 'Chân thành cảm ơn Quý khách!' : 'Đã nhận xác nhận của Quý khách!'}
      </p>
      <p className="body">
        {mode === 'no'
          ? <>Chúng em rất tiếc vì không được đón tiếp Quý khách và gia đình trong ngày vui này.{' '}<br className="d-br" />Xin chân thành cảm ơn những lời chúc tốt đẹp Quý khách đã gửi đến chúng em.</>
          : `Chúng em đã ghi nhận sự tham dự của Quý khách${guests ? ` (${guestLabel(guests).toLowerCase()})` : ''}. Hai gia đình xin trân trọng cảm ơn và rất mong được đón tiếp Quý khách.`}
      </p>
      <p className="see-you">
        {mode === 'no'
          ? 'Kính chúc Quý khách và gia đình mọi điều tốt lành!'
          : `Hẹn gặp Quý khách ngày ${parts.dd}.${parts.mm}.${parts.yyyy}`}
      </p>
      {/* Desktop: tranh "sắp về chung một nhà" nằm trong thẻ cảm ơn (điện thoại ẩn) */}
      <figure className="rsvp-thanks-art">
        <img
          src="/assets/rsvp/couple.jpg"
          alt={`Tranh minh hoạ ${config.groomShort} và ${config.brideShort} bên bờ biển`}
          width="1400"
          height="1045"
        />
      </figure>
    </div>
  );

  return (
    <section className="rsvp" id="rsvp">
      <div className="rsvp-inner">
        <div className="rv" data-rv>
          <span className="eyebrow">{siteText.rsvp_eyebrow || 'Xác nhận tham dự'}</span>
          <h2>
            {headingParts.length > 1
              ? headingParts.map((p, i) => (p === 'Quý khách!' ? <em key={i} style={{ whiteSpace: 'nowrap' }}>{p}</em> : p))
              : headingText}
          </h2>
          <p className="rsvp-lede">{siteText.rsvp_paragraph}</p>
        </div>

        <div className="rsvp-scene" data-rv>
          <CoupleLoop alt={`Tranh minh hoạ ${config.groomShort} và ${config.brideShort} bên bờ biển`} />
          <p>{config.groomShort} &amp; {config.brideShort} · sắp về chung một nhà</p>
        </div>

        {/* data-rv đặt ở KHUNG, không đặt trên từng nút: nút đổi className khi bấm
            → React ghi đè mất class .rv-in → nút biến mất. */}
        <div className="rsvp-picks" data-rv ref={picksRef}>
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

                <div className="rsvp-field full" role="radiogroup" aria-label="Khách mời của">
                  <span>Khách mời của</span>
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
              {limitNote}

              <p className="rsvp-invite">Trân trọng kính mời</p>
              <p className="rsvp-quote">
                “Sự hiện diện của Quý khách và gia đình là niềm hạnh phúc lớn nhất trong ngày trọng đại của chúng em.”
              </p>
            </div>
          )}

          {showThanks && mode === 'yes' && <>{envelope}{thanksCard}</>}

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
                <label className="rsvp-field full">
                  <span>Lời chúc gửi cô dâu chú rể</span>
                  <textarea
                    value={wish}
                    rows={5}
                    maxLength={WISH_MAX}
                    placeholder="Gửi đến Hiếu &amp; Minh đôi lời chúc mừng…"
                    onChange={(e) => setWish(e.target.value.slice(0, WISH_MAX))}
                  />
                </label>
              </div>
              <p className="rsvp-count" aria-live="polite">{wish.length}/{WISH_MAX}</p>

              <button className="rsvp-submit" onClick={() => sendWish(wish)} disabled={sending || !name.trim() || !wish.trim()}>
                {sending ? 'Đang gửi…' : 'Gửi'}
              </button>
              <button
                className="rsvp-submit rsvp-submit--ghost"
                onClick={() => sendWish(presetWish, true)}
                disabled={sending || !name.trim()}
              >
                Gửi form sẵn
              </button>
              {limitNote}
            </div>
          )}

          {showThanks && mode === 'no' && <>{envelope}{thanksCard}</>}
        </div>
      </div>
    </section>
  );
}
