import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatDateParts } from '../lib/config';
import ScriptName from '../components/ScriptName';
import { adultNavH } from './useAdultScrollFx';

const NOTE_MAX = 300; // = ràng buộc rsvps_message_len
const isRateLimited = (err) => err?.code === 'P0001' && err?.message === 'rate_limited';

/**
 * Xác nhận của trang /adult: chỉ họ tên + tham dự / không + lời nhắn tuỳ ý.
 * Không hỏi SĐT, số người, nhà trai / nhà gái (chủ thiệp chọn, 2026-11-17).
 *
 * Ghi vào `rsvps` với audience = 'adult'; side / guest_count / phone để trống.
 * Lời TỪ CHỐI cũng được ghi (attending = false). Không gọi .select() sau insert.
 * Lỗi mạng: vẫn cảm ơn, ghi log; bị chặn spam (rate_limited) thì báo thử lại sau.
 *
 * Thiết kế 2026-11-17: hai lựa chọn là thẻ có chấm tròn (radio), xếp dọc; nút Gửi + dòng
 * gợi ý chung một khối; sau khi gửi, nếu đầu mục đã trôi khuất thì cuộn về để thấy thẻ cảm ơn.
 */
// Tranh "sắp về chung một nhà" trong thẻ cảm ơn (như trang chính): video lặp 4 giây, chỉ phát khi
// trên màn, tắt hẳn khi Reduce motion (poster couple.jpg đứng yên).
function ACoupleLoop({ alt }) {
  const ref = useRef(null);
  useEffect(() => {
    const v = ref.current;
    if (!v || !('IntersectionObserver' in window)) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    v.muted = true; // React không ghi muted vào HTML; iOS cần nó để tự phát
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); }, { rootMargin: '300px 0px' });
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return (
    <video
      ref={ref}
      className="a-couple-art"
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

// Phong thư sau khi gửi (như trang chính): thư trượt vào phong bì, nắp gập, dấu son, rồi tan tại
// chỗ; thẻ cảm ơn hiện dần đúng chỗ đó. key đổi mỗi lần gửi → chạy lại khi gửi lần nữa.
function AEnvelope({ config }) {
  return (
    <div className="a-env" aria-hidden="true">
      <div className="a-env-box">
        <div className="a-env-back" />
        <div className="a-env-letter a-script"><ScriptName full={config.groomShort} />&nbsp;<em>&amp;</em>&nbsp;<ScriptName full={config.brideShort} /></div>
        <div className="a-env-front" />
        <div className="a-env-flap" />
      </div>
    </div>
  );
}

export default function AdultRSVP({ config, venueTitle, partyTime }) {
  const [name, setName] = useState('');
  const [attending, setAttending] = useState(null); // true | false | null
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(null); // null | 'yes' | 'no'
  const [limited, setLimited] = useState(false);
  const [sendN, setSendN] = useState(0); // đếm lần gửi → key cho phong thư
  const sectionRef = useRef(null);
  const bodyRef = useRef(null);
  const fromH = useRef(0); // chiều cao khối trước khi đổi form ↔ thẻ cảm ơn
  const d = formatDateParts(config.weddingDate);

  const ready = name.trim() && attending !== null;
  const missing = !name.trim() && attending === null
    ? 'Xin Quý khách điền họ tên và chọn tham dự hay không'
    : !name.trim() ? 'Xin Quý khách điền họ tên'
      : attending === null ? 'Xin Quý khách chọn tham dự hay không' : '';

  // Đổi form ↔ thẻ cảm ơn không giật (chạy trước khi vẽ, useLayoutEffect):
  //  1. đưa đầu khối về ngay dưới nav nếu nó đã trôi khuất / quá thấp (cuộn mượt, cùng lúc phong thư
  //     bắt đầu) → phong thư hiện đúng chỗ khách đang nhìn;
  //  2. chiều cao khối trượt mượt từ cũ sang mới (chỉ transition height, GPU không phải vẽ lại ảnh),
  //     phần bên dưới (chân trang) không bị giật lên / xuống.
  useLayoutEffect(() => {
    const el = bodyRef.current;
    const h0 = fromH.current;
    fromH.current = 0;
    if (!el || !h0) return undefined;
    const nav = adultNavH();
    const top = el.getBoundingClientRect().top;
    if (top < nav + 12 || top > window.innerHeight * 0.45) {
      // cuộn mượt song song với phong thư + chiều cao khối (không giật tức thì); Reduce motion → nhảy thẳng
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: window.scrollY + top - nav - 12, behavior: reduce ? 'auto' : 'smooth' });
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const h1 = el.offsetHeight;
    if (Math.abs(h1 - h0) < 2) return undefined;
    el.style.height = `${h0}px`;
    el.style.overflow = 'hidden';
    el.getBoundingClientRect(); // chốt chiều cao cũ trước khi bật transition
    el.style.transition = 'height 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
    el.style.height = `${h1}px`;
    const t = setTimeout(() => { el.style.height = ''; el.style.overflow = ''; el.style.transition = ''; }, 650);
    return () => clearTimeout(t);
  }, [sent]);
  const keepH = () => { if (bodyRef.current) fromH.current = bodyRef.current.offsetHeight; };

  const submit = async (e) => {
    e.preventDefault();
    if (sending || !ready) return;
    setSending(true);
    setLimited(false);
    const row = {
      name: name.trim().slice(0, 120),
      attending,
      audience: 'adult',
      message: note.trim().slice(0, NOTE_MAX) || null,
    };
    try {
      const { error } = await supabase.from('rsvps').insert(row);
      if (error) throw error;
    } catch (err) {
      if (isRateLimited(err)) { setSending(false); setLimited(true); return; }
      console.error('[adult-rsvp] insert failed', err);
    }
    setSending(false);
    keepH();
    setSendN((n) => n + 1);
    setSent(attending ? 'yes' : 'no');
  };

  // Hàm vẽ (không phải component lồng) để nút giữ nguyên khi chọn → không mất focus
  const opt = (value, children) => (
    <button
      type="button"
      role="radio"
      aria-checked={attending === value}
      className={`a-opt ${value ? 'a-opt-yes' : 'a-opt-no'} ${attending === value ? 'on' : ''}`}
      onClick={() => setAttending(value)}
    >
      <img
        className="a-opt-ico"
        src={value ? '/assets/icons/timeline-glasses.png' : '/assets/rsvp/envelope.png'}
        alt=""
        aria-hidden="true"
      />
      <span>{children}</span>
    </button>
  );

  return (
    <section className="a-rsvp" id="xac-nhan" ref={sectionRef} aria-labelledby="a-rsvp-title">
      <div className="a-rsvp-head">
        <span className="a-rule a-rule--paper" aria-hidden="true" data-sp="">❖</span>
        <p className="a-eyebrow a-fx" data-sp="">Xác nhận tham dự</p>
        <h2 id="a-rsvp-title" className="a-rsvp-title a-fx" data-sp="">Kính mong<br />Quý khách hồi âm</h2>
        <p className="a-rsvp-lead a-fx" data-sp="">
          Để gia đình chúng tôi được chu đáo đón tiếp, xin Quý khách vui lòng cho biết
          có thể tới dự hay không.
        </p>
      </div>

      <div className="a-rsvp-body a-fx" ref={bodyRef} data-sp="">
        {sent && sendN > 0 && <AEnvelope key={sendN} config={config} />}
        {sent ? (
          <div className="a-thanks" data-env={sendN > 0 ? '' : undefined} role="status">
            <img src="/assets/icons/medallion-wine.png" alt="" />
            {sent === 'yes' ? (
              <>
                <h3>Trân trọng cảm ơn Quý khách</h3>
                <p>
                  Gia đình chúng tôi rất hân hạnh được đón tiếp Quý khách
                  vào {partyTime} ngày {d.dd}.{d.mm}.{d.yyyy} tại {venueTitle}.
                </p>
              </>
            ) : (
              <>
                <h3>Trân trọng cảm ơn Quý khách đã hồi âm</h3>
                <p>Gia đình chúng tôi xin ghi nhận và cảm ơn tình cảm Quý khách đã dành cho các con.</p>
              </>
            )}
            <figure className="a-thanks-art">
              <ACoupleLoop alt={`Tranh minh hoạ ${config.groomShort} và ${config.brideShort} bên bờ biển`} />
            </figure>
            <button type="button" className="a-link" onClick={() => { keepH(); setSent(null); }}>Sửa lại xác nhận</button>
          </div>
        ) : (
          <form className="a-form" onSubmit={submit} noValidate>
            <label className="a-field">
              <span className="a-label">Họ và tên</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
                autoComplete="name"
                enterKeyHint="next"
                placeholder="Ví dụ: Nguyễn Văn An"
                required
              />
            </label>

            <div className="a-field a-choice">
              <span className="a-label" id="a-choice-label">Quý khách có thể tới dự?</span>
              <div className="a-choice-row" role="radiogroup" aria-labelledby="a-choice-label">
                {opt(true, 'Tôi sẽ tham dự')}
                {opt(false, 'Rất tiếc, tôi không thể đến')}
              </div>
            </div>

            <label className="a-field">
              <span className="a-label a-label-row">
                <span>Lời nhắn gửi gia đình</span>
                <small>{note.length ? `${note.length}/${NOTE_MAX}` : 'Không bắt buộc'}</small>
              </span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
                rows={3}
                placeholder="Lời chúc hoặc điều Quý khách muốn nhắn"
              />
            </label>

            {limited && (
              <p className="a-alert" role="alert">
                Quý khách đã gửi nhiều lần trong ít phút. Xin vui lòng thử lại sau ít phút.
              </p>
            )}

            <div className="a-send">
              <button type="submit" className="a-btn a-btn-red a-submit" disabled={!ready || sending}>
                {sending ? 'Đang gửi…' : 'Gửi xác nhận'}
              </button>
              {!ready && <p className="a-hint">{missing}</p>}
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
