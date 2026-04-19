import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { formatDateParts } from '../lib/config';
import MediaImage from './MediaImage';

export default function RSVP({ config }) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    attend: '',
    guests: '1',
    side: 'bride',
    dietary: '',
    message: '',
  });
  const [nameStatus, setNameStatus] = useState({ state: 'idle', msg: '' });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef(null);

  const checkDuplicate = (name) => {
    clearTimeout(timerRef.current);
    if (!name.trim()) {
      setNameStatus({ state: 'idle', msg: '' });
      return;
    }
    setNameStatus({ state: 'checking', msg: 'Đang kiểm tra trùng tên · Checking…' });
    timerRef.current = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('rsvps')
          .select('name')
          .ilike('name', name.trim());

        if (error) throw error;

        if (data && data.length > 0) {
          setNameStatus({
            state: 'error',
            msg: `"${name}" đã xác nhận trước đó. Bạn có muốn sửa lại? · already confirmed.`,
          });
        } else {
          setNameStatus({ state: 'ok', msg: 'Tên hợp lệ · Name available' });
        }
      } catch {
        // Fallback to localStorage if Supabase is not configured
        const list = JSON.parse(localStorage.getItem('rsvp_names') || '[]');
        const dup = list.some((n) => n.trim().toLowerCase() === name.trim().toLowerCase());
        if (dup) {
          setNameStatus({
            state: 'error',
            msg: `"${name}" đã xác nhận trước đó. Bạn có muốn sửa lại? · already confirmed.`,
          });
        } else {
          setNameStatus({ state: 'ok', msg: 'Tên hợp lệ · Name available' });
        }
      }
    }, 700);
  };

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.attend) return;
    if (nameStatus.state === 'error') return;

    setSubmitting(true);

    try {
      const { error } = await supabase.from('rsvps').insert({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        attending: form.attend === 'yes',
        guest_count: parseInt(form.guests, 10),
        side: form.side,
        dietary: form.dietary,
        message: form.message.trim(),
      });

      if (error) throw error;
    } catch {
      // Fallback to localStorage if Supabase is not configured
      const list = JSON.parse(localStorage.getItem('rsvp_names') || '[]');
      list.push(form.name);
      localStorage.setItem('rsvp_names', JSON.stringify(list));
    }

    setSubmitting(false);
    setSubmitted(true);
    setTimeout(
      () => document.getElementById('rsvp')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      50
    );
  };

  return (
    <section className="rsvp" id="rsvp">
      <div className="container">
        <div className="rsvp-head reveal">
          <MediaImage
            storagePath="icons/medallion-ink.png"
            localFallback="/assets/medallion-ink.png"
            alt=""
            className="medallion-ink"
            style={{ width: 90, height: 'auto', objectFit: 'contain' }}
          />
          <span className="eyebrow">RSVP · Xác nhận tham dự</span>
          <h2>
            Cảm ơn bạn đã <em>đến với chúng em</em>
          </h2>
          <p>
            Sự hiện diện của bạn là món quà quý giá nhất. Xin bạn vui lòng xác nhận
            trước ngày 25.10.2026 để chúng em chuẩn bị chu đáo.
          </p>
        </div>

        <form className="rsvp-form reveal d1" onSubmit={handleSubmit}>
          {submitted ? (
            <div className="success-card show">
              <div className="check">✓</div>
              <h3>Đã xác nhận</h3>
              <p>
                Cảm ơn {form.name}! Chúng em sẽ liên lạc lại với bạn sớm nhất.
                <br />
                <em>
                  See you on {formatDateParts(config.weddingDate).dd}.
                  {formatDateParts(config.weddingDate).mm}.
                  {formatDateParts(config.weddingDate).yyyy}
                </em>
              </p>
            </div>
          ) : (
            <>
              <div className="attend-toggle">
                <button
                  type="button"
                  className={form.attend === 'yes' ? 'active' : ''}
                  onClick={() => update('attend', 'yes')}
                >
                  Tham dự
                  <span className="sub">Yes, I'll be there</span>
                </button>
                <button
                  type="button"
                  className={form.attend === 'no' ? 'active' : ''}
                  onClick={() => update('attend', 'no')}
                >
                  Gửi lời chúc
                  <span className="sub">Can't make it</span>
                </button>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>Họ và tên · Full name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => {
                      update('name', e.target.value);
                      checkDuplicate(e.target.value);
                    }}
                    placeholder="VD: Nguyễn Văn A"
                    required
                  />
                  {nameStatus.msg && (
                    <div
                      className={`hint ${nameStatus.state === 'error' ? 'error' : nameStatus.state === 'ok' ? 'ok' : ''}`}
                    >
                      <span
                        className={`check-icon ${nameStatus.state === 'checking' ? 'checking' : nameStatus.state === 'ok' ? 'ok' : ''}`}
                      />
                      {nameStatus.msg}
                    </div>
                  )}
                </div>
                <div className="form-field">
                  <label>Số điện thoại · Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => update('phone', e.target.value)}
                    placeholder="09xx xxx xxx"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div className="form-field">
                  <label>Bạn là khách của · You're with</label>
                  <select value={form.side} onChange={(e) => update('side', e.target.value)}>
                    <option value="bride">Nhà gái · Bride's side</option>
                    <option value="groom">Nhà trai · Groom's side</option>
                    <option value="both">Cả hai · Both</option>
                  </select>
                </div>
              </div>

              {form.attend === 'yes' && (
                <div className="form-row">
                  <div className="form-field">
                    <label>Số người tham dự · Guests</label>
                    <select value={form.guests} onChange={(e) => update('guests', e.target.value)}>
                      <option value="1">1 người · Just me</option>
                      <option value="2">2 người · +1</option>
                      <option value="3">3 người</option>
                      <option value="4">4 người</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Yêu cầu ăn uống · Dietary</label>
                    <select value={form.dietary} onChange={(e) => update('dietary', e.target.value)}>
                      <option value="">Không có · None</option>
                      <option value="veg">Chay · Vegetarian</option>
                      <option value="halal">Halal</option>
                      <option value="allergy">Dị ứng · Allergy (please note)</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="form-row full">
                <div className="form-field">
                  <label>Lời nhắn · Message to the couple</label>
                  <textarea
                    rows="3"
                    value={form.message}
                    onChange={(e) => update('message', e.target.value)}
                    placeholder="Gửi đôi lời chúc phúc…"
                  />
                </div>
              </div>

              <div className="dress-code">
                <div className="icon">♡</div>
                <div className="txt">
                  <h5>Dress code · Semi-formal</h5>
                  <p>
                    Tông màu gợi ý: kem, be, vàng ánh kim, burgundy — để cùng hoà vào không khí ấm
                    áp của buổi tiệc.
                    <br />
                    <em>Suggested palette: cream, beige, gold, burgundy.</em>
                  </p>
                </div>
              </div>

              <div className="submit-row">
                <div className="legal">
                  Bằng việc xác nhận, bạn đồng ý để chúng em lưu thông tin phục vụ việc sắp xếp chỗ
                  ngồi.
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!form.name || !form.attend || nameStatus.state === 'error' || submitting}
                >
                  {submitting ? 'Đang gửi…' : 'Xác nhận · Confirm'}
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </section>
  );
}
