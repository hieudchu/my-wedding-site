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

### 4.5 Chiến lược ảnh

Số đo thật, xuất từ canvas trong trình duyệt, lấy `bride.jpg` gốc (4000×6000, 13 MB):

| Cỡ | JPEG q82 | WebP q82 | WebP q75 |
|---|---|---|---|
| 1600px | 315 KB | 263 KB | 192 KB |
| 600px | 62 KB | 59 KB | 46 KB |

WebP nhỏ hơn JPEG 17–39% ở cùng chất lượng. Có hai đường đạt được điều đó, và
**phải kiểm chứng đường ưu tiên trước khi viết code**.

#### Đường ưu tiên — để Cloudflare tự chuyển đổi

Cloudflare Images cho **5.000 lượt chuyển đổi mỗi tháng miễn phí**, dùng được cho
ảnh nằm ngoài Images như trong R2, và không đòi gói Cloudflare trả phí. Nhu cầu ở
đây chỉ khoảng 30–90 lượt/tháng (mỗi ảnh vài biến thể, kết quả được cache).

Nếu dùng được thì kiến trúc gọn hẳn:

- Kho R2 chỉ chứa **một file mỗi ảnh**
- Trang yêu cầu kích thước tuỳ ý qua tham số: `width=600`, `quality=80`
- `format=auto` tự trả AVIF hoặc WebP hoặc JPEG **tuỳ trình duyệt của khách** —
  máy cũ của khách lớn tuổi tự nhận JPEG, không cần thẻ `<picture>`
- Muốn thêm cỡ khác về sau chỉ là đổi tham số URL, không phải upload lại

**Điều kiện chưa rõ:** tài liệu Cloudflare không nói binding Images có chạy trên
`*.workers.dev` mà không cần tên miền riêng (zone) hay không. Đây là việc kiểm tra
đầu tiên sau khi chủ nhà tạo tài khoản, trước khi viết bất kỳ dòng nào.

#### Đường lùi — tự sinh biến thể lúc upload

Nếu chuyển đổi đòi tên miền riêng mà chủ nhà không muốn mua (khoảng $10/năm), thì
bộ nén phía trình duyệt (`lib/compressImage.js`, đã có) sinh ba file mỗi lần upload:

| File | Dùng cho |
|---|---|
| `ten.jpg` — 1600px q82 | dự phòng cho trình duyệt không hiểu WebP |
| `ten.webp` — 1600px q82 | máy tính, màn Retina |
| `ten@600.webp` — 600px q78 | điện thoại |

Trang dùng thẻ `<picture>`: trình duyệt mới lấy WebP, máy cũ tự lùi về JPEG.
Safari chỉ hỗ trợ WebP từ iOS 14, mà khách lớn tuổi thường dùng máy đời cũ — thiếu
lớp lùi này thì họ **không thấy ảnh nào cả**.

`/api/media` lọc bỏ biến thể `.webp` và `@600` khỏi danh sách để carousel không
hiện ảnh trùng.

#### Ảnh nền mờ ở Hero

Ảnh nền của Hero bị làm mờ 38px tới mức không nhận ra nội dung, nhưng hiện đang
tải bản đầy đủ. Cho nó **luôn dùng bản 600px** bất kể thiết bị — tiết kiệm một
lượt tải nặng trên mọi màn hình, mắt thường không phân biệt được.

#### Kết quả kỳ vọng

Một lượt khách trên điện thoại: 2 ảnh carousel + 2 chân dung + 3 ảnh nền
≈ 7 × 46 KB ≈ **320 KB ảnh**, cộng code và font là khoảng **1.4 MB**.

So với 92 MB đo được lúc đầu: nhẹ hơn **65 lần**. Bộ nhớ giải nén mỗi ảnh còn
khoảng 1 MB thay vì 92 MB — đây mới là thứ chấm dứt hẳn chuyện giật khi cuộn.

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

**Chuyển đổi ảnh của Cloudflare có chạy trên `*.workers.dev` không, hay bắt buộc
tên miền riêng?** Quyết định giữa hai đường ở mục 4.5. Kiểm tra đầu tiên sau khi có
tài khoản. Nếu bắt buộc tên miền, chủ nhà cân nhắc mua tên miền ~$10/năm để đổi lấy
kiến trúc gọn hơn nhiều, hoặc chọn đường lùi.

**R2 có bắt thêm phương thức thanh toán khi đăng ký không?** Trang giá chính thức
không nói rõ. Chủ nhà yêu cầu miễn phí hoàn toàn, nên cần xác nhận khi tạo tài
khoản. Nếu có bắt nhập thẻ mà chủ nhà không muốn, phương án lùi là giữ Supabase
free kèm `srcset` (hướng C đã cân nhắc ở mục 2) và chấp nhận trần 5 GB.

## 10. Việc cần chủ nhà làm

1. Tạo tài khoản Cloudflare, một bucket R2, một API token — sẽ có hướng dẫn từng bước.
2. Xác nhận câu hỏi ở mục 9.
3. Sau khi xong phần kỹ thuật: tải ảnh và nhạc thật lên qua `/admin`. Văn bản đã
   đúng nên không phải nhập lại.
