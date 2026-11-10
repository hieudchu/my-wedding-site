-- Khung ảnh (fit) cho những ảnh từng được chỉnh cứng trong sections.css.
--
-- Trình chỉnh khung trong admin lưu `fit = { v, d: {x,y,z}, m: {x,y,z} | null }` vào
-- từng mục của bản kê media (site_config.media_manifest). Bản phát hành cùng đợt gỡ
-- bốn quy tắc CSS gắn với ảnh hiện tại; migration này ghi đúng các giá trị đó vào bản
-- kê để trang khách giữ nguyên dáng ảnh:
--
--   portraits/bride.jpg   điện thoại: scale(1.45), transform-origin 56% 42%
--   portraits/groom.jpg   màn ngang:  object-position 50% 40%
--   background/left.jpg   điện thoại: scale(1.1) — cắt viền trắng của ảnh scan phim
--   background/right.jpg  điện thoại: scale(1.1)
--
-- Máy tính không có quy tắc nào → d = giữa ảnh. `v` = `v` của ảnh hiện tại, nên thay
-- ảnh là khung tự hết hiệu lực. Chỉ ghi vào mục CHƯA có fit: chạy lại không đè lên
-- khung admin đã chỉnh.
do $$
declare
  m jsonb;
  presets jsonb := '{
    "portraits/bride.jpg":   {"d": {"x": 50, "y": 50, "z": 1}, "m": {"x": 56, "y": 42, "z": 1.45}},
    "portraits/groom.jpg":   {"d": {"x": 50, "y": 50, "z": 1}, "m": {"x": 50, "y": 40, "z": 1}},
    "background/left.jpg":   {"d": {"x": 50, "y": 50, "z": 1}, "m": {"x": 50, "y": 50, "z": 1.1}},
    "background/right.jpg":  {"d": {"x": 50, "y": 50, "z": 1}, "m": {"x": 50, "y": 50, "z": 1.1}}
  }';
  k text;
  folder text;
  fname text;
  i int;
  e jsonb;
begin
  select value::jsonb into m from public.site_config where key = 'media_manifest';
  if m is null then
    return;
  end if;

  for k in select jsonb_object_keys(presets) loop
    folder := split_part(k, '/', 1);
    fname := split_part(k, '/', 2);
    for i in 0 .. coalesce(jsonb_array_length(m -> 'folders' -> folder), 0) - 1 loop
      e := m -> 'folders' -> folder -> i;
      if e ->> 'file' = fname and e -> 'fit' is null and e ? 'v' then
        m := jsonb_set(
          m,
          array['folders', folder, i::text, 'fit'],
          (presets -> k) || jsonb_build_object('v', e -> 'v')
        );
      end if;
    end loop;
  end loop;

  update public.site_config
     set value = m::text, updated_at = now()
   where key = 'media_manifest';
end $$;
