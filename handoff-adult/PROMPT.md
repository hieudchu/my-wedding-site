Đây là bộ handoff cho một trang mới của thiệp cưới Hiếu & Minh (15.01.2027): trang **/adult**,
thiệp **bố mẹ hai bên** gửi **đồng nghiệp, cấp trên, bạn bè của bố mẹ**.

Trang đã chạy được (dữ liệu thật, form xác nhận ghi vào database), nhưng giao diện mới là bản
dựng nền. Mình cần bạn **thiết kế UI/UX hoàn chỉnh** cho trang này, trên điện thoại (dọc + ngang)
lẫn desktop.

Người nhận phần lớn 40–65 tuổi, quen thiệp in truyền thống. Trang phải trang trọng, rõ ràng,
chữ đủ lớn, vào thẳng thiệp mời rồi xác nhận. Ít ảnh. Không nhạc. Giữ chất liệu của bộ nhận diện
(đỏ sơn mài, vàng kim, giấy ngà; Playfair Display + Cormorant Garamond) nhưng không cần giống bố
cục trang chính.

## Chạy lên trước đã

```bash
cd handoff-adult
python3 -m http.server 8000
# mở http://localhost:8000 · DevTools › device toolbar › 390×844, xoay 844×390, rồi xem desktop
```

## Đọc theo thứ tự

1. `DESIGN-BRIEF.md`: đề bài, giọng văn, bố cục, ràng buộc cứng, đầu ra
2. `INTERACTIONS.md`: chức năng từng nút, kèm số đo
3. `screens/README.md`: 9 trạng thái × 3 khổ
4. `DATA-CONTRACT.md` · `DESIGN-SYSTEM.md` · `COMPONENT-MAP.md`

## Ba điều dễ bỏ sót nhất

**1. Chỉ sửa trang này.** Viết CSS vào `styles/adult.css` (class `a-`), JSX vào hai khối
`adult/AdultApp.jsx` và `adult/AdultRSVP.jsx` trong `app.jsx`. Các file CSS khác là của trang
chính, đang chạy cho 600 khách: không sửa.

**2. Form xác nhận chỉ có ba trường:** họ tên (bắt buộc), tham dự / không (bắt buộc), lời nhắn
(tuỳ ý, ≤ 300 ký tự). Không thêm SĐT, số người, nhà trai/nhà gái.

**3. Tên người đổi được.** Tên bố mẹ, cô dâu chú rể, giờ, nơi tổ chức đến từ dữ liệu
(`DATA-CONTRACT.md`). Đừng viết cứng; bố cục phải chịu được tên dài ("Nguyễn Thị Kim Phương").

## Đầu ra

Trả về đúng cấu trúc folder này: `app.jsx` (giữ các tiêu đề `// ═══ … ═══`) + `styles/adult.css`
đã sửa, **`CHANGES.md`** (đổi gì, vì sao, class mới, chữ mới), và ảnh chụp mới cùng tên với
`screens/` (chạy `tools/capture.mjs`) để so trước/sau.
