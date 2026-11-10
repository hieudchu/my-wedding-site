# Handoff mobile cho Claude Design — thiết kế

Ngày: 2026-10-31
Trạng thái: đã được duyệt, chờ dựng

## Mục tiêu

Đưa cho Claude Design làm lại **giao diện điện thoại** của trang cưới — cả dọc và
ngang — vì bản hiện tại nhiều lỗi về animation và responsive. Desktop đang ổn và
**không được đổi diện mạo**.

Đầu ra là một thư mục `handoff-mobile/` tự chạy độc lập, port trung thực mã hôm nay
**kể cả lỗi**, kèm hồ sơ 19 lỗi đã truy ra nguyên nhân.

## Vì sao phải đóng gói lại, không dùng `handoff/` cũ

`handoff/` là bản chụp 2026-09-18 và đã lạc hậu hẳn so với `app/src/`:

| | `handoff/` (18.09) | `app/src/` (31.10) |
|---|---|---|
| Hiện-khi-cuộn | `IntersectionObserver` + class `.in` | CSS `animation-timeline: view()` |
| Hero | slider `translateX` | carousel 3D coverflow, khổ thẻ tính bằng JS |
| Nav | nút nhạc bật/tắt | trình phát đủ bộ: playlist, tua, âm lượng, lặp |
| Điểm ngắt | 900/768/720/640/520/480/440/340/220 | 760 + 480 + một khối landscape |
| CSS | 1.754 dòng | 2.313 dòng |

Sửa thiết kế trên bundle cũ là sửa nhầm bản. `handoff/` giữ nguyên làm lịch sử,
chỉ thêm một dòng ở đầu `handoff/README.md` trỏ sang bundle mới.

## Phạm vi

**Trong phạm vi:** bố cục, hiệu ứng và tương tác của bảy section trên điện thoại,
cả hướng dọc và hướng ngang. Nav và Lightbox kèm theo.

**Ngoài phạm vi:** diện mạo desktop (≥760px); trang admin (`app/src/admin/`);
sửa lỗi trong `app/src` lần này (việc đó làm sau khi thiết kế về).

## Ba mức ràng buộc desktop

Nói suông "giữ nguyên desktop" thì Claude Design sẽ không dám sửa gì, vì nhiều lỗi
nằm ở mã dùng chung. Nên đề bài chia rõ ba mức:

**Mức 1 — tự do.** Mọi thứ trong media query mobile và trong nhánh mã chỉ chạy trên
thiết bị cảm ứng.

**Mức 2 — được sửa mã dùng chung, vì trung tính với desktop.** Danh sách đóng,
kèm lý do từng mục:

| Sửa gì | Vì sao desktop không đổi |
|---|---|
| `height: 100vh` → `100svh` (`sections.css:296`) | Desktop không có thanh địa chỉ co giãn nên `100vh == 100svh` |
| `max-height: 86vh` → `86svh` (`globals.css:705,722`) | Như trên |
| Bỏ trùng pointer/touch ở Hero | Nhánh touch chỉ bắn trên thiết bị cảm ứng |
| Nới vùng chạm chấm tròn carousel | Desktop giữ nguyên bề ngang hiển thị, chỉ nới vùng bấm trong suốt |
| Đổi `PHONE_MAX` thành điều kiện xét cả chiều cao | Máy tính để bàn không chạm ngưỡng chiều cao |

Muốn sửa gì ngoài danh sách này thì phải kèm ảnh chụp desktop trước/sau để chứng
minh không đổi.

**Mức 3 — cấm.** Diện mạo ở ≥760px.

## Được tự do tới đâu về thiết kế

Giữ **nhận diện**: bảng màu đỏ sơn mài–vàng kim–ngà, bộ chữ (Cormorant Garamond ·
Inter · JetBrains Mono · TAN Whistling), và bảy section theo đúng thứ tự.

Được **thay hẳn bố cục và hiệu ứng từng section trên điện thoại**. Cụ thể là được
phép bỏ những thứ vốn chỉ đẹp trên màn rộng: coverflow 3D, nét bút lụa, parallax hai
mảng ảnh. Khách điện thoại và khách desktop vẫn phải thấy cùng một tấm thiệp, chỉ
khác cách trình bày.

## Phát hiện nền tảng: điểm ngắt chỉ xét bề ngang

