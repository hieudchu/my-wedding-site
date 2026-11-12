-- Ảnh đếm ngược (background/moment-2.jpg) có khung điện thoại từ 2026-11-12.
--
-- Trước đây điện thoại hiện trọn ảnh nên fit.m để null. Giờ điện thoại là khung 2:3
-- dùng fit.m, và m null thì lấy theo khung máy tính (fit.d, đang phóng 1.2 lệch trái)
-- → ảnh trên điện thoại sẽ bị cắt khác đi. Ghi m = giữa ảnh, không phóng: với ảnh
-- 2:3 hiện tại, điện thoại vẫn trông y như trước. Chỉ ghi khi m còn null và fit đúng
-- phiên bản ảnh, nên chạy lại không đè lên khung admin đã chỉnh.
do $$
declare
  m jsonb;
  i int;
  e jsonb;
begin
  select value::jsonb into m from public.site_config where key = 'media_manifest';
  if m is null then
    return;
  end if;

  for i in 0 .. coalesce(jsonb_array_length(m -> 'folders' -> 'background'), 0) - 1 loop
    e := m -> 'folders' -> 'background' -> i;
    if e ->> 'file' = 'moment-2.jpg'
       and e -> 'fit' is not null
       and e -> 'fit' -> 'v' = e -> 'v'
       and jsonb_typeof(e -> 'fit' -> 'm') is distinct from 'object' then
      m := jsonb_set(m, array['folders', 'background', i::text, 'fit', 'm'],
                     '{"x": 50, "y": 50, "z": 1}'::jsonb);
    end if;
  end loop;

  update public.site_config
     set value = m::text, updated_at = now()
   where key = 'media_manifest';
end $$;
