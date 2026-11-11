-- Chống spam form Xác nhận tham dự / Gửi lời chúc (2026-11-11).
--
-- Khoá publishable nằm công khai trong trang, nên ai cũng gọi thẳng được REST của
-- Supabase mà không cần qua giao diện. Mọi giới hạn vì thế phải nằm ở database:
-- trigger BEFORE INSERT trên rsvps và wishes.
--
--   · Mỗi IP: tối đa 6 lượt / 10 phút và 20 lượt / ngày, tính riêng từng bảng.
--     Đủ rộng cho cả nhà dùng chung một wifi gửi vài lần.
--   · Toàn trang: tối đa 30 lượt / phút mỗi bảng (kẻ phá dùng nhiều IP).
--   · Trùng lặp trong 10 phút (cùng tên + số điện thoại, hoặc cùng tên + lời chúc):
--     bỏ qua trong im lặng, khách vẫn thấy lời cảm ơn, không sinh dòng mới.
--   · Vượt giới hạn → lỗi 'rate_limited' (RSVP.jsx hiện "vui lòng thử lại sau").
--   · Admin (is_admin) không bị giới hạn.
--
-- IP lấy từ cf-connecting-ip (Cloudflare tự ghi, client không giả được), dự phòng
-- x-forwarded-for. Chỉ lưu md5 của IP, và chỉ giữ 1 ngày.

create table if not exists public.submit_log (
  id bigserial primary key,
  kind text not null,          -- 'rsvps' | 'wishes'
  ip_hash text,                -- md5(ip); null khi không đọc được header
  at timestamptz not null default now()
);
create index if not exists submit_log_kind_at on public.submit_log (kind, at);
create index if not exists submit_log_ip_at on public.submit_log (ip_hash, kind, at);

-- Không ai ngoài trigger (security definer) được đụng vào bảng này
alter table public.submit_log enable row level security;
revoke all on public.submit_log from anon, authenticated;
revoke all on sequence public.submit_log_id_seq from anon, authenticated;

create or replace function public.guard_guest_submit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  hdr json := nullif(current_setting('request.headers', true), '')::json;
  ip text;
  iph text;
  n_ip_10m int;
  n_ip_day int;
  n_all_1m int;
begin
  if public.is_admin() then
    return new;
  end if;

  ip := coalesce(
    nullif(trim(hdr ->> 'cf-connecting-ip'), ''),
    nullif(trim(split_part(hdr ->> 'x-forwarded-for', ',', 1)), '')
  );
  iph := case when ip is null then null else md5(ip) end;

  -- Xếp hàng mọi lượt gửi vào cùng bảng: 100 request song song không thể cùng đếm
  -- "0 lượt trước đó" rồi cùng lọt. Lưu lượng thiệp cưới nhỏ nên khoá này không đáng kể.
  perform pg_advisory_xact_lock(hashtext('guest_submit:' || tg_table_name));

  delete from public.submit_log where at < now() - interval '1 day';

  -- Trùng lặp: bỏ qua, không báo lỗi (khách bấm gửi lại / mạng chập chờn)
  if tg_table_name = 'rsvps' then
    if exists (
      select 1 from public.rsvps r
      where r.created_at > now() - interval '10 minutes'
        and lower(btrim(r.name)) = lower(btrim(new.name))
        and coalesce(r.phone, '') = coalesce(new.phone, '')
    ) then
      return null;
    end if;
  elsif tg_table_name = 'wishes' then
    if exists (
      select 1 from public.wishes w
      where w.created_at > now() - interval '10 minutes'
        and lower(btrim(coalesce(w.name, ''))) = lower(btrim(coalesce(new.name, '')))
        and btrim(w.message) = btrim(new.message)
    ) then
      return null;
    end if;
  end if;

  select count(*) into n_all_1m from public.submit_log
   where kind = tg_table_name and at > now() - interval '1 minute';
  if n_all_1m >= 30 then
    raise exception 'rate_limited' using errcode = 'P0001', hint = 'global';
  end if;

  if iph is not null then
    select count(*) filter (where at > now() - interval '10 minutes'), count(*)
      into n_ip_10m, n_ip_day
      from public.submit_log
     where ip_hash = iph and kind = tg_table_name;
    if n_ip_10m >= 6 or n_ip_day >= 20 then
      raise exception 'rate_limited' using errcode = 'P0001', hint = 'ip';
    end if;
  end if;

  insert into public.submit_log (kind, ip_hash) values (tg_table_name, iph);
  return new;
end;
$$;

revoke all on function public.guard_guest_submit() from public, anon, authenticated;

drop trigger if exists rsvps_guard on public.rsvps;
create trigger rsvps_guard before insert on public.rsvps
  for each row execute function public.guard_guest_submit();

drop trigger if exists wishes_guard on public.wishes;
create trigger wishes_guard before insert on public.wishes
  for each row execute function public.guard_guest_submit();
