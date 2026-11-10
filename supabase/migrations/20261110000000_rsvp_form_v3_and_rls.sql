-- ═══════════════════════════════════════════════════════════════════════════
-- Form RSVP v3 + khoá RLS
-- Dựa trên backend/001_rsvp_form_v3.sql của handoff-mobile-v3, ĐÃ CHỈNH theo
-- schema THẬT của production (đọc ngày 10.11.2026 qua PostgREST).
--
-- KHÁC BẢN GỐC — và vì sao:
--
--  1. Bảng `rsvps` đã có sẵn: id(int), created_at, name, phone, email,
--     attending, guest_count(INT), side, dietary, message.
--     → KHÔNG thêm cột `guests`(text) và `note` như bản gốc, vì sẽ trùng nghĩa
--       với `guest_count` và `message` đang có dữ liệu thật.
--     → "Trên 10 người" lưu bằng guest_count = 10 kèm cờ guests_over_10 = true
--       (phương án (b) mà chính bản gốc đề xuất cho trường hợp cột là số nguyên).
--     → Ô "Ghi chú" của form mới dùng lại cột `message`.
--
--  2. Bản gốc chỉ khoá `rsvps` và `wishes`. Thực tế đo được: khoá anon (vốn nằm
--     công khai trong bundle JS) đang ĐỌC VÀ GHI được cả site_config,
--     family_members, timeline_events. Migration này khoá cả 5 bảng.
--
--  3. Không dùng `auth.role() = 'authenticated'` làm điều kiện admin: dự án đang
--     bật đăng ký tự do (disable_signup = false), nên người lạ đăng ký xong là
--     thành admin. Thay bằng bảng allowlist `admin_emails`.
--
-- CHẠY LẠI ĐƯỢC NHIỀU LẦN. Không xoá dữ liệu cũ.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────── 0. Danh sách admin ───────────────────
-- Ai có email trong bảng này mới đọc/sửa được dữ liệu khách.
create table if not exists public.admin_emails (
  email      text primary key,
  created_at timestamptz not null default now()
);

alter table public.admin_emails enable row level security;
-- Không ai đọc/sửa bảng này qua API. Chỉ sửa bằng SQL Editor hoặc service_role.
drop policy if exists admin_emails_no_api on public.admin_emails;

-- ⚠️ Email admin KHÔNG ghi trong file này vì repo công khai trên GitHub.
--    Trên production nó đã có sẵn. Dựng lại DB ở chỗ khác thì chạy trước, trong SQL Editor:
--      insert into public.admin_emails (email) values ('<email đăng nhập /admin>')
--      on conflict (email) do nothing;
--    Bỏ qua bước này thì chốt chặn ngay dưới sẽ dừng migration, trước khi bật RLS
--    kịp khoá trang admin.

