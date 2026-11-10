# Data contract — trình chỉnh khung ảnh

Ranh giới giữa giao diện và backend. Thiết kế chỉ dựa vào những gì ở đây thì port về
production được ngay.

## 1. Giá trị mà trình chỉnh khung trả ra

```js
// Kết quả khi bấm "Lưu"
{
  fit: {
    d: { x: 50, y: 32, z: 1.0 },   // MÁY TÍNH — bắt buộc
    m: { x: 56, y: 42, z: 1.45 },  // ĐIỆN THOẠI — tuỳ chọn; null/vắng = "dùng chung với máy tính"
  },
  rotate: 0,                       // 0 | 90 | 180 | 270 — CHỈ có khi là ảnh mới chưa tải lên
}
```

- `x`, `y`: **tiêu điểm**, % theo chiều rộng/cao ảnh, 0–100. Điểm này luôn đứng yên ở
  cùng vị trí tương đối trong khung, dù khung có tỉ lệ nào.
- `z`: độ phóng, **1 – 3**. `z = 1` = ảnh vừa khít khung (`object-fit: cover`).
- Với `z ≥ 1` và `x, y` trong 0–100 thì **không bao giờ lộ khoảng trống** — không cần
  thiết kế trạng thái "ảnh lệch ra ngoài khung".
- Không có hình chữ nhật cắt tự do. Admin không vẽ khung — khung có sẵn theo ô.

Trang khách áp đúng như sau (dùng y nguyên quy tắc này trong prototype để xem trước):

```css
img.has-fit {
  object-fit: cover;
  object-position: var(--fx) var(--fy);
  transform: scale(var(--fz));
  transform-origin: var(--fx) var(--fy);
}
/* bố cục điện thoại dùng --mfx --mfy --mfz */
```

## 2. Đầu vào của trình chỉnh khung

```js
{
  slot: 'portraits/bride.jpg',   // ô nào → quyết định các khung xem trước (bảng §3)
  label: 'Chân dung cô dâu',
  src: 'blob:… | https://…',     // ảnh mới (cục bộ) hoặc ảnh đang có
  isNew: true,                   // true → có nút xoay, nút chính là "Tải lên"; false → "Lưu khung"
  fit: { d: {...}, m: null },    // khung đang lưu, hoặc null = giữa (x 50, y 50, z 1)
  naturalW: 1066, naturalH: 1600,
}
```

Đầu ra hai nút: **Lưu** (trả §1) và **Huỷ** (không đổi gì). Ảnh đã có → "Lưu" xong là
xong ngay (chỉ ghi dữ liệu). Ảnh mới → sau "Lưu" là tải lên (vài giây), cần trạng thái
đang tải / lỗi.

## 3. Các khung trên trang khách — phải xem trước được

Mỗi ô ảnh hiện ở **nhiều khung khác nhau** tuỳ màn hình. Đây là lý do có hai hồ sơ
máy tính / điện thoại.

| Ô | Máy tính | Điện thoại dọc | Điện thoại ngang / tablet |
|---|---|---|---|
| `carousel/*` (album mở đầu) | Ảnh dọc: thẻ ~**3:4** (1 : 1.34), cao tới 760px. Ảnh ngang: thẻ **3:2**. Phía sau là chính ảnh đó phóng to, mờ, phủ cả màn | Thẻ **2:3** gần trọn màn, bo 4px, nền đỏ sẫm | Thẻ **2:3** theo chiều cao màn |
| `portraits/groom.jpg`, `bride.jpg` | **3:4**, đỉnh **vòm tròn** (`border-radius: 280px 280px 8px 8px`) | **3:4** vòm, rộng ≤ 340px, viền vàng mảnh | Vòm cao bằng khối chữ bên cạnh — tỉ lệ **thay đổi**, khoảng 0.6 → 1.0 (rộng/cao) |
| `background/right.jpg` | Mảng **giọt nước 3:4** (`border-radius: 48% 52% 56% 44% / 54% 46% 54% 46%`), tràn mép phải | Cùng hình, rộng ≤ 300px, giữa màn | Cùng hình, cao 82% màn |
| `background/left.jpg` | Mảng **giọt nước 4:5**, tràn mép trái | như trên | như trên |
| `timeline/*` (mỗi mốc giờ) | **4:3** | **3:2** toàn bề ngang | **3:2**, rộng ≤ 300px |
| `background/moment-2.jpg` (trên đồng hồ đếm ngược) | Dải **16:9** bo 6px; thẻ đếm ngược **đè ~50px mép dưới** | **Hiện trọn ảnh, không cắt** → khung không có tác dụng ở đây | Khoảng **560:428**, thẻ đếm ngược đè chân ảnh |

Ghi chú:
- Con dấu (`icons/*`) **không** có trình chỉnh khung.
- Khách bấm vào ảnh vẫn mở **ảnh đầy đủ** — trình chỉnh khung không cắt file. Nên nói
  điều này trong giao diện để admin yên tâm thử.
- Ô `moment-2` trên điện thoại dọc: cần cho admin biết khung không áp ở đó (hiện trọn ảnh).

## 4. Ảnh mẫu trong `photos/`

| File | Kích thước | Dùng để thử |
|---|---|---|
| `groom.jpg`, `bride.jpg` | 1066×1600 | chân dung vào vòm |
| `right.jpg`, `left.jpg` | 1077×1600 | giọt nước (ảnh scan phim, có viền trắng 2 bên → phải phóng ~1.1 mới hết viền) |
| `moment-2.jpg` | 1077×1600 | **ảnh dọc vào khung 16:9** — ca khó nhất |
| `carousel-1.jpg`, `carousel-2.jpg` | dọc | album |
| `sideways.jpg` | 1600×1077 | ảnh bị nằm nghiêng → thử nút xoay |

Khung hiện đang chỉnh cứng trong CSS production (để so):
`bride` điện thoại `{x 56, y 42, z 1.45}` · `groom` màn ngang `{x 50, y 40, z 1}` ·
`left/right` điện thoại `z 1.1` · `moment-2` màn ngang `{x 50, y 38}`.
