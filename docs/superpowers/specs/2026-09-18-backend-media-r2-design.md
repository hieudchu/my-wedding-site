# Chuyển media sang Cloudflare R2 — thiết kế

Ngày: 2026-09-18
Trạng thái: chờ chủ nhà duyệt

## 1. Vì sao phải đổi

Trang đang để toàn bộ ảnh và nhạc trong Supabase Storage. Đo thực tế bằng
Chrome headless, một lượt khách trên điện thoại tải về **92 MB**, trong đó 90.9 MB
là media. Sau các tối ưu đã làm (nén lúc upload, chỉ nạp thẻ trong tầm nhìn, bỏ
mã chống-cache đổi theo mỗi lần tải trang) con số còn khoảng 3.3 MB — nhưng vẫn
đặt lên hạn mức 5 GB/tháng của gói free.

Ba ràng buộc chủ nhà đã chốt:

| Ràng buộc | Hệ quả |
|---|---|
| 1.000 – 3.000 lượt truy cập | ~3–10 GB băng thông, **vượt trần 5 GB của Supabase free** |
| Miễn phí hoàn toàn | Loại bỏ Supabase Pro ($25/tháng) |
| Giữ làm kỷ niệm nhiều năm | Supabase free **tự ngủ sau 7 ngày** không ai truy cập — đã xảy ra thật với chính project này |
| Ảnh **và nhạc** phải sửa/thêm/xoá qua admin | Loại bỏ mọi phương án nhúng media vào repo |

Rủi ro nặng nhất không phải tiền mà là thời điểm: lưu lượng dồn vào đúng ngày
cưới. Chạm trần băng thông hôm đó nghĩa là trang hỏng đúng lúc mọi người mở.

## 2. Quyết định

Chuyển **chỉ phần media** sang Cloudflare R2, nơi băng thông ra miễn phí không
giới hạn. Giữ Supabase cho dữ liệu, đăng nhập và RSVP — những thứ chỉ tốn vài KB
mỗi lượt nên không đời nào chạm trần. Sau cưới thì đóng băng trang thành file
tĩnh để không còn phụ thuộc dịch vụ nào.

Đã cân nhắc và loại:

- **Chuyển hết sang Cloudflare (R2 + D1 + Workers)**: phải viết lại tầng dữ liệu,
  phần đăng nhập và dựng Workers — nhiều rủi ro hồi quy nhất khi chỉ còn 4 tháng.
- **Giữ nguyên Supabase free, chỉ nén mạnh hơn**: 3.000 lượt ≈ 4.5 GB, sát trần
  5 GB, và vẫn không giải quyết chuyện ngủ. Đặt cược vào đúng ngày quan trọng nhất.

Số liệu miễn phí đã kiểm chứng từ tài liệu chính thức: R2 cho 10 GB lưu trữ,
1 triệu thao tác ghi, 10 triệu thao tác đọc mỗi tháng, **băng thông ra miễn phí**.
Supabase free cho 5 GB băng thông và 1 GB lưu trữ.

## 3. Kiến trúc

```
Khách  ─────────────► Vercel (HTML, JS, CSS, font)
        │
        ├───────────► Worker trên *.workers.dev ──► R2 (ảnh, nhạc)
        │
        ├───────────► /api/media  (Vercel Function, cache biên)
        │                └─ liệt kê file trong R2
        │
        └───────────► Supabase  (site_config, family_members,
                                 timeline_events, rsvps)

Admin  ─────────────► /api/upload, /api/media/delete  (Vercel Function)
                        └─ kiểm tra JWT Supabase rồi ghi vào R2
```

Điểm mấu chốt: **khoá R2 không bao giờ rời khỏi máy chủ**. Trình duyệt chỉ đọc
file qua Worker công khai và gọi hàm Vercel để ghi.

## 4. Các phần

### 4.1 Tầng lưu trữ — giữ nguyên giao diện

`app/src/lib/storage.js` hiện xuất ba hàm mà toàn bộ trang dùng:

