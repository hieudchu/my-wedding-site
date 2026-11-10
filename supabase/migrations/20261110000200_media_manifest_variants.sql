-- ═══════════════════════════════════════════════════════════════════════════
-- Bản kê media + thông tin bản nén (WebP 480/960/1280/1600)
--
-- Hàng `media_manifest` CHƯA TỪNG tồn tại trên production: tính năng bản kê đã
-- được deploy nhưng chưa ai bấm "Quét lại kho", nên trang khách vẫn liệt kê từng
-- thư mục Storage ở mỗi lượt truy cập.
--
-- Bản kê này dựng theo đúng công thức của buildFromListing (id, v, thứ tự theo
-- tên), cộng thêm trường `opt` trỏ tới bản nén ở `_opt/<thư mục>/<tên>-<rộng>.webp`.
-- Bản nén đã được upload sẵn, cache 1 năm, cả 53 URL đã kiểm trả 200.
--
-- KHÔNG đụng vào ảnh gốc. Ảnh gốc vẫn nằm nguyên chỗ cũ.
-- Hoàn tác: delete from public.site_config where key = 'media_manifest';
--           (trang sẽ quay về liệt kê thư mục như trước)
-- ═══════════════════════════════════════════════════════════════════════════

insert into public.site_config (key, value, section, label, updated_at)
values ('media_manifest', $m${"version":1,"folders":{"carousel":[{"id":"carousel-L2220731.JPG","file":"L2220731.JPG","v":1777300430,"w":4000,"h":6000,"caption":"","opt":{"v":1777300430,"fmt":"webp","w":[480,960,1280,1600]}},{"id":"carousel-L2220972.JPG","file":"L2220972.JPG","v":1777300451,"w":4000,"h":6000,"caption":"","opt":{"v":1777300451,"fmt":"webp","w":[480,960,1280,1600]}},{"id":"carousel-L2220992.JPG","file":"L2220992.JPG","v":1777300455,"w":4000,"h":6000,"caption":"","opt":{"v":1777300455,"fmt":"webp","w":[480,960,1280,1600]}},{"id":"carousel-Portra (15).JPG","file":"Portra (15).JPG","v":1777300457,"w":2385,"h":3543,"caption":"","opt":{"v":1777300457,"fmt":"webp","w":[480,960,1280,1600]}},{"id":"carousel-Portra (19).JPG","file":"Portra (19).JPG","v":1777300458,"w":2385,"h":3543,"caption":"","opt":{"v":1777300458,"fmt":"webp","w":[480,960,1280,1600]}},{"id":"carousel-Portra (21).JPG","file":"Portra (21).JPG","v":1777300459,"w":2385,"h":3543,"caption":"","opt":{"v":1777300459,"fmt":"webp","w":[480,960,1280,1600]}},{"id":"carousel-Portra (8).JPG","file":"Portra (8).JPG","v":1777300456,"w":2202,"h":3271,"caption":"","opt":{"v":1777300456,"fmt":"webp","w":[480,960,1280,1600]}}],"portraits":[{"id":"portraits-bride.jpg","file":"bride.jpg","v":1777298882,"w":4000,"h":6000,"caption":"","opt":{"v":1777298882,"fmt":"webp","w":[480,960,1280,1600]}},{"id":"portraits-groom.jpg","file":"groom.jpg","v":1777299117,"w":4000,"h":6000,"caption":"","opt":{"v":1777299117,"fmt":"webp","w":[480,960,1280,1600]}}],"background":[{"id":"background-left.jpg","file":"left.jpg","v":1777299671,"w":2385,"h":3543,"caption":"","opt":{"v":1777299671,"fmt":"webp","w":[480,960,1280,1600]}},{"id":"background-moment-2.jpg","file":"moment-2.jpg","v":1777301162,"w":2202,"h":3271,"caption":"","opt":{"v":1777301162,"fmt":"webp","w":[480,960,1280,1600]}},{"id":"background-right.jpg","file":"right.jpg","v":1777299668,"w":2385,"h":3543,"caption":"","opt":{"v":1777299668,"fmt":"webp","w":[480,960,1280,1600]}}],"icons":[{"id":"icons-medallion-gold.jpg","file":"medallion-gold.jpg","v":1777298145,"w":690,"h":690,"caption":"","opt":{"v":1777298145,"fmt":"webp","w":[480,690]}},{"id":"icons-medallion-ink.png","file":"medallion-ink.png","v":1777295969,"w":1024,"h":1536,"caption":"","opt":{"v":1777295969,"fmt":"webp","w":[480,960,1024]}}],"music":[{"id":"music-bgm.mp3","file":"bgm.mp3","v":1776787609,"w":0,"h":0,"caption":""}]}}$m$, 'media', 'Bản kê media (trang tự ghi)', now())
on conflict (key) do update
  set value = excluded.value, updated_at = excluded.updated_at;
