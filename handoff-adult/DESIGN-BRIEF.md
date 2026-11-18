# Đề bài: thiết kế trang /adult

## 1. Trang này để làm gì

Bố mẹ hai bên gửi link qua Zalo / Messenger cho **đồng nghiệp, cấp trên, bạn bè của mình** để
mời dự tiệc cưới của con. Khách mở link, đọc thiệp, bấm xác nhận có đến hay không. Bố mẹ xem
danh sách trong trang admin (tab "Khách xác nhận" › ô **Bố mẹ mời**).

| | Trang chính `/` | Trang này `/adult` |
|---|---|---|
| Người gửi | Cô dâu chú rể | Bố mẹ hai bên |
| Người nhận | Bạn bè cô dâu chú rể | Đồng nghiệp, cấp trên, bạn của bố mẹ (40–65 tuổi) |
| Giọng | Thân mật, nhiều cảm xúc | Trang trọng, lễ nghi: "Quý khách", "gia đình chúng tôi" |
| Ảnh | 22 ảnh: carousel, chân dung, thiệp, đếm ngược | **Một** ảnh |
| Nhạc, đếm ngược, lịch trình | Có | **Không** |
| Xác nhận | Họ tên, nhà trai/gái, số người, SĐT, ghi chú; + lời chúc | **Họ tên, tham dự hay không, lời nhắn** |

## 2. Bố cục hiện tại (bản dựng nền)

1. **Thẻ thiệp**: con dấu HM · "Thiệp mời" · tên bố mẹ hai họ (Nhà trai | Nhà gái) · "Trân trọng
   báo tin lễ thành hôn của con chúng tôi" · tên chú rể & cô dâu · "Trân trọng kính mời Quý khách
   tới dự bữa tiệc chung vui cùng gia đình chúng tôi" · giờ, thứ, ngày · nơi tổ chức + địa chỉ ·
   nút **Xem bản đồ**, **Xác nhận tham dự** · "Sự hiện diện của Quý khách là niềm vinh hạnh…".
2. **Một ảnh cưới** khung vòm (bấm → xem toàn màn hình).
3. **Xác nhận**: tiêu đề + đoạn mời · form ba trường · thẻ cảm ơn (hai nội dung: tham dự / không).
4. **Chân trang**: con dấu, "Gia đình hai họ trân trọng cảm ơn".

Bố cục, thứ tự, câu chữ đều được đổi. Chỉ cần giữ đủ **nội dung thông tin** ở mục 4 và **chức
năng** trong `INTERACTIONS.md`.

**Số đo bản dựng nền** (để có điểm so):

| Khổ | Trang dài | Ảnh | Ghi chú |
|---|---|---|---|
| 390×844 | 2.505px (3 màn) | 358×448 | Thẻ thiệp cao hơn một màn: nút Xác nhận nằm dưới mép màn đầu |
| 844×390 | 2.611px (6,7 màn) | 520×650 | Ảnh cao **1,7 màn**; thẻ thiệp một cột hẹp giữa nền trống |
| 1440×900 | 2.642px (2,9 màn) | 520×650 | Một cột 600px giữa màn rộng |
| 320×640 | 2.460px | 288×360 | Không cuộn ngang |

## 3. Muốn đạt được gì

- **Mở ra là thấy ngay thiệp mời**: ai mời, mời dự gì, khi nào, ở đâu. Không màn chờ, không cổng.
- **Giống một tấm thiệp in trang trọng** khách quen cầm trên tay, nhưng đọc dễ trên điện thoại.
- **Đọc dễ cho người lớn tuổi**: chữ thân ≥ 17px trên điện thoại, tương phản đủ, không chữ mờ
  trên nền ảnh, không chữ in hoa giãn rộng cho thông tin quan trọng.
- **Xác nhận dễ**: một tay trên điện thoại, ít bước, biết rõ đã gửi được chưa.
- **Đẹp trên desktop**: cấp trên hay mở link trên máy tính văn phòng.
- **Hướng ngang** không được vỡ (khách xoay máy để xem ảnh).

