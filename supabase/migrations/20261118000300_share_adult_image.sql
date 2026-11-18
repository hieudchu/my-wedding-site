-- Ảnh xem trước khi gửi link thiệp bố mẹ (/thiep-moi, /adult) qua Zalo / Messenger.
-- Giá trị = đường dẫn trong kho `media` (vd. share/adult-m3x9k2.jpg), admin tải lên ở mục
-- "Khách bố mẹ mời". Trống = ảnh mặc định public/og-adult-2.jpg. api/share-adult.js đọc khoá này.
insert into public.site_config (key, value, section, label, updated_at) values
  ('share_adult_image', '', 'adult', 'Ảnh xem trước khi gửi link thiệp bố mẹ', now())
on conflict (key) do nothing;
