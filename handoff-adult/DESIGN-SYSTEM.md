> **Ghi chú cho trang /adult:** tài liệu này mô tả hệ thiết kế của **trang chính** (chép từ
> `handoff-mobile-v2`). Dùng làm nguồn màu, chữ, hoạ tiết. Phần nói về bố cục / section của trang
> chính chỉ để tham khảo. Giọng văn trang /adult: xem `DESIGN-BRIEF.md` §1.

# Design system: bản điện thoại hiện tại

Ngôn ngữ thiết kế của bản điện thoại đang chạy (làm lại 10–11/2026). Giá trị lấy thẳng
từ mã. Số dòng là của `styles/sections.css` trong thư mục này. **Khi tài liệu và mã lệch
nhau, mã đúng.**

Ảnh: `screens/doc-390x844-*.png`, `screens/ngang-844x390-*.png`, và hai ảnh toàn trang
`*-10-toan-trang.png`.

> Thiết kế mới được phép tiến hoá hệ này (thêm token, chỉnh thang chữ, đổi bóng…), miễn
> là vẫn **một giọng**: đỏ sơn mài + vàng kim + giấy ngà, Playfair cho chữ đọc, TAN
> Whistling cho tên đôi. Đổi gì thì ghi `CHANGES.md`.

---

## 1. Màu

Token gốc trong `styles/globals.css` `:root`. Bản điện thoại dùng thêm vài giá trị
cố định (chưa thành token). Nếu dùng lại nhiều, nên đưa lên `:root`.

### Nền

| Vai trò | Giá trị | Dùng ở |
|---|---|---|
| Nền giấy (cả trang) | `--paper-2` #F6EDE0 + `paper-floral.jpg` trộn `overlay` | `body`; các section sáng để `transparent` để hoa văn chạy liền |
| Nền đỏ thẫm | **#32000C** + `floral-relief.jpg` trộn `overlay` | Hero, footer |
| Thẻ thiệp chữ (hero) | **#4A000B**, viền vàng mảnh | Thẻ "Thiệp cưới · Đăng Hiếu & Thiện Minh" |
| Thẻ Lễ thành hôn | **#F4EAE1** | Thẻ thiệp mời |
| Thẻ sáng | `--card` #FFFCF5 | Thẻ đếm ngược, thẻ chọn RSVP, form, bảng nhạc |

### Chữ và điểm nhấn

| Vai trò | Giá trị |
|---|---|
| Chữ chính | `--ink` #33231F |
| Chữ phụ | `--ink-soft` #6B564F · `--muted` #8C7A72 |
| Đỏ sơn mài (tên, "Lễ thành hôn", nút chính) | `--red` #7E1416 · đậm `--red-deep` #5E0F11 |
| Vàng kim (đường kẻ, ❖, chữ trên nền đỏ) | `--gold` #A8803C · nhạt `--gold-soft` #D8B778 |
| **Vàng đọc được trên nền giấy** (eyebrow, nhãn CHA/MẸ) | **#8A6424**: `--gold` quá nhạt cho chữ nhỏ trên nền sáng |
| Chữ trên nền đỏ | kem #FBF1DF, vàng `--gold-soft` |
| Đường kẻ vàng | `rgba(168,128,60,.7)` (vạch ❖) · `--line-gold` `rgba(168,128,60,.35)` |

Tương phản: chữ nhỏ trên nền giấy phải ≥4.5:1. #8A6424 đạt; `--gold` #A8803C thì
**không** đạt cho chữ dưới 18px.

---

## 2. Chữ

Năm bộ, tự host đủ trong `fonts/` (subset latin + latin-ext + vietnamese). Không
dùng Google Fonts.

