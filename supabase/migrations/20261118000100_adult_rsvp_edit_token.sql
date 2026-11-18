-- 2026-11-18 · /adult: khách đổi ý thì SỬA dòng cũ, không sinh dòng mới.
--
-- Trình duyệt của khách giữ một mã ngẫu nhiên (uuid, localStorage 'hm-adult-rsvp'). Mã này nằm
-- trong cột rsvps.edit_token. Khách không có quyền SELECT/UPDATE trên rsvps, nên việc ghi đi qua
-- hàm security definer adult_rsvp_save(): có dòng mang mã đó → cập nhật; chưa có → thêm mới
-- (trigger chống spam vẫn chạy như cũ). Không đoán được mã của người khác → không sửa được hộ.
--
-- Trigger guard_guest_submit: bỏ kiểm tra "trùng tên trong 10 phút" cho dòng có edit_token —
-- mã đã chống gửi trùng; giữ kiểm tra đó thì hai khách trùng tên gửi gần nhau sẽ mất một người,
-- và lần sửa sau của người bị bỏ cũng bị bỏ theo.

alter table public.rsvps add column if not exists edit_token uuid;
alter table public.rsvps add column if not exists updated_at timestamptz;
create unique index if not exists rsvps_edit_token_uq on public.rsvps (edit_token) where edit_token is not null;

-- Không cho chèn thẳng một mã qua REST (chỉ hàm dưới đây được đặt mã)
drop policy if exists rsvps_anon_insert on public.rsvps;
create policy rsvps_anon_insert on public.rsvps
  for insert to anon, authenticated
  with check (hidden = false and attending is not null and called_at is null
              and edit_token is null and updated_at is null);

create or replace function public.adult_rsvp_save(
  p_token uuid, p_name text, p_attending boolean, p_message text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_msg  text := nullif(btrim(coalesce(p_message, '')), '');
begin
  if p_token is null or v_name = '' or p_attending is null then
    raise exception 'invalid' using errcode = '22023';
  end if;

  update public.rsvps
     set name = v_name, attending = p_attending, message = v_msg, updated_at = now()
   where edit_token = p_token and audience = 'adult';
  if found then
    return;
  end if;

  insert into public.rsvps (name, attending, audience, message, edit_token)
  values (v_name, p_attending, 'adult', v_msg, p_token);
end;
$$;

revoke all on function public.adult_rsvp_save(uuid, text, boolean, text) from public;
grant execute on function public.adult_rsvp_save(uuid, text, boolean, text) to anon, authenticated;

-- Như 20261111000400, chỉ khác khối "trùng lặp" của rsvps (bỏ qua dòng có edit_token)
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

  perform pg_advisory_xact_lock(hashtext('guest_submit:' || tg_table_name));

  delete from public.submit_log where at < now() - interval '1 day';

  if tg_table_name = 'rsvps' then
    if new.edit_token is null and exists (
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