```js
getMediaUrlAsync(path)   // → URL hoặc null
getMediaUrl(path)        // bản đồng bộ, chỉ dùng khi đã liệt kê trước
listMedia(folder)        // → [{ name, url }]
```

**Giữ nguyên ba chữ ký này.** Chỉ thay phần bên trong: thay vì gọi
`supabase.storage`, gọi `/api/media` một lần rồi dựng URL trỏ tới Worker. Nhờ vậy
9 component dùng chúng không phải sửa dòng nào.

URL vẫn mang `?v=<mốc sửa đổi>` như hiện tại, để CDN cache được mà upload ảnh mới
vẫn thấy ngay.

### 4.2 Worker phục vụ file

Cloudflare ghi rõ tên miền `*.r2.dev` **bị giới hạn tốc độ và không dành cho
production**. Chủ nhà không có tên miền riêng, nên đặt một Worker nhỏ trên
`*.workers.dev` đọc R2 và trả file kèm `Cache-Control: public, max-age=31536000,
immutable` (an toàn vì URL đã có `?v=`).

Hạn mức free 100.000 lượt/ngày. Ước tính 3.000 khách × ~8 file = 24.000 lượt, trải
ra nhiều tháng — không tới một ngày hạn mức.

### 4.3 Hàm liệt kê `/api/media`

Trình duyệt không tự liệt kê được R2 vì cần khoá bí mật. Hàm này làm việc đó và
trả JSON:

```json
{ "carousel": [{ "name": "01.jpg", "v": 1776787609 }], "music": [...] }
```

Trả kèm `Cache-Control: s-maxage=60, stale-while-revalidate=600` để phần lớn khách
ăn cache ở biên, không chạm tới hàm. Lọc bỏ biến thể `@600` khỏi danh sách để
carousel không hiện ảnh trùng.

Sáu thư mục cần liệt kê, đúng như cấu trúc hiện tại: `carousel`, `portraits`,
`background`, `icons`, `music`, `timeline`.

### 4.4 Upload và xoá

`/api/upload` và `/api/media/delete` xác thực bằng **chính Supabase Auth đang
dùng**: admin gửi kèm JWT, hàm xác minh chữ ký rồi mới ghi/xoá trên R2 bằng khoá
trong biến môi trường. Không dựng hệ đăng nhập mới.

Trong admin, `MediaManager` và `TimelineSettings` đổi từ `supabase.storage.upload`
sang gọi hai hàm này. Giao diện và thao tác giữ nguyên.

### 4.5 Hai cỡ ảnh và `srcset`

Bộ nén phía trình duyệt (`lib/compressImage.js`, đã có) sinh **hai file** mỗi lần
upload:

| File | Cạnh dài | Dung lượng ước tính | Dùng cho |
|---|---|---|---|
| `ten.jpg` | 1600px | ~350 KB | máy tính, màn Retina |
| `ten@600.jpg` | 600px | ~80 KB | điện thoại |

`MediaImage` và `Hero` render `srcset` kèm `sizes` phù hợp. Điện thoại nhờ đó tải
~80 KB thay vì 350 KB mỗi ảnh.

### 4.6 Cron chống ngủ

Thêm vào `vercel.json` một cron chạy mỗi ngày gọi `/api/keepalive`; hàm truy vấn
một dòng của `site_config`. Ngưỡng ngủ là 7 ngày nên một lần/ngày là dư. Vercel
Hobby cho phép đúng nhịp này.

### 4.7 Đóng băng sau cưới

`scripts/freeze.mjs`, chạy tay khoảng một tháng sau ngày cưới:

1. Xuất `site_config`, `family_members`, `timeline_events` từ Supabase thành
   `app/src/data/frozen.json`
2. Tải toàn bộ media từ R2 về `app/public/media/`
3. Bật `VITE_FROZEN=1`: các hook đọc JSON và file cục bộ thay vì gọi mạng
4. Form RSVP chuyển sang trạng thái đã đóng, kèm lời cảm ơn
5. Commit và deploy