| Bộ | Biến / tên | Vai trò trên điện thoại |
|---|---|---|
| **Playfair Display** 400/500/600 (+ nghiêng) | `'Playfair Display'` | **Chữ chính** từ Nhà trai trở xuống: tên, tiêu đề section, tên cha mẹ, Lịch trình, Đếm ngược, RSVP, form, footer. Luôn `font-variant-numeric: lining-nums` |
| **TAN Whistling** 400 | `--script` | **Chỉ tên đôi**: "Đăng Hiếu & Thiện Minh", "Hiếu & Minh". Luôn qua component `ScriptName` (font thiếu "ế"/"ệ", component tự vẽ dấu). Dấu "&" dùng glyph của font này, không nghiêng |
| **Cormorant Garamond** 400–600 (+ nghiêng) | `--serif` | Câu trích (nghiêng), dòng tiếng Anh phụ, "Chú rể"/"Cô dâu" |
| **Inter** 300–600 | `--sans` | **NHÃN**: chữ hoa, giãn `0.3em` (kiểu "THIỆP CƯỚI", "LỊCH TRÌNH", "NHÀ TRAI · GROOM'S FAMILY") |
| **JetBrains Mono** 400/500 | `--mono` | Gần như không dùng. Nhãn ô ảnh chờ |

### Thang chữ (điện thoại 390px, giá trị cuối cùng sau mọi lớp ghi đè)

| Vai trò | Font · cỡ · nét | Ví dụ |
|---|---|---|
| Tên đôi trên thẻ thiệp | TAN Whistling ~40–52px, đậm giả bằng `-webkit-text-stroke` | Đăng Hiếu & Thiện Minh |
| Tiêu đề section | Playfair 400, `clamp(36px, 11vw, 48px)`, `--ink` hoặc `--red` | Lễ thành hôn · Một ngày trọn vẹn |
| Tên chú rể / cô dâu | Playfair 400, ≤31px, `text-wrap: balance`, một dòng | Nguyễn Thu Thiện Minh |
| Tên mốc lịch trình | Playfair nghiêng ~23px, `--red` | Chụp ảnh gia đình |
| Tên người thân, nội dung | Playfair 400, 19px | Chu Đăng Trung |
| Câu trích | Cormorant nghiêng | Cùng nhau đón những hoàng hôn… |
| Nhãn | Inter 12–13px, hoa, giãn 0.3em, vàng | THIỆP CƯỚI · 15 · 01 · 2027 |
| Nút | Playfair 19px, không hoa, số lining | Xem bản đồ · +84 919229000 |
| Ô nhập form | **17px**, cao **56px** | |

Nguyên tắc: **nhãn thì Inter hoa giãn; mọi chữ đọc thì Playfair; tên đôi thì TAN
Whistling; câu thơ thì Cormorant nghiêng.**

---

## 3. Hoạ tiết và chất liệu