Đây là gốc của phần lớn lỗi hướng ngang. Một chiếc iPhone quay ngang là 844×390,
mà `844 > 760`, nên nó nhận bố cục **tablet/desktop** trên một màn cao 390px:

| | Dọc 390×844 | Ngang 844×390 |
|---|---|---|
| `@media (max-width: 759.98px)` | áp dụng | **không áp dụng** |
| Nav | hamburger | 4 liên kết trải ngang, cao ~66px = 17% màn |
| Lịch trình | xếp dọc, nét bút 48px | hai cột, nét bút full-width |
| Thẻ RSVP | full-width | hai thẻ cạnh nhau |
| `phone` trong `Hero.jsx` | `true` | **`false`** → bật nghiêng 3D, `translateZ(-170px)`, `reach=2` nạp thêm ảnh |
| Khổ thẻ carousel | 280×375 | **179×240**, bị `stageH=240` bóp lại |

Toàn bộ phần xử lý hướng ngang hiện chỉ là **một** khối
`@media (max-height: 520px) and (orientation: landscape)` chỉnh vài chi tiết ở cổng.

Đề bài sẽ yêu cầu điểm ngắt mới phải xét **cả chiều cao**, không chỉ bề ngang.

## Hồ sơ lỗi — 19 mục

Tách thành `BUG-DOSSIER.md` riêng, vì đề bài nói *muốn gì* còn hồ sơ nói *đang sai
gì*. Mỗi mục bốn dòng: khách thấy gì → nguyên nhân trong mã → `file:dòng` → nghiệm
thu thế nào là xong.

**Cả hai hướng (10):**

1. **Race** — vuốt một lần *có lúc* nhảy hai ảnh. `Hero.jsx` gắn cả pointer events lên
   `.hero-stage` lẫn touch events lên cả `<section>`; trên cảm ứng cả hai đều bắn
   `go()`. Đã đo trong prototype: hai sự kiện cùng một batch thì nhảy 1 ảnh, có lượt
   dựng lại chen vào giữa thì nhảy 2. Lý do: cả hai gọi `go(slide + 1)` với `slide`
   từ closure cùng lượt dựng, mà `go()` đặt chỉ số *tuyệt đối* (bỏ qua `prev`), nên
   cùng batch là vô hại. Nổ khi luồng chính bận — đúng cảnh điện thoại yếu đang giải
   nén ảnh 24MP. Chrome trên máy tính gần như không dính, nên lỗi vô hình khi thử
   bằng máy tính.
   *Cảnh báo:* `go()` đang che lỗi. Cho `go()` cộng dồn từ `prev` mà chưa gỡ cặp
   handler trùng sẽ biến lỗi chập chờn thành nhảy 2 ảnh mọi lần.
2. `.hero { height: 100vh }` (`sections.css:296`) — iOS Safari tính `100vh` theo
   chiều cao *khi đã ẩn* thanh địa chỉ, nên lúc mới mở hàng chấm tròn bị che.
3. Thẻ carousel co giãn giữa lúc cuộn. `useViewport` nghe `resize`; iOS bắn `resize`
   mỗi lần thanh địa chỉ thu/giãn → `stageH` đổi → 8 thẻ cùng chạy
   `transition: width .6s, height .6s` (`sections.css:346`).
4. Chấm chuyển ảnh chỉ 8×8px (`sections.css:528`) — quá nhỏ, mà khách nhiều người lớn tuổi.
5. Animation hiện-khi-cuộn mất hẳn trên iOS cũ. `animation-timeline: view()` chỉ có
   từ Safari 26 (9/2025) và Firefox vẫn chưa bật mặc định; máy cũ hơn rơi về `animation-duration: 0s` → nội dung hiện đủ nhưng
   phẳng lặng, không hiệu ứng nào.
6. Hai cơ chế dự phòng song song không khớp nhau: class `.rv` và thuộc tính
   `data-rv`. `.tl-head`, `.countdown` (`Timeline.jsx:49,114`), `.rv` trong
   `RSVP.jsx:58` và hai khối trong `Family.jsx` chỉ có class mà thiếu `data-rv`, nên
   khối `@supports not` ở `globals.css:186` không chạm tới. Hiện thoát lỗi nhờ may
   (0s duration dừng ở trạng thái cuối), không nhờ thiết kế.
