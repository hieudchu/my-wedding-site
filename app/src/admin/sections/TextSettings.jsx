import { useState, useEffect } from 'react';
import { useToast } from '../components/Toast';

const LABELS = {
  // Gate
  gate_tagline: 'Câu trích dẫn · Tagline',
  gate_prompt: 'Lời mời mở thiệp · Open prompt',
  gate_prompt_sub: 'Dòng phụ nút mở · Open prompt sub',
  // Details
  details_eyebrow: 'Dòng nhỏ phía trên · Eyebrow',
  details_heading: 'Tiêu đề chính · Heading',
  details_paragraph: 'Đoạn văn giới thiệu · Paragraph',
  details_carousel_hint: 'Gợi ý vuốt ảnh · Carousel hint',
  // Family
  groom_bio: 'Giới thiệu chú rể · Groom bio',
  groom_hometown: 'Quê quán chú rể · Groom hometown',
  bride_bio: 'Giới thiệu cô dâu · Bride bio',
  bride_hometown: 'Quê quán cô dâu · Bride hometown',
  // Info
  info_announce: 'Lời thông báo (Tiếng Việt) · Announce VI',
  info_announce_en: 'Lời thông báo (Tiếng Anh) · Announce EN',
  info_venue_prefix: 'Tiền tố địa điểm · Venue prefix',
  info_time_label: 'Nhãn giờ · Time label',
  info_map_button: 'Nút bản đồ · Map button',
  // Timeline
  timeline_eyebrow: 'Dòng nhỏ phía trên · Eyebrow',
  timeline_heading: 'Tiêu đề chính · Heading',
  timeline_countdown_label: 'Nhãn đếm ngược · Countdown label',
  // RSVP
  rsvp_eyebrow: 'Dòng nhỏ phía trên · Eyebrow',
  rsvp_heading: 'Tiêu đề chính · Heading',
  rsvp_paragraph: 'Đoạn văn mô tả · Paragraph',
  rsvp_attend_yes: 'Nút tham dự · Attend button',
  rsvp_attend_yes_sub: 'Dòng phụ nút tham dự · Attend sub',
  rsvp_attend_no: 'Nút từ chối · Decline button',
  rsvp_attend_no_sub: 'Dòng phụ nút từ chối · Decline sub',
  rsvp_success_title: 'Tiêu đề xác nhận thành công · Success title',
  rsvp_success_message: 'Nội dung xác nhận thành công · Success message',
  rsvp_dress_code: 'Trang phục (Tiếng Việt) · Dress code VI',
  rsvp_dress_code_en: 'Trang phục (Tiếng Anh) · Dress code EN',
  // Nav
  nav_story: 'Mục Chuyện tình · Story link',
  nav_family: 'Mục Gia đình · Family link',
  nav_invitation: 'Mục Thiệp mời · Invitation link',
  nav_timeline: 'Mục Lịch trình · Timeline link',
  nav_rsvp: 'Mục Xác nhận · RSVP link',
  // Footer
  footer_text: 'Dòng cuối trang · Footer text',
};

const SECTIONS = [
  {
    title: 'Gate · Trang mở',
    keys: ['gate_tagline', 'gate_prompt', 'gate_prompt_sub'],
  },
  {
    title: 'Details · Chuyện tình',
    keys: ['details_eyebrow', 'details_heading', 'details_paragraph', 'details_carousel_hint'],
  },
  {
    title: 'Family · Gia đình',
    keys: ['groom_bio', 'groom_hometown', 'bride_bio', 'bride_hometown'],
  },
  {
    title: 'Info · Thiệp mời',
    keys: ['info_announce', 'info_announce_en', 'info_venue_prefix', 'info_time_label', 'info_map_button'],
  },
  {
    title: 'Timeline · Lịch trình',
    keys: ['timeline_eyebrow', 'timeline_heading', 'timeline_countdown_label'],
  },
  {
    title: 'RSVP · Xác nhận',
    keys: ['rsvp_eyebrow', 'rsvp_heading', 'rsvp_paragraph', 'rsvp_attend_yes', 'rsvp_attend_yes_sub', 'rsvp_attend_no', 'rsvp_attend_no_sub', 'rsvp_success_title', 'rsvp_success_message', 'rsvp_dress_code', 'rsvp_dress_code_en'],
  },
  {
    title: 'Navigation · Điều hướng',
    keys: ['nav_story', 'nav_family', 'nav_invitation', 'nav_timeline', 'nav_rsvp'],
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
