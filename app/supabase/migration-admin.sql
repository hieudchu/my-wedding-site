-- ============================================================
-- Admin migration: site_config table + seed defaults
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- Run AFTER the initial migration.sql
-- ============================================================

-- =====================
-- 1. Site Config Table (key-value store for all editable text)
-- =====================
create table if not exists site_config (
  key text primary key,
  value text not null default '',
  section text not null default 'general',
  label text not null default '',
  updated_at timestamptz default now() not null
);

alter table site_config enable row level security;

-- Anyone can read (main site needs this)
create policy "Allow public read config" on site_config
  for select using (true);

-- Only authenticated users can update (admin)
create policy "Allow auth update config" on site_config
  for update using (auth.role() = 'authenticated');

create policy "Allow auth insert config" on site_config
  for insert with check (auth.role() = 'authenticated');

create policy "Allow auth delete config" on site_config
  for delete using (auth.role() = 'authenticated');

-- =====================
-- 2. Timeline Events Table
-- =====================
create table if not exists timeline_events (
  id bigint generated always as identity primary key,
  time text not null,
  label_vi text not null,
  label_en text not null default '',
  image_path text not null default '',
  sort_order integer not null default 0,
  updated_at timestamptz default now() not null
);

alter table timeline_events enable row level security;

create policy "Allow public read timeline" on timeline_events
  for select using (true);

create policy "Allow auth manage timeline" on timeline_events
  for all using (auth.role() = 'authenticated');

-- =====================
-- 3. Family Members Table
-- =====================
create table if not exists family_members (
  id bigint generated always as identity primary key,
  side text not null check (side in ('groom', 'bride')),
  role_label text not null,
  name_vi text not null,
  name_en text not null default '',
  sort_order integer not null default 0,
  updated_at timestamptz default now() not null
);

alter table family_members enable row level security;

create policy "Allow public read family" on family_members
  for select using (true);

create policy "Allow auth manage family" on family_members
  for all using (auth.role() = 'authenticated');

