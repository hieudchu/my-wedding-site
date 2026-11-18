# Handoff: ảnh xem trước khi gửi link thiệp bố mẹ (2026-11-18)

## Việc cần làm

Thiết kế lại **ảnh xem trước** hiện ra khi bố mẹ gửi link thiệp mời (`/thiep-moi`, `/adult`) qua
**Zalo, Messenger, WhatsApp**. Người nhận là đồng nghiệp, cấp trên, bạn bè của bố mẹ (40–65 tuổi).
Ảnh phải trang trọng và đọc được ngay trong bong bóng chat. Bố cục chủ nhà muốn:
**ảnh cô dâu chú rể một bên, thiệp cưới một bên**.

Ảnh đang dùng: `reference/hien-tai-thiep-bo-me.jpg`, dựng từ `index.html`.
Ảnh của trang chính (để tham khảo, **không** sửa): `reference/trang-chinh.jpg`.
Zalo hiện ảnh xem trước nguyên tỉ lệ 1.91:1, rộng gần hết bong bóng chat (~350px trên điện thoại).

## Chạy

```bash
cd handoff-share-image && python3 -m http.server 8790
# mở http://localhost:8790/index.html — trang đúng 1200×630
```

`index.html` là một file HTML tĩnh (CSS viết trong file), không có JS. Sửa thẳng file này.
Mở `file://` cũng được, nhưng font có thể không nạp.

## Ràng buộc cứng

| | |
|---|---|
| Kích thước | **1200 × 630 px** (1.91:1), `body` đúng cỡ này, không cuộn |
| Dung lượng | JPEG **< 120 KB** (Zalo không hiện ảnh 149 KB; WhatsApp bỏ ảnh > 300 KB). `tools/render.mjs` tự hạ chất lượng cho vừa |
| Chữ | Ảnh bị thu nhỏ còn ~350px ngang → chữ thân ≥ 24px, tên ≥ 48px trong khung 1200. Tương phản đủ, không đặt chữ mỏng lên ảnh |
| WhatsApp | Có khi cắt **vuông ở giữa** (~630×630 vùng giữa). Tên đôi nên còn đọc được trong vùng giữa nếu được |
| Font | Chỉ 5 bộ trong `fonts/` (TAN Whistling, Playfair Display, Cormorant Garamond, Inter, JetBrains Mono). Không thêm font |
| TAN Whistling | Font **thiếu dấu** tiếng Việt: chỉ viết được tên ngắn "Đăng Hiếu", "Thiện Minh" với hai mẹo `.dia-ac` (dấu sắc của "ế") và `.dia-dot` (chấm của "ệ") có sẵn trong `index.html`. Tên đầy đủ ("Nguyễn Thu Thiện Minh"…) dùng **Playfair Display** |
| Ảnh cưới | Chọn trong `assets/photos/` (tờ tổng hợp: `reference/anh-co-san.jpg`). Không dùng ảnh ngoài |
| Không | Không mã QR, không số điện thoại, không tên khách |

## Thông tin trên ảnh (đúng như thiệp)

| | |
|---|---|
| Tên ngắn | Đăng Hiếu & Thiện Minh |
| Tên đầy đủ | Chu Đăng Hiếu & Nguyễn Thu Thiện Minh |
| Câu mời | Trân trọng kính mời Quý khách tới dự lễ thành hôn của hai con chúng tôi |
| Giờ, ngày | 17:30 · Thứ sáu, 15.01.2027 |
| Nơi | Khách sạn Sheraton · Hà Nội (Phòng tiệc Sông Hồng) |
| Bố mẹ | Nhà trai: Chu Đăng Trung, Phạm Hồng Thuý · Nhà gái: Nguyễn Văn Đông, Nguyễn Thị Kim Phương |

Không bắt buộc ghi hết; ảnh nhỏ, chọn ít chữ mà rõ.

## Màu, tài sản (giống trang /adult)

`--a-red #7E1416` · `--a-wine #32000C` (nền + `floral-relief.jpg` trộn `overlay`) · thẻ đỏ `#4A000B` ·
vàng `#A8803C` / vàng nhạt `#D8B778` · kem `#FBF1DF` · giấy `#F6EDE0` (+ `paper-floral.jpg` trộn
`overlay`, thiếu là ra màu xám) · thẻ giấy `#FFFCF5` · chữ `#33231F`.
Con dấu: `assets/medallion-gold.png` (vàng), `medallion-ink.png` (nét mực), `medallion-wine.png` (đỏ).

## Đầu ra

- `index.html` đã sửa (có thể thêm `variant-2.html`… nếu muốn đưa nhiều phương án).
- Hoặc thẳng ảnh JPEG 1200×630 < 120 KB.
- Một dòng ghi chú: ảnh nào, vì sao.

Chủ nhà tự tải ảnh lên ở **Admin › Khách bố mẹ mời › Ảnh xem trước khi gửi link**. Admin cắt ảnh về
1200×630 (cắt giữa nếu sai tỉ lệ) và nén < 120 KB.

## Xuất ảnh (Claude Code làm)

```bash
cd handoff-share-image && python3 -m http.server 8790 &
PW_FROM=<thư mục có node_modules/playwright>/x.js node tools/render.mjs index.html out.jpg
```