## 4. Ràng buộc cứng

- **Chỉ sửa `styles/adult.css`** và hai khối `adult/…` trong `app.jsx`. CSS mới dùng class `a-`.
  `globals.css`, `sections.css`, `desktop.css`, `mobile.css` là của trang chính: **không sửa**.
  Chúng vẫn được nạp ở trang này (production nạp chung), nên đừng đặt class trùng với trang chính
  (`.hero`, `.info`, `.rsvp`, `.nav`, `.footer`, `.family`…).
- **Không dùng `PHONE_QUERY`** của trang chính: trang này tự co giãn (clamp, `@media` theo bề
  rộng). Nhưng nhớ `sections.css` có luật trong `PHONE_QUERY` gắn lên `body` (nền giấy hoa văn
  với `background-blend-mode: overlay`).
- **Form chỉ ba trường** (mục 1). Giữ dữ liệu gửi đi đúng `DATA-CONTRACT.md` §3.
- **Không viết cứng tên người, ngày, giờ, địa điểm**: lấy từ `config` / `family_members`.
- iOS 17/18 Safari: ô nhập ≥ 16px (không thì iPhone tự phóng to), vùng chạm ≥ 44px, không đặt
  `overflow` lên `html`, tôn trọng `prefers-reduced-motion`.
- Không thêm nhạc, không thêm thư viện, không thêm font mới (đã có 5 bộ trong `fonts/`).
- Ảnh: dùng `<MediaImage storagePath=… />` (khung chỉnh từ admin + lightbox). Không cắt cứng ảnh
  bằng `object-position`. Muốn thêm ảnh thứ hai thì chọn từ ảnh sẵn có (`DATA-CONTRACT.md` §4) và
  ghi lý do trong `CHANGES.md`; tinh thần trang là **ít ảnh**.

## 5. Câu hỏi mở (đề xuất được, chủ nhà sẽ quyết)

- **Ngày âm lịch** (thiệp bố mẹ hay có, vd. "tức ngày … tháng Chạp năm Bính Ngọ"): nếu thiết kế có
  chỗ cho dòng này, để dạng chữ lấy từ dữ liệu (khoá `site_config` mới), chủ nhà sẽ điền và kiểm.
- **Câu mời**: hiện là "bữa tiệc chung vui". Gia đình có thể muốn "tiệc cưới", "lễ vu quy / lễ
  thành hôn"… Đề xuất cách để chủ nhà sửa chữ (khoá `site_config`).
- **Thứ tự hai họ**: hiện nhà trai trái, nhà gái phải (thói quen thiệp in nhà trai).
- **Tên khách trên thiệp** ("Trân trọng kính mời Anh/Chị …"): chủ nhà chưa cần. Đừng làm.

## 6. Đầu ra

- `app.jsx` (giữ tiêu đề `// ═══ … ═══` của từng khối) + `styles/adult.css` đã sửa.
- **`CHANGES.md`**: đổi gì, vì sao; class mới; chữ mới (đề xuất khoá `site_config` nếu muốn chủ
  nhà sửa được); ảnh dùng và tỉ lệ khung ảnh.
- Ảnh chụp mới cùng tên với `screens/` (390×844, 844×390, 1440×900) để so trước/sau.

## 7. Nghiệm thu

- Mọi mục `INTERACTIONS.md` vẫn chạy ở cả ba khổ; gửi được cả "tham dự" lẫn "không đến".
- Không cuộn ngang ở 320px, 390px, 844×390, 1440px (`scrollWidth === innerWidth`).
- Tên dài nhất hiện tại không vỡ dòng xấu ở 320px.
- Bật Reduce motion: mọi thứ hiện đủ, đứng yên.
- Không đổi gì ở trang chính (các file CSS dùng chung giữ nguyên).
