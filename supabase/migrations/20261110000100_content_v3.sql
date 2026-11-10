-- ═══════════════════════════════════════════════════════════════════════════
-- Cập nhật NỘI DUNG theo handoff-mobile-v3 mục 3.9
-- Đây là dữ liệu, không phải cấu trúc. Chạy sau migration RLS.
-- Chạy lại nhiều lần đều được.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────── 1. Địa điểm ───────────
update public.site_config set value = 'Sheraton Hanoi'
  where key = 'venue_name';

update public.site_config set value = 'K5, Vành Đai 1/11 Đ. Xuân Diệu, Tây Hồ, Hà Nội'
  where key = 'venue_address';

-- ⚠️ TẠM: link tìm kiếm theo địa chỉ. Chủ thiệp cần thay bằng link chia sẻ thật
--    của Sheraton Hanoi (Google Maps → Chia sẻ → Sao chép liên kết).
update public.site_config
  set value = 'https://www.google.com/maps/search/?api=1&query=Sheraton+Hanoi+K5+Xu%C3%A2n+Di%E1%BB%87u+T%C3%A2y+H%E1%BB%93+H%C3%A0+N%E1%BB%99i'
  where key = 'map_url';

-- ─────────── 2. Khoá MỚI: tên đầy đủ trên thẻ thiệp ───────────
-- ScriptName viết hai tên này bằng TAN Whistling trên thẻ thiệp điện thoại.
insert into public.site_config (key, value, section, label) values
  ('couple_groom_full', 'Đăng Hiếu', 'hero', 'Tên chú rể trên thẻ thiệp'),
  ('couple_bride_full', 'Thiện Minh', 'hero', 'Tên cô dâu trên thẻ thiệp')
on conflict (key) do update set value = excluded.value;

-- ─────────── 3. Lời mời ở mục Xác nhận tham dự ───────────
update public.site_config set value = 'Trân trọng cảm ơn bạn và gia đình!'
  where key = 'rsvp_heading';

update public.site_config set value =
  'Sự hiện diện của bạn và gia đình là niềm vinh hạnh lớn cho chúng em trong ngày trọng đại này. Để công tác chuẩn bị được chu đáo, xin bạn vui lòng xác nhận sự tham dự trước ngày 1.1.2027.'
  where key = 'rsvp_paragraph';

-- ─────────── 4. Lịch trình: 4 mốc, bỏ "Trao nhẫn" ───────────
-- Xoá mốc Trao nhẫn trước, rồi đặt lại giờ và thứ tự cho 4 mốc còn lại.
delete from public.timeline_events
  where label_vi ilike '%trao nh%n%';

update public.timeline_events set time = '17:30', sort_order = 1 where label_vi = 'Chụp ảnh gia đình';
update public.timeline_events set time = '18:00', sort_order = 2 where label_vi = 'Đón khách';
update public.timeline_events set time = '19:00', sort_order = 3 where label_vi = 'Bắt đầu buổi lễ';
update public.timeline_events set time = '19:30', sort_order = 4 where label_vi = 'Khai tiệc';

-- ─────────── 5. Dọn chuỗi không còn dùng ───────────
-- Section `Details` đã bị thay bằng Hero + WeddingInfo; cổng mở thiệp đã bỏ.
-- Giữ `gate_tagline` (vẫn là câu trích trên thẻ thiệp).
delete from public.site_config
  where key in ('details_eyebrow', 'details_heading', 'details_paragraph',
                'gate_prompt', 'gate_prompt_sub', 'hero_venue',
                'rsvp_dress_code', 'rsvp_dress_code_en');
