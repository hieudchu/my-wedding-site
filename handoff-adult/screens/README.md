# Ảnh chụp: trang /adult bản dựng nền (2026-11-17)

Chụp từ chính prototype bằng `tools/capture.mjs`, độ nét 2× (ảnh rộng gấp đôi số px CSS).
Điện thoại giả lập cảm ứng (`isMobile`, `hasTouch`).

- `doc-390x844-*` = điện thoại **dọc**
- `ngang-844x390-*` = điện thoại **ngang**
- `desktop-1440x900-*` = máy tính

| # | Tên | Trạng thái |
|---|---|---|
| 01 | `toan-trang` | **Toàn trang** từ đầu tới cuối |
| 02 | `mo-trang` | Vừa mở link: phần thấy đầu tiên |
| 03 | `gio-dia-diem` | Giờ, ngày, nơi tổ chức, hai nút |
| 04 | `anh` | Ảnh cưới |
| 05 | `xac-nhan-trong` | Đầu mục xác nhận, form trống (nút gửi tắt + gợi ý) |
| 06 | `xac-nhan-da-dien` | Đã điền tên, chọn "Tôi sẽ tham dự", lời nhắn |
| 07 | `cam-on-tham-du` | Thẻ cảm ơn khi tham dự |
| 08 | `cam-on-khong-den` | Thẻ cảm ơn khi không đến |
| 09 | `lightbox` | Bấm ảnh → xem toàn màn hình |

`controls-*.json`: mọi phần tử bấm được ở trang và ở form đã điền, kèm class, nhãn, rộng × cao,
có đang tắt không. Bảng tóm tắt ở `INTERACTIONS.md`.

Không có ảnh: thông báo chặn spam (prototype không có database thật). Nội dung ở `INTERACTIONS.md`.
