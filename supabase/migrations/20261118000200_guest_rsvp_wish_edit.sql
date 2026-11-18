-- 2026-11-18 · Trang chính: khách đổi ý thì SỬA dòng cũ (như /adult, 20261118000100).
--
--  · rsvps (audience 'guest'): rpc guest_rsvp_save(mã, …) — mã nằm ở localStorage 'hm-rsvp'.
--    Số điện thoại (phone_e164) là DUY NHẤT trong các dòng 'guest'. Trùng → lỗi 'phone_taken'.
--    rpc rsvp_phone_taken(số, mã) cho form báo trước "số này đã được xác nhận" (không tính dòng
--    của chính mã đó). Đánh đổi: ai cũng hỏi được một số đã xác nhận hay chưa (chỉ có/không).
--  · wishes: cột edit_token + rpc wish_save(mã, …) — mã nằm ở cookie 'hm_wish'.
--  · guard_guest_submit: bỏ kiểm tra trùng 10 phút cho dòng có edit_token (cả hai bảng).

create unique index if not exists rsvps_guest_phone_uq
  on public.rsvps (phone_e164) where audience = 'guest' and phone_e164 is not null;

alter table public.wishes add column if not exists edit_token uuid;
alter table public.wishes add column if not exists updated_at timestamptz;
create unique index if not exists wishes_edit_token_uq on public.wishes (edit_token) where edit_token is not null;

-- Chỉ rpc mới được đặt mã (xem policy rsvps_anon_insert ở 20261118000100)
drop policy if exists wishes_anon_insert on public.wishes;
create policy wishes_anon_insert on public.wishes
  for insert to anon, authenticated
  with check (hidden = false and edit_token is null and updated_at is null);

create or replace function public.guest_rsvp_save(
  p_token uuid, p_name text, p_side text, p_guest_count int, p_over_10 boolean,
  p_phone text, p_phone_e164 text, p_message text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
  v_e164 text := nullif(btrim(coalesce(p_phone_e164, '')), '');
  v_msg text := nullif(btrim(coalesce(p_message, '')), '');
begin
  if p_token is null or v_name = '' then
    raise exception 'invalid' using errcode = '22023';
  end if;
  begin
    update public.rsvps
       set name = v_name, attending = true, side = p_side, guest_count = p_guest_count,
           guests_over_10 = coalesce(p_over_10, false), phone = v_phone, phone_e164 = v_e164,
           message = v_msg, updated_at = now()
     where edit_token = p_token and audience = 'guest';
    if not found then
      insert into public.rsvps (name, attending, audience, side, guest_count, guests_over_10,
                                phone, phone_e164, message, edit_token)
      values (v_name, true, 'guest', p_side, p_guest_count, coalesce(p_over_10, false),
              v_phone, v_e164, v_msg, p_token);
    end if;
  exception when unique_violation then
    raise exception 'phone_taken' using errcode = 'P0001';
  end;
end;
$$;

create or replace function public.rsvp_phone_taken(p_phone_e164 text, p_token uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.rsvps
     where audience = 'guest' and phone_e164 = p_phone_e164
       and (p_token is null or edit_token is distinct from p_token)
  );
$$;

create or replace function public.wish_save(
  p_token uuid, p_name text, p_message text, p_preset boolean
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_msg text := btrim(coalesce(p_message, ''));
begin
  if p_token is null or v_name = '' or v_msg = '' then
    raise exception 'invalid' using errcode = '22023';
  end if;
  update public.wishes
     set name = v_name, message = v_msg, is_preset = coalesce(p_preset, false), updated_at = now()
   where edit_token = p_token;
  if not found then
    insert into public.wishes (name, message, is_preset, edit_token)
    values (v_name, v_msg, coalesce(p_preset, false), p_token);
  end if;
end;
$$;

revoke all on function public.guest_rsvp_save(uuid, text, text, int, boolean, text, text, text) from public;
revoke all on function public.rsvp_phone_taken(text, uuid) from public;
revoke all on function public.wish_save(uuid, text, text, boolean) from public;
grant execute on function public.guest_rsvp_save(uuid, text, text, int, boolean, text, text, text) to anon, authenticated;
grant execute on function public.rsvp_phone_taken(text, uuid) to anon, authenticated;
grant execute on function public.wish_save(uuid, text, text, boolean) to anon, authenticated;

-- Như 20261118000100, thêm: wishes có edit_token cũng bỏ qua kiểm tra trùng
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
    if new.edit_token is null and exists (
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
