-- ═══════════════════════════════════════════════════════════════════════════
-- Kho ảnh `media`: chỉ admin được ghi / sửa / xoá
--
-- Trước đây ba policy ghi chỉ kiểm tra auth.role() = 'authenticated'. Dự án từng
-- bật tự đăng ký, nên bất kỳ ai đăng ký một tài khoản cũng xoá hay ghi đè được
-- toàn bộ ảnh cưới và nhạc. Nay dùng cùng allowlist với các bảng: public.is_admin().
-- (Tự đăng ký cũng đã được tắt trong Auth settings ngày 2026-11-11.)
--
-- Đọc công khai giữ nguyên: bucket là public, khách cần tải ảnh.
--
-- Hoàn tác: đổi `public.is_admin()` về `auth.role() = 'authenticated'`
--           trong ba policy dưới đây (KHÔNG nên).
-- ═══════════════════════════════════════════════════════════════════════════

drop policy if exists "Allow auth upload media" on storage.objects;
drop policy if exists "Allow auth update media" on storage.objects;
drop policy if exists "Allow auth delete media" on storage.objects;

create policy "Admin upload media" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and public.is_admin());

create policy "Admin update media" on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and public.is_admin())
  with check (bucket_id = 'media' and public.is_admin());

create policy "Admin delete media" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and public.is_admin());
