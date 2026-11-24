# Màn mở đầu: phong bì + video cưới

Tổng quan phần intro của trang khách `/` (cập nhật 21/11/2026). Code ở `app/src/components/intro/`, CSS ở cuối
`app/src/styles/globals.css` (`.intro-*`, `.ig-*`), tệp ở `app/public/assets/intro/`.

## Khách thấy gì

| | Điện thoại dọc | Điện thoại ngang · máy tính |
|---|---|---|
| **Lần đầu vào** | Phong bì 2:3 nằm đúng chỗ thẻ đỏ. Chạm → nhạc + tiếng giấy, bốn vạt mở (~1,8 s) thấy khung đầu video trong thẻ → video chạy trong thẻ → cuối video hình tan thành thẻ đỏ tại chỗ → vào trang, chữ thẻ trồi lên. | Phong bì dọc xoay ngang (vạt có dấu sáp mở lên trên, dấu sáp vẫn đứng thẳng), 3:2, nằm giữa thẻ đỏ, nền trong suốt nên hoa văn liền với trang. Chạm → (Android: vào toàn màn hình, phong bì chờ màn đổi cỡ xong) → vạt mở thấy video → phong bì tan, khung nở ra khung video lớn viền vàng hai lớp → cuối video khung thu về đúng thẻ đỏ → vào trang. |
| **Tải lại** (đã xem) | Phong bì mở ra thẻ đỏ trống rồi vào trang. Không chiếu lại video. | Phong bì mở ra thẻ đỏ 3:2, vạt tan, thẻ đỏ giãn ra đúng thẻ trang rồi vào trang. |
| **Giảm chuyển động / tiết kiệm dữ liệu** | Không phong bì, không video: ảnh thẻ đỏ một nhịp rồi vào trang. Tải lại thì vào thẳng. | như bên trái |
| **Link có neo** (`/#rsvp`, mã QR) | Không có intro, tới thẳng mục đó. | như bên trái |
| **Admin tắt** (Admin › Thông tin chung) | Không có intro. Lúc chưa đọc được cài đặt, lớp phủ chỉ là nền đỏ, chưa tải video. | như bên trái |

Màn chờ chạm: trên phong bì có dòng "— TRÂN TRỌNG KÍNH MỜI —" (chữ hoa vàng giãn cách, cùng kiểu "THIỆP CƯỚI" trên thẻ;
điện thoại ngang không đủ chỗ thì bỏ), dấu sáp có vệt ánh kim lướt qua (4,8 s một lần) để gợi ý chạm (nhịp "thở" đã thử, chủ thiệp bỏ) —
là lớp tròn cắt từ chính ảnh chờ (`.ig-seal`), gỡ ngay khi clip mở chạy. Cả màn hình là vùng chạm.

Trong lúc video chạy: chạm / lăn chuột / phím = bỏ qua; nút "Bỏ qua" góc trên phải. Trình duyệt chặn nhạc khi khách
chưa chạm trang, nhưng cú chạm mở phong bì chính là cử chỉ cho phép phát tiếng. Nếu nhạc vẫn bị chặn, lớp phủ hiện
"♪ Chạm để bật nhạc" và lần chạm đó bật nhạc thay vì bỏ qua. Nhạc nền của trang chờ intro xong 3 giây rồi mới vào nhẹ.

## Nhịp thời gian (lần đầu)

| Lúc | Việc |
|---|---|
| 0 s | Chạm phong bì: nhạc mở đầu (to dần 0,16 → 0,55) + tiếng giấy / bóc sáp. Video chính được "làm nóng". |
| 1,77 s | Vạt nằm yên: video chạy từ giây 1,2 dưới phong bì; phong bì mờ đi trong 0,9 s (ease-out, vạt tan dần). |
| ~2,4 s | Khổ ngang / máy tính: khung nở ra khung video lớn (1 s). |
| video 10,15 s | Video dừng, hình tan thành thẻ đỏ (khổ dọc: tại chỗ trong 0,55 s; khổ ngang: khung trượt về thẻ trong 1,3 s). Không giữ thẻ trống (review 25/11: trước đây ~3 s thẻ trống, khách tưởng trang đơ). |
| sau đó | Lớp phủ rời đi ngay bằng View Transition 0,5 s (nav hiện trong chuyển cảnh); xong thì chữ thẻ trồi lên từng dòng, nhanh hơn lần mở trang thường (`html[data-hero-quick]`: trễ 0–0,46 s, mỗi dòng 1,1 s); nhạc lắng xuống. |

## Tệp

**Code** (`app/src/components/intro/`)

| Tệp | Việc |
|---|---|
| `IntroVideo.jsx` | Lớp phủ: các bước (chờ cài đặt → phong bì → video → kết), khung video, nhạc, bỏ qua, rời trang. |
| `IntroGate.jsx` | Phong bì: ảnh chờ, clip mở, nút "Chạm để mở thiệp", chờ toàn màn hình trên Android. |
| `plan.js` | Quyết định một lần lúc tải trang: có chiếu không, khổ nào, file nào. |
| `geometry.js` | Khung video (`frameBox`), thẻ thật (`cardRect`), phong bì 3:2 (`fit32`). |
| `music.js` | Nhạc mở đầu (Web Audio, âm lượng trên iOS) + tiếng phong bì. |
| `IntroDebug.jsx` | `?introdebug=1`: bảng trạng thái để thử trên điện thoại thật. |

