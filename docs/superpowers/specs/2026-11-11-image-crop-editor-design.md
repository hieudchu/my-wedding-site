# Chỉnh khung ảnh trong admin — thiết kế

Ngày: 2026-11-11 · Trạng thái: **đã làm** (xem §8) · Handoff UI: `handoff-media-editor/` (bản Claude Design trả về)

## 1. Vì sao

Hôm nay admin chọn file là tải lên ngay. Ảnh lên trang khách luôn bị `object-fit: cover`
cắt **chính giữa**, và admin chỉ biết kết quả khi mở trang khách ra xem. Không có cách
nào chọn phần ảnh được giữ lại.

Thêm hai vấn đề đọc được trong code:

1. **Cùng một ảnh, khung khác nhau theo màn hình.** Chân dung là 3:4 trên máy tính
   nhưng bị kéo theo chiều cao khối chữ ở màn ngang; ảnh lịch trình 4:3 trên máy tính,
   3:2 trên điện thoại; ảnh đếm ngược 16:9 trên máy tính, hiện **trọn ảnh** trên điện
   thoại dọc, 560:428 trên màn ngang. Cắt sẵn một lần (crop "nướng" vào file) sẽ đúng
   ở chỗ này và sai ở chỗ kia.
2. **Khung đang bị chỉnh cứng trong CSS, gắn với tấm ảnh hiện tại.** Thay ảnh là sai:
   - `sections.css:2527` — cô dâu (điện thoại) `scale(1.45)`, `transform-origin: 56% 42%`
   - `sections.css:2917` — chú rể (màn ngang/tablet) `object-position: 50% 40%`
   - `sections.css:1963` — hai ảnh nền thiệp (điện thoại) `scale(1.1)` để cắt viền phim scan
   - `sections.css:2258` — ảnh đếm ngược (màn ngang) `object-position: 50% 38%`

## 2. Mục tiêu

- Admin chọn **phần ảnh được giữ** (kéo để dời, chụm/lăn chuột/thanh trượt để phóng)
  cho từng ô ảnh, trên **cả máy tính lẫn điện thoại**.
- **Xem trước đúng khung thật** của ô đó ở mọi bố cục (máy tính, điện thoại dọc,
  điện thoại ngang) *trước khi* lưu — kể cả hình vòm, giọt nước, bo góc.
- Chỉnh lại được **ảnh đã có** mà không phải tải lại file.
- Gỡ bốn chỗ chỉnh cứng trong CSS, chuyển thành dữ liệu.

## 3. Không làm

- Bộ lọc màu, sáng/tối, tương phản, chữ/sticker lên ảnh.
- Cắt "nướng" vào file gốc. File gốc và bản nén giữ nguyên toàn bộ ảnh.
- Thay đổi lightbox: khách bấm ảnh vẫn xem **ảnh đầy đủ** (như hiện tại, và như lời
  hứa trong mô tả từng ô ở admin).
- Chỉnh khung cho con dấu (`icons/`) — PNG nền trong, `object-fit: contain`, không cắt.
- Nhạc, video.

**Phản mục tiêu** (chạy được nhưng vẫn là hỏng):
- Thay ảnh mà khung cũ áp vào ảnh mới → mặt người lệch ra ngoài.
- Trang khách tải thêm ảnh/JS chỉ để áp khung (phải là CSS thuần, 0 byte ảnh thêm).
- Xem trước trong admin khác với trang khách thật.

## 4. Cách làm (quyết định của tôi — duyệt lại nếu không đồng ý)

### 4.1 Không phá ảnh: lưu "khung" vào bản kê

Mỗi mục trong `site_config.media_manifest` có thêm trường `fit` (tuỳ chọn):

```js
fit: {
  v: 1712345678,              // = entry.v lúc lưu khung. Khác v hiện tại → bỏ qua (ảnh đã thay)
  d: { x: 50, y: 32, z: 1.0 },  // máy tính:   tiêu điểm x/y theo % ảnh, z = phóng (1–3)
  m: { x: 56, y: 42, z: 1.45 }, // điện thoại: tuỳ chọn; thiếu → dùng d
}
```

- **Tiêu điểm + phóng** chứ không phải hình chữ nhật cắt: một tiêu điểm áp được cho mọi
  tỉ lệ khung (`object-position: x% y%` + `transform: scale(z)` với `transform-origin`
  tại cùng điểm), nên khung tự co giãn theo màn hình mà điểm quan trọng không trôi.
- Hai hồ sơ **máy tính** / **điện thoại**, khớp đúng ranh giới `PHONE_QUERY`. Mặc định
  điện thoại "dùng chung với máy tính"; admin tách riêng khi cần (đúng ca cô dâu hiện nay).
- `fit.v` giống cơ chế `opt.v`: thay ảnh là khung cũ tự vô hiệu → ảnh mới về giữa,
  không bao giờ áp khung cũ lên ảnh mới.
