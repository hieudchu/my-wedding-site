# Chức năng từng phần tử · trang /adult

Số đo thật (rộng × cao, px CSS) từ `screens/controls-*.json`. Ba khổ: **dọc** 390×844,
**ngang** 844×390, **desktop** 1440×900. Ở khổ ngang và desktop, trang là một cột rộng tối đa
600px (thẻ thiệp) / 560px (xác nhận), căn giữa.

## Tóm tắt

| # | Phần tử | Class | Dọc | Ngang | Desktop | Bấm thì |
|---|---|---|---|---|---|---|
| C1 | Xem bản đồ | `.a-btn.a-btn-ghost` | 137×48 | 137×48 | 137×48 | Mở `config.mapUrl` (Google Maps) ở tab mới |
| C2 | Xác nhận tham dự | `.a-btn.a-btn-red` | 185×48 | 185×48 | 185×48 | Cuộn mượt tới `#xac-nhan` |
| P1 | Ảnh cưới | `.a-photo img` | 358×448 | 520×650 | 520×650 | Mở lightbox toàn màn hình |
| R1 | Họ và tên | `.a-field input` | 309×48 | 494×48 | 494×48 | Ô nhập, bắt buộc, tối đa 120 ký tự |
| R2 | Tôi sẽ tham dự | `.a-opt` | 150×61 | 242×52 | 242×52 | Chọn tham dự (radio) |
| R3 | Rất tiếc, tôi không thể đến | `.a-opt` | 150×61 | 242×52 | 242×52 | Chọn không đến (radio) |
| R4 | Lời nhắn gửi gia đình | `.a-field textarea` | 309×96 | 494×96 | 494×96 | Tuỳ ý, cắt ở 300 ký tự, có bộ đếm |
| R5 | Gửi xác nhận | `.a-submit` | 309×52 | 494×52 | 494×52 | Gửi; tắt khi thiếu R1 hoặc chưa chọn R2/R3 |
| R6 | Sửa lại xác nhận | `.a-link` | — | — | — | Trong thẻ cảm ơn: quay lại form, giữ nội dung đã điền |

## Thẻ thiệp (`AdultApp.jsx`)

- **Tên bố mẹ**: đọc bảng `family_members` (cả hai bên, theo `sort_order`). `role_label` "Cha" /
  "Bố" → "Ông", "Mẹ" → "Bà"; nhãn khác giữ nguyên. Chưa tải xong / không có dòng nào → "—".
- **Ngày**: `formatDateParts(config.weddingDate)` → `dd`, `mm`, `yyyy`, `weekday` ("Thứ sáu").
  **Giờ**: `config.weddingTime` "18:00" → "18 giờ 00".
- **C1 Xem bản đồ**: chỉ hiện khi có `config.mapUrl`. `target="_blank"`.
- **C2 Xác nhận tham dự**: `scrollIntoView({ behavior: 'smooth', block: 'start' })` tới section
  `#xac-nhan` (`scroll-margin-top: 16px`). Link có `href="#xac-nhan"` nên vẫn chạy khi JS lỗi.
- Tiêu đề tab: "Thiệp mời · Hiếu & Minh".

## Ảnh (`MediaImage`)

- Một ảnh: `background/moment-2.jpg` (ảnh đếm ngược của trang chính), khung chỉnh từ admin
  (`fit`) áp dụng như trang chính. Ảnh hỏng → khung `.ph` có chữ.
- Bấm → **lightbox** dùng chung với trang chính: ảnh nguyên khung trên nền tối, nút × đóng, chạm
  nền / Esc đóng, khoá cuộn trang khi mở.

## Xác nhận (`AdultRSVP.jsx`)

**Trạng thái form**

| Trạng thái | Hiện gì |
|---|---|
| Chưa đủ | R5 tắt (màu xám hồng) + dòng gợi ý dưới nút: "Xin Quý khách điền họ tên và chọn tham dự hay không" / "…điền họ tên" / "…chọn tham dự hay không" |
| Đủ | R5 đỏ, bấm được |
| Đang gửi | R5 "Đang gửi…", tắt |
| Bị chặn spam | Hộp đỏ nhạt trên nút: "Quý khách đã gửi nhiều lần trong ít phút. Xin vui lòng thử lại sau ít phút." Form giữ nguyên |
| Đã gửi, tham dự | Thẻ cảm ơn: con dấu · "Trân trọng cảm ơn Quý khách" · "Gia đình chúng tôi rất hân hạnh được đón tiếp Quý khách vào 18:00 ngày 15.01.2027 tại Sheraton Hanoi." · R6 |
| Đã gửi, không đến | Thẻ cảm ơn: "Trân trọng cảm ơn Quý khách đã hồi âm" · "Gia đình chúng tôi xin ghi nhận và cảm ơn tình cảm Quý khách đã dành cho các con." · R6 |

- **R2/R3** là cặp radio (`role="radio"`, `aria-checked`). Chọn lại nút đang chọn không bỏ chọn.
- **R6 Sửa lại** mở lại form với nội dung cũ; gửi lần nữa tạo **thêm một dòng** (database lọc
  dòng trùng y hệt trong 10 phút; admin ẩn / xoá được).
- **Lỗi mạng**: vẫn hiện thẻ cảm ơn (như trang chính, cố ý không làm khách lo), lỗi ghi console.
  Chỉ lỗi chặn spam (`rate_limited`) mới hiện thông báo.
- **Chặn spam** (database): mỗi IP tối đa 6 lần / 10 phút, 20 lần / ngày.
- Không có mục "gửi lời chúc" riêng như trang chính: lời nhắn nằm luôn trong R4.

## Toàn trang

- Không nav, không nhạc, không bong bóng nhạc, không hiệu ứng cuộn.
- Không phụ thuộc `PHONE_QUERY`: một cột co giãn bằng `clamp()`. `@media (max-width: 360px)`:
  R2/R3 xếp dọc.
- `prefers-reduced-motion`: tắt chuyển màu nút.