7. Khoá cuộn ở cổng bằng `document.body.style.overflow='hidden'` (`App.jsx:39`) —
   iOS Safari không chặn chắc chắn bằng cách này.
8. `will-change: transform` đặt trên mọi thẻ hero (`sections.css:1501`) — mỗi thẻ một
   lớp vẽ riêng, áp lực bộ nhớ trên máy yếu.
9. Lightbox phóng 1.7× nhưng không kéo được (`globals.css:715`) — phần ảnh tràn ra
   ngoài khung không có cách nào tới được trên điện thoại.
10. `.lb-img { max-height: 86vh }` (`globals.css:722`) — cùng bệnh `100vh`.

**Riêng hướng ngang (5):**

11. Điểm ngắt chỉ xét bề ngang → điện thoại ngang nhận bố cục desktop
    (`sections.css:1417`, `useViewport.js:3`). Xem bảng ở trên.
12. `phone = vw < PHONE_MAX` (`Hero.jsx:40`) hoá `false` khi quay ngang → bật nghiêng
    3D và nâng `reach` từ 1 lên 2 (`Hero.jsx:82`), tức nạp thêm ảnh độ phân giải cao
    đúng lúc bộ nhớ căng nhất.
13. Khổ thẻ carousel bị bóp còn 179×240 vì `stageH` trừ cứng 150px cho nav và hàng
    chấm (`Hero.jsx:100`), trên màn cao 390px thì 150px là quá nhiều.
14. Nav hướng ngang trải 4 liên kết và cao ~66px trên màn cao 390px
    (`globals.css:230`, `sections.css:1423`).
15. `.family-photo-frame` giữ `aspect-ratio: 3/4` (`sections.css:666`) → ở hướng ngang
    ảnh chân dung cao hơn cả màn hình.

**Riêng hướng dọc (4):**

16. `.countdown-card` chờm lên ảnh `-52px`, còn `-32px` dưới 480px
    (`sections.css:1039,1465`); bốn ô đếm `min-width: 62px` (`sections.css:1466`) cộng
    khoảng cách có thể tràn ở bề ngang 320px.
17. ~~`.family-sig` tràn ra mép section ở khổ hẹp.~~ **Đã hạ cấp sau khi đo:** ở
    320×568 chữ ký là 59×64px, mép trái cách viewport 14px — nằm trong khung, không
    tràn. Quét toàn trang ở 320px cũng cho `scrollWidth == 320`, không có tràn ngang
    ngoài ý muốn. Giữ lại thành ghi chú: chỗ này chật và đang dựa vào
    `body { overflow-x: hidden }` làm lưới an toàn (`sections.css:671`).
18. `.tl-silk` bóp còn 48px với `preserveAspectRatio="none"` (`sections.css:1453`,
    `Timeline.jsx:60`). **Đã đo:** khung thật 48×1867px trong khi viewBox là 100×1000
    → nén ngang 0,48×, kéo dọc 1,87×, méo tỉ lệ 3,9 lần. Đường cong thành một vạch
    gần như thẳng đứng. Tỉ lệ nén còn đổi theo số mốc, vì chiều cao khung là
    `calc(100% + …)`.
    *Đính chính:* hướng ngang thì **không** vỡ — đã đo, nét bút rộng 760px chạy đúng
    hành lang giữa hai cột và nằm dưới ô ảnh (`z-index: 0`).
19. Nội dung bị thất lạc: `rsvp_dress_code` và `rsvp_dress_code_en` có trong dữ liệu
    nhưng không component nào hiển thị.

## Cấu trúc bundle

```
handoff-mobile/
├── README.md            Cách mở, bên trong có gì, sửa gì ở đâu
├── DESIGN-BRIEF.md      Đề bài: chỉ mobile, ba mức ràng buộc desktop, chuẩn nghiệm thu
├── BUG-DOSSIER.md       19 lỗi, phân nhóm dọc / ngang / cả hai
├── COMPONENT-MAP.md     Ánh xạ về app/src để port thiết kế mới ngược lại
├── index.html           Shell: React 18 + Babel standalone qua CDN
├── app.jsx              Port trung thực mã hôm nay — GIỮ NGUYÊN LỖI
├── data/content.js      window.__CONTENT__ — nội dung thật
├── styles/globals.css   Copy nguyên từ app/src/styles/
├── styles/sections.css  Copy nguyên từ app/src/styles/
├── assets/              Ảnh đã nén + medallion + bgm.mp3 (~10 MB)
└── screens/             Ảnh chụp lỗi có chú thích, 7 khổ máy
```

