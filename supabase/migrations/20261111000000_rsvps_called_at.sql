-- ═══════════════════════════════════════════════════════════════════════════
-- BR-1 · Đánh dấu "Đã gọi" cho khách (handoff-admin/BACKEND-REQUESTS.md)
--
-- rsvps.called_at: thời điểm chủ nhà đánh dấu đã gọi xác nhận lại.
-- Trống = chưa gọi. Lưu thời điểm thay vì đúng/sai để hiện "Đã gọi 12/12" và xuất Excel.
--
-- Quyền: chủ nhà cập nhật qua policy rsvps_admin_all sẵn có (giống cột hidden).
-- Khách KHÔNG được tự đặt cột này khi gửi form → thêm điều kiện vào policy insert.
-- rsvp_summary không đổi.
--
-- Hoàn tác: alter table public.rsvps drop column called_at;
--           rồi chạy lại phần policy rsvps_anon_insert của 20261110000000.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.rsvps
  add column if not exists called_at timestamptz;

drop policy if exists rsvps_anon_insert on public.rsvps;
create policy rsvps_anon_insert on public.rsvps
  for insert to anon, authenticated
  with check (hidden = false and attending is not null and called_at is null);