- `normalizeEntry()` **phải** giữ `fit` (giống `opt`), và `buildFromListing()` phải
  mang `fit` của mục cũ sang — nếu không "Quét lại kho" xoá sạch khung.

### 4.2 Trang khách áp khung bằng CSS biến

- `storage.js › sourcesFor()` trả thêm `fit` (đã kiểm `fit.v === entry.v`).
- `MediaImage` và hai thẻ ảnh trong `Hero.jsx` gắn `style` CSS biến:
  `--fx --fy --fz` (máy tính) và `--mfx --mfy --mfz` (điện thoại), cùng class `has-fit`.
- `sections.css`: một quy tắc chung `img.has-fit { object-position: …; transform: scale(…);
  transform-origin: …; }` ở ngoài, và bản dùng biến điện thoại **bên trong khối
  `@media` PHONE_QUERY** (chép đúng từng ký tự chuỗi query; CLAUDE.md đếm 29 lần, thành 30).
- Gỡ bốn quy tắc chỉnh cứng ở §1 và **chuyển giá trị của chúng vào bản kê** bằng một lần
  ghi dữ liệu (migration dữ liệu, không phải migration SQL), để trang khách không đổi
  một pixel nào lúc phát hành.
  - Lưu ý ảnh nền thiệp: `scale(1.1)` chỉ áp ở điện thoại, nên chuyển thành `m.z = 1.1`.
- Không thêm JS/ảnh nào cho khách: chỉ là vài thuộc tính style trên `<img>`.

### 4.3 Trình chỉnh khung trong admin (`ImageFramer`)

Một component dùng chung cho cả ba đường tải ảnh (`SlotUploader`, `MultiFileManager`,
`TimelineSettings`), và cho nút **"Chỉnh khung"** trên ảnh đã có.

- **Ảnh mới:** chọn file → trình chỉnh mở ngay với blob cục bộ (chưa tải gì) → "Lưu" →
  nén, tải lên, sinh bản nén, ghi bản kê kèm `fit` (một `nowVersion()` cho `v`, `opt.v`,
  `fit.v`). "Huỷ" → không tải gì.
- **Ảnh đã có:** mở với bản nén lớn nhất → "Lưu" chỉ ghi bản kê (tức thì, không tải file).
- **Album nhiều ảnh:** tải hàng loạt như cũ (khung mặc định = giữa), sau đó từng ảnh có
  "Chỉnh khung". Không bắt admin chỉnh 30 ảnh trước khi tải.
- **Xoay 90°** (quyết định của tôi, có thể bỏ): chỉ áp cho ảnh mới trước khi tải lên —
  xoay bằng canvas trước bước `compressImage`. Ảnh đã có muốn xoay thì "Thay ảnh".
- **Xem trước** vẽ lại **đúng** các khung của ô theo bảng trong
  `handoff-media-editor/DATA-CONTRACT.md` (tỉ lệ + hình dạng + CSS giống trang khách),
  dùng chính quy tắc CSS `has-fit` để không thể lệch với trang khách.
- Thao tác: kéo (pointer events, chạy cả chuột lẫn cảm ứng), chụm 2 ngón, lăn chuột,
  thanh trượt phóng, phím mũi tên (bàn phím), nút "Về giữa".
- Không thêm thư viện crop: phạm vi chỉ là tiêu điểm + phóng, tự viết ~200 dòng gọn hơn
  và không phải chiều theo mô hình "hình chữ nhật cắt" của thư viện.

### 4.4 Khoá chống ghi chồng

Mọi lần ghi `fit` đi qua `applyToManifest()` như các đường ghi khác (đọc bản kê trong
hàng đợi rồi mới ghi). Chỉnh khung một ảnh đang bị tải lại bởi tab khác → lượt sau thắng,
giống hành vi caption hiện nay. Chỉ một admin, chấp nhận được.

## 5. Ràng buộc

- Chỉ sửa trong `app/src/`. Không đụng `project/`, `handoff/`, `handoff-mobile/`.
- `admin.css` phải **giữ byte-identical** với file thiết kế → style của trình chỉnh khung
  đi vào file riêng (`admin/sections/ImageFramer.css`), giống `RSVPList.css`.
- `PHONE_QUERY` khớp từng ký tự giữa `useViewport.js` và `sections.css`.
- Safari không xuất được WebP từ canvas — xoay ảnh dùng cùng đường fallback JPEG.
- Ảnh iPhone `.heic`: Chrome/Firefox không giải mã được → trình chỉnh phải báo rõ
  ("Trình duyệt này không mở được ảnh HEIC — xuất sang JPEG rồi chọn lại") thay vì trắng.
- Không có unit test (quyết định của chủ nhà) — kiểm bằng tay ở 4 cỡ màn.

## 6. Kế hoạch triển khai

