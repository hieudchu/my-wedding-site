# Port notes (2026-11-11)

Bundle trả về từ Claude Design, đã port vào `app/src/admin/`. Những chỗ production
khác prototype:

- `frames.js` → `framerFrames.js`: ô `background/moment-2.jpg` **không còn** khung điện
  thoại 560:428 — trang khách hiện trọn ảnh ở cả điện thoại dọc lẫn ngang. Thêm `canFrame()`.
- `ImageFramer.jsx`: ô không có khung điện thoại nào để chỉnh thì ẩn nút Máy tính/Điện
  thoại + công tắc dùng chung, và lưu `m: null`.
- `image-framer.css`: bỏ bản chép `img.has-fit`; quy tắc thật nằm ở
  `app/src/styles/globals.css` (biến `--fd*`/`--fm*`; trình chỉnh đặt `--fx/--fy/--fz` inline).
- Album trên trang Media giữ ô tải lên cũ (nhiều file, kéo-thả sắp xếp) thay cho ô
  "Thêm ảnh vào album".
- Ảnh lịch trình (`timeline/*`) **không có khung điện thoại**: điện thoại dùng lịch trình
  dạng biểu tượng `.tlw`, `.tl-track` có ảnh bị ẩn. Ô điện thoại trong xem trước ghi
  "Không hiện" (khung `natural` + `hidden`). Phát hiện khi thử trên production.
