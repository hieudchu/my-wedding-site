-- 2026-11-17 · Trang /adult (bố mẹ hai bên mời đồng nghiệp, cấp trên) + sửa lỗi mất xác nhận.
--
-- 1. LỖI THẬT: `side` và `guest_count` vẫn NOT NULL (+ default) từ bảng gốc, dù migration
--    20261110000000 đã định cho phép bỏ trống (ràng buộc `side is null or …`, view gom
--    'unknown'). Form chính gửi null khi khách không chọn nhà / số người → INSERT lỗi,
--    khách vẫn thấy lời cảm ơn (RSVP.jsx cố ý không báo lỗi) mà bản ghi mất.
-- 2. Cột `audience`: 'guest' = trang chính, 'adult' = trang /adult. Trang /adult không hỏi
--    nhà / số người / SĐT, và ghi cả lời từ chối (attending = false).
-- 3. View rsvp_summary: thêm nhóm 'adult' (mỗi lượt tham dự tính 1 khách) + cột `declined`.

alter table public.rsvps alter column side drop not null;
alter table public.rsvps alter column side drop default;
alter table public.rsvps alter column guest_count drop not null;
alter table public.rsvps alter column guest_count drop default;

alter table public.rsvps add column if not exists audience text not null default 'guest';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'rsvps_audience_chk') then
    alter table public.rsvps add constraint rsvps_audience_chk check (audience in ('guest', 'adult'));
  end if;
end $$;

drop view if exists public.rsvp_summary;
create view public.rsvp_summary
with (security_invoker = true) as
select
  case when audience = 'adult' then 'adult' else coalesce(side, 'unknown') end as side, -- groom | bride | unknown | adult
  count(*) filter (where attending)                                            as responses,
  coalesce(sum(case when audience = 'adult' then 1 else guest_count end)
           filter (where attending), 0)                                        as guests,
  count(*) filter (where attending and guests_over_10)                         as over_10,
  count(*) filter (where attending and guest_count is null and audience <> 'adult') as no_guests,
  count(*) filter (where not attending)                                        as declined
from public.rsvps
where not hidden
group by 1;
