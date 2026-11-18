# Dữ liệu: trang /adult đọc gì, gửi gì

Giá trị dưới đây là dữ liệu thật ngày 2026-11-17 (`data/db.js`). Chủ nhà sửa được qua trang
admin, nên thiết kế phải chịu được giá trị khác (dài hơn, ngắn hơn).

## 1. `site_config` → `config` (useSiteConfig)

| Khoá DB | Biến | Giá trị | Ghi chú |
|---|---|---|---|
| `groom_name` | `config.groomName` | Chu Đăng Hiếu | Tên đầy đủ chú rể |
| `bride_name` | `config.brideName` | Nguyễn Thu Thiện Minh | Dài nhất: 21 ký tự |
| `groom_short` / `bride_short` | `config.groomShort` / `brideShort` | Hiếu / Minh | Tiêu đề tab, chân trang |
| `wedding_date` | `config.weddingDate` | 2027-01-15 | ISO; hiển thị qua `formatDateParts` |
| `wedding_time` | `config.weddingTime` | 18:00 | |
| `venue_name` | `config.venueName` | Sheraton Hanoi | |
| `venue_address` | `config.venueAddress` | K5, Vành Đai 1/11 Đ. Xuân Diệu, Tây Hồ, Hà Nội | ~50 ký tự |
| `map_url` | `config.mapUrl` | https://maps.app.goo.gl/… | Rỗng → ẩn nút bản đồ |

Mọi khoá khác trong `site_config` có trong `siteText` (đối tượng khoá → chữ). Trang này **chưa
dùng khoá chữ nào**: mọi câu văn đang viết trong JSX. Muốn chủ nhà sửa được câu nào thì đề xuất
khoá mới dạng `adult_…` trong `CHANGES.md` (vd. `adult_invite`, `adult_lunar_date`).

## 2. `family_members` (tên bố mẹ)

| side | role_label | name_vi | sort_order |
|---|---|---|---|
| groom | Cha | Chu Đăng Trung | 1 |
| groom | Mẹ | Phạm Hồng Thuý | 2 |
| bride | Cha | Nguyễn Văn Đông | 1 |
| bride | Mẹ | Nguyễn Thị Kim Phương | 2 |

Số dòng mỗi bên đổi được (0–n). `role_label` là chữ tự do trong admin; trang đổi "Cha"/"Bố" →
"Ông", "Mẹ" → "Bà".

## 3. Gửi xác nhận → bảng `rsvps`

```js
supabase.from('rsvps').insert({
  name,            // string, trim, 1–120 ký tự (bắt buộc)
  attending,       // true | false (bắt buộc) — trang này ghi cả lời từ chối
  audience: 'adult', // đánh dấu đến từ trang /adult (admin lọc theo đây)
  message,         // string ≤ 300 ký tự, hoặc null
});
```

- **Không** gửi `side`, `guest_count`, `phone` (để trống trong DB).
- **Không** gọi `.select()` sau `insert` (khách không có quyền đọc → báo lỗi giả).
- Lỗi `code === 'P0001' && message === 'rate_limited'` = bị chặn spam (xem `INTERACTIONS.md`).
- Thêm trường mới vào form = cần migration database: hỏi chủ nhà trước.

## 4. Ảnh

Trang dùng một ảnh: `background/moment-2.jpg` (dọc 2:3). Có sẵn trong kho, chọn được nếu muốn đổi:
`carousel/…` (15 ảnh dọc 2:3), `portraits/groom.jpg`, `portraits/bride.jpg`,
`background/left.jpg`, `background/right.jpg`, `background/timeline-left.jpg`,
`background/timeline-right.jpg`. Bundle chỉ chép `moment-2`; ảnh khác hiện khung `.ph` thay ảnh.
Đổi ảnh thì ghi rõ trong `CHANGES.md`, production sẽ có ảnh thật.

Trang trí: `assets/medallion-gold.png` (con dấu HM vàng), `assets/medallion-ink.png` (con dấu nét
mực), `assets/background/paper-floral.jpg` (vân hoa xám, phải dùng với
`background-blend-mode: overlay` trên màu giấy, thiếu là ra nền xám), `floral-relief.jpg` (vân
hoa nổi, dùng trên nền đỏ).
