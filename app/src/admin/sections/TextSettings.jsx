import { useState, useEffect } from 'react';
import { useToast } from '../components/Toast';

/* Chỉ những chữ trang khách THẬT SỰ hiện ra (đối chiếu 11/2026 bằng cách thay mọi giá trị
   site_text bằng chuỗi đánh dấu rồi xem ở máy tính, điện thoại dọc/ngang, tablet). Đã bỏ:
   gate_prompt(_sub) — không còn cổng mở thiệp; groom_bio — bị ẩn ở mọi màn hình;
   info_announce_en, rsvp_success_*, rsvp_dress_code(_en) — không component nào đọc.
   Hàng trong site_config vẫn còn, chỉ không hiện ở đây nữa. */
const LABELS = {
  // Gate
  gate_tagline: 'Câu trích dẫn · Tagline',
  // Family
  groom_hometown: 'Quê quán chú rể · Groom hometown',
  bride_bio: 'Giới thiệu cô dâu · Bride bio (chỉ hiện trên điện thoại)',
  bride_hometown: 'Quê quán cô dâu · Bride hometown',
  // Info
  info_announce: 'Lời thông báo (Tiếng Việt) · Announce VI',
  info_venue_prefix: 'Tiền tố địa điểm · Venue prefix',
  info_time_label: 'Nhãn giờ · Time label (chỉ hiện trên máy tính)',
  info_map_button: 'Nút bản đồ · Map button',
  // Timeline
  timeline_eyebrow: 'Dòng nhỏ phía trên · Eyebrow',
  timeline_heading: 'Tiêu đề chính · Heading',
  timeline_countdown_label: 'Nhãn đếm ngược · Countdown label',
  // RSVP
  rsvp_eyebrow: 'Dòng nhỏ phía trên · Eyebrow (chỉ hiện trên máy tính)',
  rsvp_heading: 'Tiêu đề chính · Heading',
  rsvp_paragraph: 'Đoạn văn mô tả · Paragraph',
  rsvp_attend_yes: 'Nút tham dự · Attend button',
  rsvp_attend_yes_sub: 'Dòng phụ nút tham dự · Attend sub',
  rsvp_attend_no: 'Nút từ chối · Decline button',
  rsvp_attend_no_sub: 'Dòng phụ nút từ chối · Decline sub',
  // Nav
  nav_family: 'Mục Gia đình · Family link',
  nav_invitation: 'Mục Thiệp mời · Invitation link',
  nav_timeline: 'Mục Lịch trình · Timeline link',
  nav_rsvp: 'Mục Xác nhận · RSVP link',
  // Footer
  footer_text: 'Dòng cuối trang · Footer text',
};

const SECTIONS = [
  {
    title: 'Mở đầu · Hero',
    keys: ['gate_tagline'],
  },
  {
    title: 'Family · Gia đình',
    keys: ['groom_hometown', 'bride_hometown', 'bride_bio'],
  },
  {
    title: 'Info · Thiệp mời',
    keys: ['info_announce', 'info_venue_prefix', 'info_time_label', 'info_map_button'],
  },
  {
    title: 'Timeline · Lịch trình',
    keys: ['timeline_eyebrow', 'timeline_heading', 'timeline_countdown_label'],
  },
  {
    title: 'RSVP · Xác nhận',
    keys: ['rsvp_eyebrow', 'rsvp_heading', 'rsvp_paragraph', 'rsvp_attend_yes', 'rsvp_attend_yes_sub', 'rsvp_attend_no', 'rsvp_attend_no_sub'],
  },
  {
    title: 'Navigation · Điều hướng',
    keys: ['nav_family', 'nav_invitation', 'nav_timeline', 'nav_rsvp'],
  },
  {
    title: 'Footer',
    keys: ['footer_text'],
  },
];

export default function TextSettings({ adminConfig }) {
  const { configs, getValue, saveMultiple, saving } = adminConfig;
  const { toast, ToastEl } = useToast();
  const [values, setValues] = useState({});

  useEffect(() => {
    const v = {};
    SECTIONS.forEach((s) => s.keys.forEach((k) => { v[k] = getValue(k); }));
    setValues(v);
  }, [configs]);

  const handleSave = async () => {
    const ok = await saveMultiple(values);
    toast(ok ? 'Saved!' : 'Error saving');
  };

  const isTextarea = (key) =>
    key.includes('paragraph') || key.includes('bio') || key.includes('dress_code') || key.includes('tagline');

  return (
    <div>
      <h1>Nội dung · Text Content</h1>
      <p className="page-desc">Chỉnh sửa các đoạn văn bản trên trang cưới theo từng section</p>

      {SECTIONS.map((section) => (
        <div key={section.title} className="admin-card">
          <h3>{section.title}</h3>
          {section.keys.map((key) => (
            <div key={key} className="admin-field">
              <label>{LABELS[key] || configs[key]?.label || key}</label>
              {isTextarea(key) ? (
                <textarea
                  value={values[key] || ''}
                  onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                  rows={3}
                />
              ) : (
                <input
                  type="text"
                  value={values[key] || ''}
                  onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                />
              )}
            </div>
          ))}
        </div>
      ))}

      <div className="admin-actions">
        <button className="admin-btn admin-btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Lưu thay đổi · Save'}
        </button>
      </div>
      {ToastEl}
    </div>
  );
}