-- Chặn chạy nhầm khi chưa điền email thật
do $$
begin
  if not exists (select 1 from public.admin_emails) then
    raise exception 'Bảng admin_emails rỗng — bật RLS lúc này sẽ khoá luôn trang admin.';
  end if;
  if exists (select 1 from public.admin_emails
             where email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$') then
    raise exception 'admin_emails có giá trị không phải email. Sửa rồi chạy lại.';
  end if;
end $$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_emails
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ─────────────────── 1. rsvps — bổ sung cột cho form mới ───────────────────
alter table public.rsvps
  -- Số chuẩn hoá E.164 để tra/gộp trùng: "+84912345678". Client tính (lib/phone.js).
  add column if not exists phone_e164     text,
  -- Khách chọn "Trên 10 người": guest_count = 10 và cờ này = true.
  add column if not exists guests_over_10 boolean not null default false,
  -- Admin ẩn dòng spam/trùng mà không xoá.
  add column if not exists hidden         boolean not null default false;

-- CHECK thêm dạng NOT VALID → không bắt lỗi dữ liệu cũ, chỉ áp cho dòng mới.
do $$ begin
  alter table public.rsvps add constraint rsvps_name_len
    check (char_length(btrim(name)) between 1 and 120) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.rsvps add constraint rsvps_side_chk
    check (side is null or side in ('groom', 'bride')) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.rsvps add constraint rsvps_guest_count_chk
    check (guest_count is null or guest_count between 1 and 999) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.rsvps add constraint rsvps_phone_len
    check (phone is null or char_length(phone) <= 20) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.rsvps add constraint rsvps_message_len
    check (message is null or char_length(message) <= 300) not valid;
exception when duplicate_object then null; end $$;

create index if not exists rsvps_created_at_idx on public.rsvps (created_at desc);
create index if not exists rsvps_side_idx       on public.rsvps (side);
create index if not exists rsvps_phone_idx      on public.rsvps (phone_e164);

-- ─────────────────── 2. wishes — lời chúc (khách không dự được) ───────────────────
-- Trước đây bấm "Gửi lời chúc" là hiện cảm ơn luôn, KHÔNG lưu gì.
-- Form mới có ô lời chúc (≤ 500 ký tự) + nút "Gửi form sẵn" → cần nơi lưu.
-- Form không có ô tên → lời chúc ẩn danh. Cột `name` để sẵn nếu sau này thêm ô tên.
create table if not exists public.wishes (
  id         bigint generated by default as identity primary key,
  created_at timestamptz not null default now(),
  name       text,
  message    text not null,
  is_preset  boolean not null default false,  -- true = khách bấm "Gửi form sẵn"
  hidden     boolean not null default false
);

do $$ begin
  alter table public.wishes add constraint wishes_msg_len
    check (char_length(btrim(message)) between 1 and 500);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.wishes add constraint wishes_name_len
    check (name is null or char_length(name) <= 120);
exception when duplicate_object then null; end $$;

create index if not exists wishes_created_at_idx on public.wishes (created_at desc);

-- ─────────────────── 3. RLS ───────────────────
alter table public.rsvps           enable row level security;
alter table public.wishes          enable row level security;
alter table public.site_config     enable row level security;
alter table public.family_members  enable row level security;
alter table public.timeline_events enable row level security;

-- ⚠️ Gỡ các policy CŨ trước khi tạo policy mới.
-- Trước đây RLS tắt nên chúng nằm im và không ai để ý. Bật RLS lên là chúng có
-- hiệu lực, mà PostgreSQL ghép nhiều policy permissive bằng OR — nên chỉ cần một
-- policy cũ kiểu `for select using (true)` là lớp khoá mới thành vô nghĩa.
-- Đã đo thực tế: policy "Allow public read" trên rsvps cho khoá anon đọc trọn
-- danh sách khách kể cả sau khi bật RLS.
-- Xoá theo cách liệt kê động để không sót policy nào đặt tên khác.
do $$
declare
  r record;
  keep text[] := array[
    'rsvps_anon_insert','rsvps_admin_all',
    'wishes_anon_insert','wishes_admin_all',
    'site_config_read','site_config_admin_all',
    'family_members_read','family_members_admin_all',
    'timeline_events_read','timeline_events_admin_all'
  ];
begin
  for r in
    select tablename, policyname from pg_policies
    where schemaname = 'public'
      and tablename in ('rsvps','wishes','site_config','family_members','timeline_events')
      and not (policyname = any (keep))
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
    raise notice 'đã gỡ policy cũ: %.%', r.tablename, r.policyname;
  end loop;
end $$;

-- Khách: CHỈ được gửi form, không đọc được gì, không tự đặt hidden.
drop policy if exists rsvps_anon_insert on public.rsvps;
create policy rsvps_anon_insert on public.rsvps
  for insert to anon, authenticated
  with check (hidden = false and attending is not null);

drop policy if exists wishes_anon_insert on public.wishes;
create policy wishes_anon_insert on public.wishes
  for insert to anon, authenticated
  with check (hidden = false);

-- Nội dung trang: ai cũng ĐỌC được (trang thiệp cần), chỉ admin được SỬA.
drop policy if exists site_config_read on public.site_config;
create policy site_config_read on public.site_config
  for select to anon, authenticated using (true);

drop policy if exists family_members_read on public.family_members;
create policy family_members_read on public.family_members
  for select to anon, authenticated using (true);

drop policy if exists timeline_events_read on public.timeline_events;
create policy timeline_events_read on public.timeline_events
  for select to anon, authenticated using (true);

-- Admin: toàn quyền trên cả 5 bảng.
do $$
declare t text;
begin
  foreach t in array array['rsvps','wishes','site_config','family_members','timeline_events'] loop
    execute format('drop policy if exists %I_admin_all on public.%I', t, t);
    execute format(
      'create policy %I_admin_all on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      t, t);
  end loop;
end $$;

-- Lưu ý cho client: KHÔNG gọi .insert(...).select() — anon không có quyền SELECT
-- nên Supabase trả lỗi RLS dù bản ghi đã vào.

-- ─────────────────── 4. View tổng hợp cho trang admin ───────────────────
-- security_invoker → chạy với quyền người gọi, anon vẫn không đọc được.
drop view if exists public.rsvp_summary;
create view public.rsvp_summary
with (security_invoker = true) as
select
  coalesce(side, 'unknown')                      as side,       -- groom | bride | unknown
  count(*)                                       as responses,  -- số lượt xác nhận
  coalesce(sum(guest_count), 0)                  as guests,     -- tổng khách ("trên 10" tính 10)
  count(*) filter (where guests_over_10)         as over_10,    -- số lượt chọn "Trên 10 người"
  count(*) filter (where guest_count is null)    as no_guests   -- số lượt không chọn số người
from public.rsvps
where attending and not hidden
group by 1;
