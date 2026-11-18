-- 2026-11-18 · Vá sau đợt thử spam trên production (đóng vai kẻ phá chỉ có khoá publishable).
--
--  1. phone_e164 không có giới hạn: rpc nhận chuỗi 5000 ký tự. → ràng buộc '+' và 8–15 chữ số (E.164).
--  2. Sửa qua mã (guest_rsvp_save / adult_rsvp_save / wish_save) không giới hạn: 100 lần trong
--     0,7 giây. Không sinh dòng mới nhưng là tải ghi vô hạn. → mỗi IP 30 lần sửa / 10 phút / bảng,
--     toàn trang 120 / phút; vượt → 'rate_limited' như lượt gửi mới.
--  3. rsvp_phone_taken không giới hạn: 200 lần dò trong 0,7 giây. → mỗi IP 40 lần / 10 phút;
--     vượt thì luôn trả false (form không báo trước, nhưng lúc lưu index unique vẫn chặn).
--  4. guest_rsvp_save báo 'phone_taken' cho MỌI unique_violation (vd. mã của /adult đem dùng ở
--     trang chính). → chỉ báo phone_taken khi đúng index rsvps_guest_phone_uq, còn lại 'invalid'.
--  5. anon / authenticated còn quyền TRUNCATE, TRIGGER, REFERENCES trên rsvps / wishes (PostgREST
--     không mở được, nhưng không cần) → thu hồi.
-- Ghi nhật ký vào submit_log với kind 'rsvps_edit' | 'wishes_edit' | 'phone_check'.

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'rsvps_phone_e164_fmt') then
    alter table public.rsvps add constraint rsvps_phone_e164_fmt
      check (phone_e164 is null or phone_e164 ~ '^\+[0-9]{8,15}$');
  end if;
end $$;

-- true = được phép (và đã ghi một lượt). Admin luôn được phép.
create or replace function public.guest_throttle(p_kind text, p_ip_10m int, p_all_1m int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  hdr json := nullif(current_setting('request.headers', true), '')::json;
  ip text;
  iph text;
begin
  if public.is_admin() then
    return true;
  end if;
  ip := coalesce(
    nullif(trim(hdr ->> 'cf-connecting-ip'), ''),
    nullif(trim(split_part(hdr ->> 'x-forwarded-for', ',', 1)), '')
  );
  iph := case when ip is null then null else md5(ip) end;
  perform pg_advisory_xact_lock(hashtext('guest_submit:' || p_kind));
  delete from public.submit_log where at < now() - interval '1 day';
  if (select count(*) from public.submit_log where kind = p_kind and at > now() - interval '1 minute') >= p_all_1m then
    return false;
  end if;
  if iph is not null and (select count(*) from public.submit_log
        where kind = p_kind and ip_hash = iph and at > now() - interval '10 minutes') >= p_ip_10m then
    return false;
  end if;
  insert into public.submit_log (kind, ip_hash) values (p_kind, iph);
  return true;
end;
$$;
revoke all on function public.guest_throttle(text, int, int) from public, anon, authenticated;

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
  if exists (select 1 from public.rsvps where edit_token = p_token and audience = 'adult') then
    if not public.guest_throttle('rsvps_edit', 30, 120) then
      raise exception 'rate_limited' using errcode = 'P0001';
    end if;
    update public.rsvps
       set name = v_name, attending = p_attending, message = v_msg, updated_at = now()
     where edit_token = p_token and audience = 'adult';
    return;
  end if;
  insert into public.rsvps (name, attending, audience, message, edit_token)
  values (v_name, p_attending, 'adult', v_msg, p_token);
exception when unique_violation then
  raise exception 'invalid' using errcode = '22023';
end;
$$;

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
  v_con text;
begin
  if p_token is null or v_name = '' then
    raise exception 'invalid' using errcode = '22023';
  end if;
  if exists (select 1 from public.rsvps where edit_token = p_token and audience = 'guest') then
    if not public.guest_throttle('rsvps_edit', 30, 120) then
      raise exception 'rate_limited' using errcode = 'P0001';
    end if;
    update public.rsvps
       set name = v_name, attending = true, side = p_side, guest_count = p_guest_count,
           guests_over_10 = coalesce(p_over_10, false), phone = v_phone, phone_e164 = v_e164,
           message = v_msg, updated_at = now()
     where edit_token = p_token and audience = 'guest';
    return;
  end if;
  insert into public.rsvps (name, attending, audience, side, guest_count, guests_over_10,
                            phone, phone_e164, message, edit_token)
  values (v_name, true, 'guest', p_side, p_guest_count, coalesce(p_over_10, false),
          v_phone, v_e164, v_msg, p_token);
exception when unique_violation then
  get stacked diagnostics v_con = constraint_name;
  if v_con = 'rsvps_guest_phone_uq' then
    raise exception 'phone_taken' using errcode = 'P0001';
  end if;
  raise exception 'invalid' using errcode = '22023';
end;
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
  if exists (select 1 from public.wishes where edit_token = p_token) then
    if not public.guest_throttle('wishes_edit', 30, 120) then
      raise exception 'rate_limited' using errcode = 'P0001';
    end if;
    update public.wishes
       set name = v_name, message = v_msg, is_preset = coalesce(p_preset, false), updated_at = now()
     where edit_token = p_token;
    return;
  end if;
  insert into public.wishes (name, message, is_preset, edit_token)
  values (v_name, v_msg, coalesce(p_preset, false), p_token);
exception when unique_violation then
  raise exception 'invalid' using errcode = '22023';
end;
$$;

-- Ghi nhật ký → không còn là hàm "stable"
create or replace function public.rsvp_phone_taken(p_phone_e164 text, p_token uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if p_phone_e164 is null or not public.guest_throttle('phone_check', 40, 300) then
    return false;
  end if;
  return exists (
    select 1 from public.rsvps
     where audience = 'guest' and phone_e164 = p_phone_e164
       and (p_token is null or edit_token is distinct from p_token)
  );
end;
$$;

revoke truncate, trigger, references on public.rsvps, public.wishes from anon, authenticated;