Liên quan: `hooks/useLandscapeFullscreen.js` (toàn màn hình khi xoay ngang), `admin/sections/IntroSwitch.jsx` +
`IntroMusic.jsx` (bật/tắt, đổi nhạc).

**Tệp trên trang** (`app/public/assets/intro/`)

| Thư mục | Tệp |
|---|---|
| `envelope/` | Dọc: `open-card.mp4`, `open-video.mp4`, `idle-card.jpg`, `idle-video.jpg`. Ngang (nền trong suốt): `open-*-w.webm` (Chrome, Android, Firefox), `open-*-wa.mp4` (Safari, iPhone), `idle-*-w.webp`. `sfx.mp3`. |
| `portrait/`, `desktop/` | `full.mp4` (12,9 s, 1080p), `full-720.mp4` (mạng chậm), `loop.mp4` (chờ trang), `poster-join.jpg` (khung đầu sau phong bì), `poster-card.jpg` (ảnh thẻ khi giảm chuyển động). Khổ ngang dùng thư mục `desktop/`. |
| `landscape/` | Chỉ `poster-card.jpg` (giảm chuyển động ở khổ ngang). |
| `intro-music.m4a` | Nhạc mở đầu mặc định ("Một đời" không lời, cắt từ giây 6). |

Thay tệp nào thì đổi số phiên bản tương ứng: `VER` / `VER_JOIN` trong `plan.js`, `GV` trong `IntroGate.jsx`,
`SFX_URL` trong `music.js`.

## Dựng lại phong bì

Nguồn ở `~/Downloads/wedding-video/envelope/v2/` (chạy bằng `~/Downloads/wedding-video/.venv/bin/python`), xem
`README.md` trong đó. Tóm tắt:

1. `compose_base.py`, `compose_start.py`, `compose_end.py`: khung đầu / khung cuối (nền hoa + thẻ thật + phong bì).
2. Kling 3 Pro khoá khung đầu + khung cuối (`tools/fal_i2v.py`) → `card1.mp4`, `video1.mp4`.
3. Dọc: `finish_clip.py` (cắt, 60 khung/giây không bỏ khung, đo thẻ) và `bake_video2.py` (lòng thẻ = ảnh thật). Clip lần đầu
   dựng từ `video1f.mkv` (`flap_fix.py`: vạt dưới Kling vẽ gần trắng lúc lật ra → kéo về màu vạt của clip tải lại).
4. Ngang: `rot_clip.py` (bản lần đầu cũng từ `video1f.mkv`) (xoay 90°, `seal_fix.py` vẽ lại dấu sáp đứng thẳng) → `alpha_w.py` (nền trong suốt, WebM + HEVC).
5. Tiếng: Kling video-to-audio (`tools/fal_sfx.py`), tăng tốc theo clip.

Video cưới: HyperFrames (`~/Downloads/wedding-video/intro-ai/`, dự án `final-portrait5`, `final-desktop-5`), mã hoá bằng
`V=v7 tools/encode_v6.sh <khổ>`. Bản v7 (25/11): chớp trắng ở giây 3,8 hạ từ độ đậm 0,9 xuống 0,45 cho cùng kiểu lần hoà
tan ở giây 7,45 (review). Khổ ngang dùng video máy tính nên không cần dựng `final-landscape-5`.

## Điểm cần nhớ

- Không đổi cỡ thẻ hero để vừa hiệu ứng: chủ thiệp thấy ngay "hero bị thu bé". Hiệu ứng phải vừa trang.
- Đổi tốc độ clip phải giữ đủ mọi khung: giải mã thô với `-fps_mode passthrough` rồi mã hoá lại với `-r`.
- Clip phải gắn màu BT.709 / sRGB, không thì Chrome vẽ đỏ hơn phần HTML.
- Đừng tách thẻ đỏ khỏi vạt bằng màu: thẻ trong bóng và vạt tối cùng màu.
- Ảnh trong lòng phong bì khác ảnh Kling vẽ thì không được lấy bóng hay "pixel vạt" từ ảnh Kling.
- Không có transition nào được còn chạy khi View Transition kết thúc (Safari chạy lại từ đầu).
- Chrome headless chỉ vẽ ~30 khung/giây khi video phủ màn: không đo được độ mượt 60 khung/giây ở đó.

## Cách thử

- Bản build: `cd app && npx vite build && npx vite preview --port 4173` (dev server không phát video cho Safari của simulator).
- Xem lại lần đầu: xoá `localStorage['hm-intro-seen']` (hoặc tab ẩn danh); dev có `?introtest=full`.
- iPhone: simulator iOS, Safari, `http://localhost:4173/?introdebug=1`.
- Android: AVD `hm_s24` (`emulator -avd hm_s24 -no-window -gpu host`), `adb reverse tcp:4173 tcp:4173`, xoay ngang
  bằng `settings put system user_rotation 1`.
- Kiểm tra ba khổ: 390×844 (dọc), 844×390 (ngang), 1440×900 (máy tính), cả lần đầu và tải lại.
