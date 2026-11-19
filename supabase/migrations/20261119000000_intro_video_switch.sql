-- Công tắc video mở đầu trang khách (app/src/components/IntroVideo.jsx).
-- 'off' = tắt; mọi giá trị khác (kể cả thiếu hàng) = bật. Admin gạt ở "Thông tin chung";
-- công tắc tự upsert nên trang vẫn chạy đúng cả khi chưa chạy migration này.
insert into public.site_config (key, value, section, label, updated_at) values
  ('intro_video', 'on', 'general', 'Video mở đầu trang khách (on/off)', now())
on conflict (key) do nothing;