-- =====================
-- 4. Seed default config values
-- =====================
insert into site_config (key, value, section, label) values
  -- General
  ('groom_name', 'Chu Đăng Hiếu', 'general', 'Tên chú rể · Groom full name'),
  ('groom_short', 'Hiếu', 'general', 'Tên ngắn chú rể · Groom short name'),
  ('bride_name', 'Nguyễn Thu Thiện Minh', 'general', 'Tên cô dâu · Bride full name'),
  ('bride_short', 'Minh', 'general', 'Tên ngắn cô dâu · Bride short name'),
  ('wedding_date', '2026-11-08', 'general', 'Ngày cưới · Wedding date'),
  ('wedding_time', '17:00', 'general', 'Giờ cưới · Wedding time'),
  ('venue_name', 'White Palace Phạm Văn Đồng', 'general', 'Tên địa điểm · Venue name'),
  ('venue_address', '108 Phạm Văn Đồng, P. Hiệp Bình Chánh, TP. Thủ Đức, TP.HCM', 'general', 'Địa chỉ · Venue address'),
  ('phone', '+84 912 345 678', 'general', 'Số điện thoại · Phone'),
  ('map_url', 'https://maps.google.com/?q=White+Palace+Pham+Van+Dong', 'general', 'Link bản đồ · Map URL'),

  -- Gate section
  ('gate_tagline', '"Cùng nhau đón những hoàng hôn rực rỡ nhất của cuộc đời."', 'gate', 'Câu trích dẫn · Gate tagline'),
  ('gate_prompt', 'Trân trọng kính mời', 'gate', 'Lời mời · Gate prompt text'),
  ('gate_prompt_sub', 'Tap to open · Bấm để mở thiệp', 'gate', 'Phụ đề · Gate prompt subtitle'),

  -- Details section
  ('details_eyebrow', 'Save the date · 08.11.2026', 'details', 'Eyebrow text'),
  ('details_heading', 'Cùng nhau đón những hoàng hôn rực rỡ nhất của cuộc đời.', 'details', 'Tiêu đề · Heading'),
  ('details_paragraph', 'Sau bao mùa mưa nắng, hai con tim cuối cùng cũng tìm được cùng một nhịp đập. Chúng em xin trân trọng mời bạn đến chia vui trong ngày trọng đại của chúng em.', 'details', 'Đoạn văn · Paragraph'),

  -- Family section
  ('groom_bio', 'Cậu con trai lớn của gia đình, sinh ra và lớn lên tại Hà Nội. Nay chính thức trao gửi trái tim cho một nửa kia của cuộc đời.', 'family', 'Giới thiệu chú rể · Groom bio'),
  ('groom_hometown', 'Hà Nội · Việt Nam', 'family', 'Quê chú rể · Groom hometown'),
  ('bride_bio', 'Cô con gái út của gia đình, sinh ra và lớn lên tại Sài Gòn. Nay xin gửi trọn niềm tin và tình yêu cho người bạn đồng hành.', 'family', 'Giới thiệu cô dâu · Bride bio'),
  ('bride_hometown', 'TP. Hồ Chí Minh · Việt Nam', 'family', 'Quê cô dâu · Bride hometown'),

  -- Info card section
  ('info_announce', 'Trân trọng báo tin', 'info', 'Thông báo · Announcement'),
  ('info_announce_en', 'We joyfully announce our wedding', 'info', 'Thông báo (EN) · Announcement EN'),
  ('info_venue_prefix', 'Tại tư gia', 'info', 'Tiền tố địa điểm · Venue prefix'),

  -- RSVP section
  ('rsvp_heading', 'Cảm ơn bạn đã đến với chúng em', 'rsvp', 'Tiêu đề · Heading'),
  ('rsvp_paragraph', 'Sự hiện diện của bạn là món quà quý giá nhất. Xin bạn vui lòng xác nhận trước ngày 25.10.2026 để chúng em chuẩn bị chu đáo.', 'rsvp', 'Đoạn văn · Paragraph'),
  ('rsvp_dress_code', 'Tông màu gợi ý: kem, be, vàng ánh kim, burgundy — để cùng hoà vào không khí ấm áp của buổi tiệc.', 'rsvp', 'Dress code (VI)'),
  ('rsvp_dress_code_en', 'Suggested palette: cream, beige, gold, burgundy.', 'rsvp', 'Dress code (EN)'),

  -- Footer
  ('footer_text', 'With love · Made for our beloved guests', 'footer', 'Footer text')

on conflict (key) do nothing;

-- =====================
-- 5. Seed default timeline events
-- =====================
insert into timeline_events (time, label_vi, label_en, image_path, sort_order) values
  ('14:30', 'Chụp ảnh gia đình', 'Family photo session', 'timeline/photo.jpg', 1),
  ('15:00', 'Đón khách', 'Guest welcome', 'timeline/welcome.jpg', 2),
  ('16:30', 'Bắt đầu buổi lễ', 'Ceremony begins', 'timeline/ceremony.jpg', 3),
  ('17:00', 'Trao nhẫn', 'Ring exchange', 'timeline/vows.jpg', 4),
  ('18:00', 'Khai tiệc', 'Reception', 'timeline/reception.jpg', 5)
on conflict do nothing;

-- =====================
-- 6. Seed default family members
-- =====================
insert into family_members (side, role_label, name_vi, name_en, sort_order) values
  ('groom', 'Cha · Father', 'Ông Chu Văn Anh', 'Mr. Chu Van Anh', 1),
  ('groom', 'Mẹ · Mother', 'Bà Trần Thị Lan', 'Mrs. Tran Thi Lan', 2),
  ('groom', 'Anh trai · Brother', 'Chu Đăng Khôi', 'Chu Dang Khoi', 3),
  ('bride', 'Cha · Father', 'Ông Nguyễn Văn Thiện', 'Mr. Nguyen Van Thien', 1),
  ('bride', 'Mẹ · Mother', 'Bà Lê Thị Hương', 'Mrs. Le Thi Huong', 2),
  ('bride', 'Chị gái · Sister', 'Nguyễn Thu Thảo', 'Nguyen Thu Thao', 3)
on conflict do nothing;
