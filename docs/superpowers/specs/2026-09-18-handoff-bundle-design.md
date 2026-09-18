# Handoff bundle cho Claude Design — thiết kế

Ngày: 2026-09-18
Trạng thái: đã được duyệt, chờ dựng

## Mục tiêu

Tạo thư mục `handoff/` để đưa cho Claude Design làm lại UI trang cưới. Claude Design
không truy cập được Supabase, nên bundle phải tự chạy độc lập với nội dung thật đã
nhúng sẵn — mở lên là thấy đúng trang web hiện tại, không phải trang trắng.

Bundle cũng phải cho phép mang thiết kế mới quay về production, nên cấu trúc
component phải ánh xạ 1-1 với `app/src/components/`.

## Phạm vi

Chỉ trang khách mời: Gate → Hero → Family (trai) → Family (gái) → Info → Timeline →
RSVP → Footer, kèm Nav và Lightbox.

Không bao gồm trang admin (`app/src/admin/`) — chỉ một người dùng, giá trị thiết kế thấp.

## Cấu trúc

```
handoff/
├── README.md            Cách mở, bên trong có gì
├── index.html           Shell: React 18 + Babel standalone qua CDN, link CSS, mount #root
├── app.jsx              Toàn bộ site khách mời dưới dạng JSX đọc được
├── data/content.js      window.__CONTENT__ — nội dung thật kéo từ Supabase
├── styles/globals.css   Copy nguyên từ app/src/styles/
├── styles/sections.css  Copy nguyên từ app/src/styles/
├── assets/              Ảnh đã nén + medallion + bgm.mp3
├── DESIGN-BRIEF.md      Đề bài cho Claude Design
└── COMPONENT-MAP.md     Bảng port ngược về React
```

## Quyết định kỹ thuật

**React qua CDN + Babel standalone.** Đúng format handoff cũ trong `project/`
(`Wedding.html` + `app.jsx`). Giữ JSX đọc được và cấu trúc component giống production
nên port ngược sát nhất. Đánh đổi: cần mạng để tải CDN.

Hai phương án đã loại:
- HTML + vanilla JS: phải viết lại toàn bộ tương tác, lệch khỏi production.
- Bản build Vite (`dist/`): JS đã minify, Claude Design chỉ vịn được CSS.

**Nội dung nhúng qua biến toàn cục, không dùng `fetch`.** `data/content.js` gán
`window.__CONTENT__`. Dùng `fetch('content.json')` sẽ vỡ khi mở bằng `file://` do CORS.

## Chuyển đổi từ production sang prototype

Bê nguyên 8 section + Nav + Lightbox, thay đúng 3 chỗ:

| Production | Prototype |
|---|---|
| `useSiteConfig()` gọi Supabase | Đọc thẳng `window.__CONTENT__` |
| `MediaImage` chuỗi fallback Supabase → local → placeholder | Trỏ thẳng `./assets/…` |
| `RSVP` submit insert vào Supabase | Giữ form + validate, hiện success giả, đánh dấu `// PORT:` |

Giữ nguyên logic thật: cổng mở khoá scroll, carousel (vuốt/phím/chấm), countdown,
lightbox, reveal khi cuộn, toggle nhạc.

## Ảnh

Ảnh gốc trong Supabase storage tổng 91 MB (carousel tới 13 MB/tấm). Nén bằng `sips`
(có sẵn trong macOS) về tối đa 1600px, JPEG chất lượng 80 → ước tính ~4 MB cho 12 ảnh.
`bgm.mp3` giữ nguyên 5.5 MB. Bundle cuối ~10 MB.

## DESIGN-BRIEF.md

Ra đề theo hướng **tự do sáng tạo, giữ ràng buộc cứng**:

- Ràng buộc cứng: tên, ngày 08.11.2026, giờ, địa điểm, số điện thoại, link bản đồ,
  song ngữ Việt/Anh, RSVP đủ field, cổng khoá scroll, countdown, toggle nhạc, lightbox.
- Bối cảnh: khách chủ yếu dùng điện thoại, mạng VN, nhiều người lớn tuổi → chữ lớn,
  vùng chạm rộng, ảnh nhẹ.
- Hiện trạng: design tokens, mục đích từng section, bảng kiểm kê animation.
- Đặc tả nút bấm: từng nút → chuyện gì xảy ra.
- Được tự do: mọi thứ còn lại, kể cả thêm bớt cách kể chuyện.

## Kiểm chứng

Chạy local server, mở bằng Chrome, chụp màn hình đối chiếu với site thật để chắc
prototype render đúng. Nếu không cấp quyền Chrome được thì người dùng tự mở kiểm tra.

Điều kiện hoàn thành: mở `index.html` thấy đủ 8 section với nội dung và ảnh thật,
cổng mở được, carousel chạy, countdown đếm, RSVP submit ra màn hình thành công.