Sau bước này trang **không còn phụ thuộc Supabase lẫn R2** — không gì có thể ngủ,
hỏng hạn mức hay bị xoá. Đây là thứ bảo đảm yêu cầu giữ nhiều năm.

## 5. Những gì cố tình KHÔNG làm

- **Không viết script di trú media hiện có.** Chủ nhà sẽ tải ảnh và nhạc thật lên
  lại từ đầu, nên 12 ảnh thử hiện có không cần chuyển sang R2. Mọi ảnh mới đều đi
  qua bộ nén nên kho R2 sạch ngay từ đầu. Phần **văn bản trong Supabase giữ
  nguyên** — tên, ngày, địa điểm, lịch trình đã là nội dung thật.
- **Không dựng hệ đăng nhập mới.** Supabase Auth đang chạy tốt và miễn phí.
- **Không chuyển dữ liệu sang D1/Turso.** Text và RSVP tốn vài KB, Supabase free
  thừa sức, và giữ nguyên thì admin không phải viết lại.
- **Không mua tên miền riêng.** Worker trên `*.workers.dev` là đủ và miễn phí.

## 6. Biến môi trường cần thêm trên Vercel

```
R2_ACCOUNT_ID          mã tài khoản Cloudflare
R2_ACCESS_KEY_ID       khoá API của R2
R2_SECRET_ACCESS_KEY   khoá bí mật
R2_BUCKET              tên bucket
VITE_MEDIA_BASE_URL    địa chỉ Worker, ví dụ https://wedding-media.<tên>.workers.dev
SUPABASE_JWT_SECRET    để hàm upload xác minh đăng nhập
```

## 7. Kiểm thử

- **e2e bằng Playwright**: ảnh tải được từ Worker; upload trong admin xong thì ảnh
  hiện ra ở trang khách; xoá thì biến mất; `srcset` trả đúng bản 600px ở khung
  nhìn 390px.
- **Đo lại băng thông** bằng CDP như đã làm: mục tiêu dưới 2 MB một lượt trên
  điện thoại.
- **Đo hiệu năng** khi cuộn và vuốt carousel, so với số hiện tại.
- **So ảnh từng pixel** với bản thiết kế để chắc không có hồi quy giao diện.

## 8. Rủi ro và đường lui

`lib/storage.js` giữ **cả hai đường đọc** sau cùng một giao diện: có
`VITE_MEDIA_BASE_URL` thì đọc từ R2, để rỗng thì quay về Supabase Storage như hiện
nay. Đổi một biến môi trường trên Vercel là lùi được, không cần deploy code khác.

Supabase Storage **giữ nguyên, không xoá gì** cho tới khi R2 chạy ổn định qua ngày
cưới. Dọn sau, khi đã chắc chắn.

Rủi ro còn lại: Worker hoặc R2 đổi chính sách free tier trong nhiều năm tới. Bước
đóng băng ở 4.7 chính là cách xử lý — sau cưới thì không còn phụ thuộc nữa.

## 9. Câu hỏi còn mở

**R2 có bắt thêm phương thức thanh toán khi đăng ký không?** Trang giá chính thức
không nói rõ. Chủ nhà yêu cầu miễn phí hoàn toàn, nên cần xác nhận khi tạo tài
khoản. Nếu có bắt nhập thẻ mà chủ nhà không muốn, phương án lùi là giữ Supabase
free kèm `srcset` (hướng C đã cân nhắc ở mục 2) và chấp nhận trần 5 GB.

## 10. Việc cần chủ nhà làm

1. Tạo tài khoản Cloudflare, một bucket R2, một API token — sẽ có hướng dẫn từng bước.
2. Xác nhận câu hỏi ở mục 9.
3. Sau khi xong phần kỹ thuật: tải ảnh và nhạc thật lên qua `/admin`. Văn bản đã
   đúng nên không phải nhập lại.