## Quyết định kỹ thuật

**Giữ format React CDN + Babel standalone.** Đúng format `handoff/` đã dùng và đã
chạy tốt. JSX đọc được, cấu trúc component giống production nên port ngược sát nhất.
Đánh đổi: cần mạng để tải CDN, và phải mở qua máy chủ cục bộ (Babel tải `app.jsx`
bằng XHR nên `file://` bị chặn).

**Bundle phải tái hiện đúng lỗi, không sửa sẵn.** Đây là điểm khác bundle lần trước.
Claude Design phải *thấy* lỗi chạy trước mắt rồi mới sửa, và phải đối chiếu được
trước/sau. Bundle sạch sẽ tự phá mục đích.

**Nội dung và ảnh tái dùng từ `handoff/`.** Đã kiểm: `data/content.js` vẫn đúng
(ngày 2027-01-15), ảnh đã nén sẵn, tổng ~10 MB. Không cần kéo lại từ Supabase.

**Ba chỗ phải thay khi port production → prototype**, giống lần trước:

| Production | Prototype |
|---|---|
| `useSiteConfig()` gọi Supabase | Đọc thẳng `window.__CONTENT__` |
| `MediaImage` chuỗi fallback Supabase → local → placeholder | Trỏ thẳng `./assets/…` |
| `RSVP` submit insert vào Supabase | Giữ form + validate, hiện success giả, đánh dấu `// PORT:` |

Giữ nguyên logic thật: cổng khoá cuộn, carousel (vuốt/phím/chấm/kéo), countdown,
lightbox, hiện-khi-cuộn, trình phát nhạc.

## Chuẩn nghiệm thu

Khổ máy phải kiểm, **cả hai hướng**:

| Hướng | Khổ | Đại diện |
|---|---|---|
| Dọc | 320×568 | iPhone SE gen 1 — sàn, không được vỡ |
| Dọc | 360×640 | Android phổ thông cũ |
| Dọc | 390×844 | iPhone 13/14/15 — khổ chính |
| Dọc | 430×932 | iPhone Pro Max |
| Ngang | 568×320 | iPhone SE gen 1 quay ngang |
| Ngang | 640×360 | Android phổ thông quay ngang |
| Ngang | 844×390 | iPhone 13/14/15 quay ngang |

Cộng hai trình duyệt: iOS Safari (thanh địa chỉ co giãn) và Chrome Android.

**Giới hạn của devtools — phải ghi rõ trong đề bài.** Device emulation trong Chromium
nghiệm thu được bố cục ở bảy khổ trên, nhưng **không mô phỏng được** thanh địa chỉ
co giãn của iOS Safari. Nghĩa là hai lỗi số 2 (`100vh`) và số 3 (thẻ co giãn khi cuộn)
chỉ thấy được trên máy thật hoặc Simulator. Ảnh trong `screens/` cũng chụp bằng
Chromium nên chịu đúng giới hạn này — chú thích từng ảnh phải nói rõ nó chứng minh
được gì và không chứng minh được gì.

Điều kiện hoàn thành của bundle: mở `index.html` qua máy chủ cục bộ thấy đủ bảy
section với nội dung và ảnh thật; cổng mở được; carousel chạy *và tái hiện đúng lỗi
vuốt nhảy hai ảnh*; countdown đếm; RSVP submit ra màn hình thành công; `screens/` có
ảnh chụp ở cả bảy khổ.

## Việc kèm theo

**Dọn `CLAUDE.md`.** Đang sai nhiều chỗ: ghi ngày cưới 08.11.2026 (đúng là
15.01.2027), ghi luồng section `Gate → Details → Family` và component `Details.jsx`
vốn không còn tồn tại (nay là `Hero.jsx` + `WeddingInfo.jsx`), ghi hiện-khi-cuộn dùng
`IntersectionObserver` qua hook `useReveal()` (đã đổi sang scroll-driven animation,
hook không còn), và thiếu `useViewport`, `Hero`, `ErrorBoundary`, trình phát nhạc.

**Thêm cảnh báo vào `handoff/README.md`.** Một dòng ở đầu: bản chụp 18.09.2026 đã lạc
hậu, bundle đang dùng là `handoff-mobile/`.
