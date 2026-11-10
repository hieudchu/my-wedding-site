# Component map — ImageFramer

## Port

| Prototype | Production |
|---|---|
| `ImageFramer.jsx` | `app/src/admin/ImageFramer.jsx` (đổi `window.*` thành `export`) |
| `frames.js` | `app/src/admin/framerFrames.js` |
| `styles/image-framer.css` | `app/src/admin/image-framer.css` — phần `/* Lối vào trên trang Media */` cho `MediaManager.jsx` |
| `app.jsx` | không port — chỉ tham khảo cách nối |

`img.has-fit` trong `image-framer.css` là bản chép của quy tắc trang khách. Production nên
import một nguồn chung thay vì giữ hai bản.

## Props

```js
<ImageFramer
  slot="portraits/bride.jpg"     // §2 — chọn bộ khung trong framesFor()
  label="Chân dung cô dâu"
  src={url}                      // blob: hoặc https:
  isNew={true}                   // nút Xoay + nút chính "Tải lên"
  fit={{ d: {...}, m: null }}    // hoặc null = giữa
  naturalW={1066} naturalH={1600}
  // chỉ giao diện:
  fileName="IMG_2041.HEIC"       // nhận ra HEIC khi không mở được
  initialProfile="m"             // mở sẵn hồ sơ Điện thoại (vd. đang ở điện thoại)
  onSave={(result, reportProgress) => Promise}
  onCancel={() => {}}
  onPickAnother={() => {}}       // tuỳ chọn; hiện "Chọn ảnh khác" khi ảnh hỏng
/>
```

- `result` đúng §1: `{ fit: { d, m|null }, rotate? }`. `rotate` chỉ có khi `isNew`.
  `x, y` làm tròn 0,1; `z` làm tròn 0,01, trong 1–3.
- `onSave` trả Promise. Trong lúc chờ, trình chỉnh khoá thao tác và hiện "Đang lưu…" /
  "Đang tải lên… N%" (gọi `reportProgress(0–100)` nếu có tiến trình; không gọi thì thanh
  chạy vô định). `reject(new Error('…'))` → báo lỗi, giữ nguyên khung, nút thành "Thử lại".
  Resolve xong thì **component cha** đóng trình chỉnh và báo "Đã lưu".
- `naturalW/H` chỉ dùng tạm trước khi ảnh tải xong; sau đó lấy kích thước thật của ảnh.

## Trạng thái

| Trạng thái | Hiện ra |
|---|---|
| đang mở ảnh | vòng xoay "Đang mở ảnh…" trên vùng kéo |
| ảnh không mở được | thông báo (HEIC có lời riêng), nút Đóng / Chọn ảnh khác |
| đang lưu / tải lên | thanh tiến trình trên hàng nút, nút chính ghi phần trăm, vùng kéo mờ |
| lỗi tải lên | dải đỏ nhạt trên hàng nút, nút "Thử tải lên lại" |
| đã lưu | cha đóng trình chỉnh + `admin-toast` |

## Bố cục

Trình chỉnh tự đo kích thước của nó (không dùng media query):
`desk` ≥ 900×560 · `land` rộng > cao và cao < 560 · còn lại `phone`.

## Lối vào trên `MediaManager.jsx`

- Mỗi ô có ảnh: nút **Chỉnh khung** (`rw-btn if-go`) + **Đổi ảnh**. Bấm ô xem trước vẫn là
  chọn file như hôm nay — nhưng giờ chọn xong mở trình chỉnh (`isNew`) thay vì tải lên ngay.
- Ô xem trước nhỏ: thêm `if-thumb if-thumb-{arch|blob34|blob45|wide|43}` để mang đúng tỉ lệ
  khung máy tính, ảnh bên trong là `<img class="has-fit">` với `fit.d` đã lưu.
- Dòng trạng thái: "Khung: giữa ảnh (chưa chỉnh)" / "Khung đã chỉnh · điện thoại dùng
  chung | có khung riêng".
- Album: mỗi ảnh có nút Chỉnh khung; ảnh thêm mới đi qua trình chỉnh trước khi tải lên.
- Lịch trình: ảnh của mỗi mốc giờ, như ô cố định.
