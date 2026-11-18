# Bản đồ component: từ prototype về production

`app.jsx` **không viết tay**: `tools/build-from-production.mjs` ghép nguyên văn 13 file của
`app/src/` thành một file cho Babel. Mỗi file là một khối mở đầu bằng `// ═══ <file> ═══`.
Port ngược = chép khối đã sửa về đúng file, **thêm lại** `import` / `export` mà công cụ đã bỏ.

| Khối trong `app.jsx` | File production `app/src/…` | Sửa được? |
|---|---|---|
| `lib/supabase.js` | `lib/supabase.js` | **PORT:** client giả. Đừng chép ngược |
| `lib/config.js` | `lib/config.js` | Không (`formatDateParts`, giá trị dự phòng) |
| `lib/fit.js`, `lib/mediaManifest.js`, `lib/storage.js`, `lib/scrollLock.js` | cùng tên | Không |
| `hooks/useViewport.js`, `hooks/useSiteConfig.js`, `hooks/useMedia.js` | cùng tên | Không |
| `components/Lightbox.jsx`, `components/MediaImage.jsx`, `components/ErrorBoundary.jsx` | cùng tên | Không (dùng chung trang chính) |
| **`adult/AdultRSVP.jsx`** | `adult/AdultRSVP.jsx` | **Có**: form xác nhận + thẻ cảm ơn |
| **`adult/AdultApp.jsx`** | `adult/AdultApp.jsx` | **Có**: thẻ thiệp, ảnh, chân trang. Có thể tách thêm file con trong `adult/` |
| `main.jsx` | `main.jsx` | **PORT:** production là `<Route path="/adult">` nạp lười. Đừng chép ngược |

## CSS

| File | Ghi chú |
|---|---|
| `styles/adult.css` | = `app/src/adult/adult.css`, import trong `AdultApp.jsx`, nạp lười cùng trang. **Chỗ thiết kế** |
| `styles/globals.css`, `sections.css`, `desktop.css`, `mobile.css` | Trang chính; `main.jsx` nạp cho mọi route. Không sửa |

Bản sao chỉ đổi `url('/assets/…')` → `url('../assets/…')` và `"/assets/…"` → `"./assets/…"`.
**Khi chép ngược, đổi lại `/assets/`.**

## Dựng lại từ production

```bash
node handoff-adult/tools/build-from-production.mjs   # ghi đè app.jsx + styles/
cd handoff-adult && python3 -m http.server 8769 &      # rồi:
PW_FROM=<thư mục có node_modules/playwright>/x.js node tools/capture.mjs   # chụp lại screens/
```

**Lệnh đầu ghi đè `app.jsx` và `styles/`.** Đừng chạy sau khi đã có thiết kế mới trong đó.
