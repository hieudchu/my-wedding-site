# Handoff: trang /adult · Thiệp bố mẹ hai bên gửi đồng nghiệp, cấp trên

Trang mới của thiệp cưới Hiếu & Minh (https://hieu-minh-wedding.vercel.app/adult). Trang chính
dành cho bạn bè của cô dâu chú rể. Trang này là thiệp **bố mẹ hai bên** gửi **đồng nghiệp, cấp
trên, bạn bè của mình**: giọng trang trọng, ít ảnh, vào thẳng thiệp mời rồi xác nhận.

Chụp từ `app/src/` ngày **2026-11-17**. Đây là **bản dựng nền**: chức năng và dữ liệu đã chạy
thật trên production, còn giao diện là bản đầu tiên, chờ thiết kế lại. Mã là production nguyên
văn (tự ghép bằng `tools/`), có dữ liệu thật, ảnh thật, đủ năm bộ chữ.

## Chạy

**Cách 1:** double-click `start.command` (macOS) → mở http://localhost:8769

**Cách 2:**

```bash
cd handoff-adult
python3 -m http.server 8000
# mở http://localhost:8000
```

Mở bằng `file://` **không** chạy (Babel tải `app.jsx` bằng XHR). Xem ở 390×844, 844×390
(DevTools › device toolbar, bật cảm ứng) và cửa sổ desktop: cấp trên hay mở link trên máy tính.

## Đọc theo thứ tự

1. **`DESIGN-BRIEF.md`**: đề bài: người nhận là ai, giọng văn, bố cục, ràng buộc, đầu ra.
2. **`INTERACTIONS.md`**: từng nút / ô nhập làm gì, trạng thái, số đo.
3. **`screens/README.md`**: 27 ảnh chụp (9 trạng thái × dọc, ngang, desktop).
4. **`DATA-CONTRACT.md`**: chữ nào lấy từ dữ liệu, form gửi gì.
5. **`DESIGN-SYSTEM.md`**: màu, chữ, hoạ tiết của trang chính (dùng chung).
6. **`COMPONENT-MAP.md`**: để port về production sau khi thiết kế xong.

## Bên trong có gì

```
index.html            Shell: font, 5 file CSS, React 18.3.1 + Babel từ CDN
app.jsx               13 file production ghép lại; trang /adult là 2 khối cuối:
                      `adult/AdultRSVP.jsx`, `adult/AdultApp.jsx`
styles/adult.css      CSS RIÊNG của trang này (class `a-`). Chỗ thiết kế
styles/globals.css    Token màu / chữ, reset (dùng chung, cẩn thận)
styles/sections.css   ┐ CSS trang chính. main.jsx nạp cho MỌI route nên có mặt ở đây
styles/desktop.css    │ cho giống production. KHÔNG SỬA, và đừng dựa vào class của chúng
styles/mobile.css     ┘
data/db.js            Dữ liệu thật: site_config, family_members, timeline_events
media/                Ảnh cưới duy nhất của trang (WebP 480–1600px)
fonts/                5 bộ chữ tự host
assets/               Con dấu HM, nền giấy hoa văn
screens/              27 ảnh chụp + số đo mọi nút (controls-*.json)
tools/                build-from-production.mjs · capture.mjs
PROMPT.md             Lời nhắn mở đầu để dán vào Claude Design
```

## Khác production ở đâu

- `lib/supabase.js` là client giả: đọc `data/db.js`; gửi xác nhận **không ghi đi đâu**, chỉ
  `console.info` rồi báo thành công sau 600ms.
- Không có react-router: `main.jsx` render thẳng `<AdultApp />`.
