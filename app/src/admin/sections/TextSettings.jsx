import { useToast } from '../components/Toast';
import { useConfigForm } from '../components/useAdminConfig';

/* Chỉ những chữ trang khách THẬT SỰ hiện ra (đối chiếu 11/2026 bằng cách thay mọi giá trị
   site_text bằng chuỗi đánh dấu rồi xem ở máy tính, điện thoại dọc/ngang, tablet). Đã bỏ:
   gate_prompt(_sub) — không còn cổng mở thiệp; groom_bio — bị ẩn ở mọi màn hình;
   info_announce_en, rsvp_success_*, rsvp_dress_code(_en) — không component nào đọc.
   Hàng trong site_config vẫn còn, chỉ không hiện ở đây nữa. */
const LABELS = {
  // Thẻ đỏ đầu trang (cả trang chính lẫn thiệp bố mẹ)
  hero_kicker: 'Dòng nhỏ trên tên · Kicker',
  couple_groom_full: 'Tên chú rể trên thẻ (chữ viết tay) · Groom name',
  couple_bride_full: 'Tên cô dâu trên thẻ (chữ viết tay) · Bride name',
  // Gate
  gate_tagline: 'Câu trích dẫn · Tagline',
  // Family
  groom_hometown: 'Quê quán chú rể · Groom hometown',
  bride_bio: 'Giới thiệu cô dâu · Bride bio (chỉ hiện trên điện thoại)',
  bride_hometown: 'Quê quán cô dâu · Bride hometown',
  // Info
  info_heading: 'Tiêu đề thẻ thiệp mời · Heading',
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

/* Chữ khách đang thấy khi ô còn trống (mặc định trong code) — hiện mờ trong ô để biết sẽ sửa cái gì.
   Ô trống → trang giữ chữ này; chỉ khi gõ chữ khác rồi Lưu mới đổi. */
const DEFAULTS = {
  hero_kicker: 'Thiệp cưới',
  couple_groom_full: 'Đăng Hiếu',
  couple_bride_full: 'Thiện Minh',
  info_heading: 'Lễ thành hôn',
  info_announce: 'Trân trọng báo tin',
  info_venue_prefix: 'Tại',
  info_time_label: 'Hôn lễ bắt đầu lúc',
  info_map_button: 'Xem bản đồ',
  timeline_eyebrow: 'Lịch trình',
  timeline_heading: 'Một ngày trọn vẹn',
  timeline_countdown_label: 'Cùng đếm ngược đến ngày vui',
  rsvp_eyebrow: 'Xác nhận tham dự',
  rsvp_heading: 'Trân trọng cảm ơn Quý khách!',
  rsvp_attend_yes: 'Đồng ý tham dự',
  rsvp_attend_yes_sub: 'Chúng tôi sẽ đến',
  rsvp_attend_no: 'Gửi lời chúc',
  rsvp_attend_no_sub: 'Không thể tham dự',
  nav_family: 'Gia đình',
  nav_invitation: 'Thiệp mời',
  nav_timeline: 'Lịch trình',
  nav_rsvp: 'Xác nhận',
  footer_text: 'With love · Made for our beloved guests',
};

const SECTIONS = [
  {
    title: 'Thẻ đỏ đầu trang · Hero card',
    note: 'Hiện trên thẻ đỏ đầu trang chính và thiệp bố mẹ mời. Tên viết bằng chữ viết tay TAN Whistling: font thiếu vài chữ có dấu (đã tự vẽ thêm ế, ệ) — đổi tên thì xem lại trên trang.',
    keys: ['hero_kicker', 'couple_groom_full', 'couple_bride_full'],
  },
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
    keys: ['info_heading', 'info_announce', 'info_venue_prefix', 'info_time_label', 'info_map_button'],
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

const ALL_KEYS = SECTIONS.flatMap((s) => s.keys);
const META = Object.fromEntries(ALL_KEYS.map((k) => [k, { label: LABELS[k], section: 'text' }]));

export default function TextSettings({ adminConfig }) {
  const { configs, saveMultiple, saving } = adminConfig;
  const { toast, ToastEl } = useToast();
  // useConfigForm: tải lại cài đặt không xoá chữ đang gõ dở
  const [values, setValues] = useConfigForm(adminConfig, ALL_KEYS);

  const handleSave = async () => {
    const ok = await saveMultiple(values, META);
    toast(ok ? 'Đã lưu' : 'Không lưu được — thử lại');
  };

  const isTextarea = (key) =>
    key.includes('paragraph') || key.includes('bio') || key.includes('dress_code') || key.includes('tagline');

  return (
    <div>
      <h1>Nội dung · Text Content</h1>
      <p className="page-desc">Chỉnh sửa các đoạn văn bản trên trang cưới theo từng section. Ô để trống = giữ chữ mặc định (chữ mờ trong ô).</p>

      {SECTIONS.map((section) => (
        <div key={section.title} className="admin-card">
          <h3>{section.title}</h3>
          {section.note && <p className="page-desc" style={{ marginTop: -4 }}>{section.note}</p>}
          {section.keys.map((key) => (
            <div key={key} className="admin-field">
              <label>{LABELS[key] || configs[key]?.label || key}</label>
              {isTextarea(key) ? (
                <textarea
                  value={values[key] || ''}
                  onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                  rows={3}
                  placeholder={DEFAULTS[key]}
                />
              ) : (
                <input
                  type="text"
                  value={values[key] || ''}
                  placeholder={DEFAULTS[key]}
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
