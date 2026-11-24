import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import IntroMusic from './IntroMusic';
import './IntroSwitch.css';

/**
 * Công tắc bật/tắt video mở đầu của trang khách (`IntroVideo.jsx`).
 * site_config `intro_video`: 'off' = tắt; mọi giá trị khác (kể cả chưa có hàng) = bật.
 * Lưu ngay khi gạt — upsert, vì hàng có thể chưa tồn tại trên cơ sở dữ liệu.
 */
const KEY = 'intro_video';

export default function IntroSwitch({ adminConfig, toast }) {
  const { getValue, refetch } = adminConfig;
  const saved = getValue(KEY) !== 'off';
  const [pending, setPending] = useState(null); // giá trị đang lưu
  const on = pending ?? saved;

  const flip = async () => {
    const next = !on;
    setPending(next);
    const { error } = await supabase.from('site_config').upsert(
      {
        key: KEY,
        value: next ? 'on' : 'off',
        section: 'general',
        label: 'Video mở đầu trang khách (on/off)',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' },
    );
    if (error) {
      setPending(null);
      toast('Không lưu được — thử lại');
      return;
    }
    await refetch();
    setPending(null);
    toast(next ? 'Đã bật video mở đầu' : 'Đã tắt video mở đầu');
  };

  // Xem lại như khách mới: trang nhớ "đã xem" ở localStorage (intro/plan.js, cùng tên miền với admin) → xoá rồi mở
  // trang chính ở tab mới. Chỉ máy này; không đổi gì trên trang.
  const replay = () => {
    try { localStorage.removeItem('hm-intro-seen'); } catch { /* chế độ riêng tư */ }
    window.open('/', '_blank', 'noopener');
  };

  return (
    <div className="admin-card intro-switch">
      <div className="is-text">
        <h3>Video mở đầu · Intro video</h3>
        <p>
          Khách mở trang thiệp thấy phong bì; chạm mở thì lần đầu xem video cưới (~13 giây), những lần
          sau phong bì chỉ mở ra thẻ đỏ (~3 giây). Tắt thì không có cả phong bì lẫn video — khách vào thẳng
          trang. Có hiệu lực từ lần tải trang kế tiếp.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Video mở đầu"
        className={`is-toggle ${on ? 'on' : ''}`}
        onClick={flip}
        disabled={pending !== null}
      >
        <span className="is-knob" />
      </button>
      <span className={`is-state ${on ? 'on' : ''}`}>{on ? 'Đang bật' : 'Đang tắt'}</span>
      <div className="is-replay">
        <button type="button" className="admin-btn admin-btn-secondary" onClick={replay} disabled={!on}>
          Xem lại như khách mới ↗
        </button>
        <span>Mở trang thiệp ở tab mới với phong bì + video đầy đủ (máy này đã xem rồi thì bình thường chỉ thấy bản ngắn).</span>
      </div>
      <IntroMusic adminConfig={adminConfig} toast={toast} />
    </div>
  );
}