| Hoạ tiết | File / class | Ghi chú |
|---|---|---|
| Medallion H&M | `assets/medallion-ink.png` (nét đen), `assets/icons/medallion-wine.png` (nét đỏ #7E1416), `assets/medallion-gold.png` (vàng, dùng trên nền đỏ) | Logo nav, đầu thẻ Lễ thành hôn, footer, nhãn đĩa than |
| Dấu ❖ giữa đường vàng hở giữa | `.family.bride::before/::after`, `.rsvp::before/::after` (dòng ~1889) | Phân cách section. Đường mờ dần hai đầu, hở 12% ở giữa cho dấu ❖ |
| Giấy hoa dập chìm | `assets/background/paper-floral.jpg` | Nền chung cả trang, một lớp trên `body` |
| Vân hoa nổi trên nền đỏ | `assets/background/floral-relief.jpg` | Hero, footer |
| Cổng vòm cho chân dung | `.family-photo-frame` (dòng ~1918) | Viền vòm hai lớp mảnh: `0 0 0 1px` vàng · `0 0 0 7px` kem · `0 0 0 8px` vàng nhạt, + bóng `0 12px 24px -10px` |
| Minh hoạ nét vẽ tay | `assets/icons/timeline-camera-flowers-v2.png`, `-glasses`, `-rings`, `-dinner` | Tô #4A000B, nền trong. Bốn mốc lịch trình |
| Sợi chỉ uốn lượn | `TimelineWave` trong `components/Timeline.jsx` | SVG, nối các mốc |
| Tranh vẽ cặp đôi | `assets/rsvp/couple.jpg`, `heart.png`, `envelope.png` | Section RSVP |
| Đĩa than | `.mp-disc` + medallion vàng | Nút nhạc và bảng nhạc |

---

## 4. Hình khối

| Thuộc tính | Giá trị trên điện thoại |
|---|---|
| Bo góc nút lớn, thẻ chọn, thẻ đếm ngược | **20px** |
| Bo góc nút biểu tượng (menu, nhạc, mũi tên, đóng) | **14px** |
| Bo góc thẻ ảnh | 3px |
| Vùng chạm tối thiểu | 44×44px |
| Bóng ảnh | `0 18px 30px -14px rgba(51,35,31,.5)` |
| Bóng thẻ nổi | `0 30px 60px -28px rgba(51,35,31,.6), inset 0 1px 0 rgba(255,255,255,.7)` |
| Bóng nút đỏ | `0 12px 22px -10px rgba(126,20,22,.8), inset 0 1px 0 rgba(255,255,255,.18)` |
| Nhịp dọc giữa section | 72px (điện thoại dọc) |

Ngoại lệ đang có (xem `UX-NOTES.md`): nút ▾ nhạc 36px ngang, công tắc lặp cao 26px,
nút loa 40px.

---

## 5. Chuyển động

- Hiện-khi-cuộn: phần tử nổi lên nhẹ + rõ dần (`--ease-rise`). Điện thoại dùng
  IntersectionObserver (`[data-rv]` → `.rv-in`). Desktop dùng CSS scroll-driven
  (`.rv`), không chạy trên Firefox / Safari < 26: ở đó nội dung phải hiện **ngay**,
  không mất.
- Chậm, êm, không nảy. Easing có sẵn trong `:root`: `--ease-soft`, `--ease-rise`,
  `--ease-card`.
- Nét tự vẽ một lần (`DeskMotion.jsx`, chạy cả điện thoại): `[data-dv]` vào màn → gắn
  `[data-in]` → CSS trong `mobile.css` "CHUYỂN ĐỘNG" vẽ: vạch ❖ mọc từ giữa, bốn góc bậc
  thang thiệp mời, chữ "Hiếu & Minh" viết tay, chữ ký H/M, sợi chỉ lịch trình, đếm ngược
  lật số, phong thư gập lại rồi tan khi gửi RSVP.
- `html[data-dm]` chỉ có khi **không** bật giảm chuyển động. Mọi hiệu ứng mới nên khoá
  theo nó, để người bật "Reduce motion" thấy nội dung hiện sẵn.
- Liên tục: chỉ đĩa than quay khi phát nhạc, và video tranh cặp đôi (4 giây, lặp) trong thẻ
  cảm ơn RSVP, chỉ chạy khi đang trên màn.

---

## 6. Giọng văn

- Tiếng Việt trang trọng, ấm ("Trân trọng báo tin", "Sự hiện diện của Quý khách và gia
  đình là niềm vinh hạnh…"). Gọi khách là **"Quý khách"**, xưng "chúng em".
- Tiếng Anh là **phụ đề**: nhỏ hơn, nhạt hơn, thường Cormorant nghiêng. Không bao giờ
  đứng ngang hàng tiếng Việt.
- Chữ trên trang lấy từ `data/db.js`. Đừng viết lại câu chữ trong thiết kế. Cần câu
  mới thì ghi vào `CHANGES.md` (chủ nhà thêm khoá `site_config` mới qua admin).

---

## 7. Lịch sử thiết kế điện thoại

`reference-mobile/CHANGES.md` là nhật ký Claude Design viết khi làm bản điện thoại:
từng quyết định và lý do. `reference-mobile/DESIGN-BRIEF-mobile.md` là đề bài lúc đó.
Cả hai **chỉ để hiểu lý do**: một số dữ kiện đã lạc hậu (địa điểm, cổng mở thiệp).
Ngoài ra production đã chỉnh thêm sau đó (Playfair cho Lịch trình/RSVP/footer, nút
bo 20px). Khi lệch, **mã trong thư mục này là đúng**.
