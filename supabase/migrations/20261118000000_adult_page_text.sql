-- Trang /adult (thiệp bố mẹ, bản thiết kế 2026-11-18): bốn khoá chữ riêng.
-- Ô để trống là hợp lệ: trang lùi về khoá chung (venue_name, venue_address, wedding_time)
-- hoặc ẩn dòng (adult_venue_hall). Không ghi đè nếu chủ nhà đã sửa.
insert into public.site_config (key, value, section, label, updated_at) values
  ('adult_venue_title',   'Khách sạn Sheraton',                                  'adult', 'Nơi tổ chức (thiệp bố mẹ)',          now()),
  ('adult_venue_hall',    'Phòng tiệc Sông Hồng',                                'adult', 'Phòng tiệc',                         now()),
  ('adult_venue_address', 'K5, Vành đai 1/11, đường Xuân Diệu, Tây Hồ, Hà Nội',  'adult', 'Địa chỉ nơi tổ chức (thiệp bố mẹ)',  now()),
  ('adult_party_time',    '18:30',                                               'adult', 'Giờ trên thiệp bố mẹ',               now())
on conflict (key) do nothing;