Giai đoạn 0 — **Thiết kế UI** (Claude Design, dùng `handoff-media-editor/`). Các giai
đoạn 1–2 làm song song được vì không phụ thuộc giao diện.

1. **Dữ liệu** — `mediaManifest.js`: `normalizeFit()`, giữ `fit` trong `normalizeEntry`
   và `buildFromListing`; `fitFor(entry)` trả fit hợp lệ hoặc null.
2. **Trang khách** — `storage.js` trả `fit`; `MediaImage` + `Hero.jsx` gắn CSS biến;
   quy tắc `has-fit` trong `sections.css` (ngoài + trong PHONE_QUERY).
   Kiểm: không có `fit` → trang y hệt bây giờ.
3. **Chuyển bốn chỗ cứng thành dữ liệu** — script một lần ghi `fit` cho
   `portraits/bride.jpg`, `portraits/groom.jpg`, `background/left.jpg`, `background/right.jpg`,
   `background/moment-2.jpg` (qua Management API như các migration trước), rồi gỡ quy
   tắc CSS. Kiểm: chụp màn hình trước/sau ở 4 cỡ, không lệch.
4. **`ImageFramer`** theo thiết kế trả về: khung chỉnh + xem trước + điều khiển.
5. **Nối vào ba đường tải** + nút "Chỉnh khung" cho ảnh có sẵn; xoay 90° trước khi nén.
6. **Kiểm tay**: iPhone Safari (dọc/ngang), Android Chrome, iPad dọc, desktop Chrome/
   Safari/Firefox. Thử: ảnh dọc vào khung ngang, ảnh ngang vào vòm, phóng tối đa, thay
   ảnh (khung phải tự về giữa), "Quét lại kho" (khung phải còn), HEIC, mạng chậm.
7. Cập nhật `CLAUDE.md` (mục Images & Performance + Admin) và đếm lại số lần PHONE_QUERY.

## 7. Để lại cho người làm

- Biên độ phóng tối đa (đề xuất 3×) và bước phím mũi tên.
- Có giới hạn kéo để không lộ khoảng trống không — với `object-fit: cover` +
  `object-position` trong 0–100% và `z ≥ 1` thì không bao giờ lộ, nên chỉ cần kẹp giá trị.
- Tên class, cấu trúc file con của `ImageFramer`.

## 8. Đã làm — khác gì so với bản nháp

- **Không dùng thư viện crop.** Có bàn tới `react-easy-crop` cho phần kéo/chụm, nhưng
  bản thiết kế của Claude Design đã viết sẵn phần cử chỉ (pointer capture,
  `touch-action: none`, wheel `passive:false`) và vùng kéo dựng quanh nó (khung vòm/giọt
  nước, ảnh mờ phần bị cắt, dấu ⊙, thẻ đếm ngược). Chủ nhà chọn port nguyên code thiết kế.
- **CSS biến:** trang khách gắn `--fdx/--fdy/--fdz` (máy tính) và `--fmx/--fmy/--fmz`
  (điện thoại); `img.has-fit` trong `globals.css` chọn bộ máy tính, khối PHONE_QUERY
  chọn bộ điện thoại. Không thêm khối `@media` mới, số lần PHONE_QUERY không đổi.
  Trình chỉnh trong admin đặt thẳng `--fx/--fy/--fz` inline nên dùng chung quy tắc này.
- **Ảnh đếm ngược trên điện thoại hiện trọn ảnh cả khi xoay ngang** (khối màn ngang
  cuối `sections.css` đè lên tỉ lệ 560:428). Nên ô này không có khung điện thoại: trình
  chỉnh ẩn nút Máy tính/Điện thoại và luôn lưu `m: null`; trang khách tắt khung ở đó.
- **Migration dữ liệu** `20261111000100_media_fit_from_css.sql` đã chạy trên production
  trước khi phát hành. So ảnh chụp production cũ với bản mới ở 1440×900, 390×844,
  844×390: chân dung, hai ảnh nền thiệp, ảnh đếm ngược giống nhau. Hai sai khác nhỏ có
  chủ đích: cô dâu trên điện thoại giờ có `object-position` 56%/42% (trước là 50%/50%,
  chỉ `transform-origin` là 56%/42%), chú rể 50%/40% áp cho cả điện thoại dọc (trước chỉ
  màn ngang) — lệch dưới 2% bề rộng khung.
- **Album:** chọn một ảnh → mở trình chỉnh trước khi tải; chọn nhiều → tải cả mẻ như
  cũ (giữa ảnh), chỉnh từng tấm sau. Giữ ô tải lên cũ thay cho ô "Thêm ảnh vào album"
  của thiết kế, để không mất kéo-thả sắp xếp và tải nhiều file.
- **Xoay:** `lib/rotateImage.js` xoay bằng canvas trước khi nén, thu luôn về cạnh dài
  1600px (canvas iPhone giới hạn ~16,7 MP).
