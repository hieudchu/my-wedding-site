# Design brief — trình chỉnh khung ảnh (admin)

## Ai dùng, khi nào

Một người duy nhất: chủ nhà (chú rể), trên **máy tính** lúc ngồi soạn trang, và trên
**điện thoại** lúc đang xem trang cưới, thấy ảnh bị cắt mất đầu, muốn sửa ngay. Không
phải designer. Biết dùng app chỉnh ảnh trên điện thoại (Photos, Instagram).

## Vấn đề hôm nay

Trang **Media** trong admin: mỗi ô ảnh là một thẻ có ô xem trước nhỏ (đã mang hình vòm /
giọt nước / dải ngang) và đoạn mô tả "ảnh hiện ở đâu, bị cắt ra sao". Bấm ô → chọn file →
tải lên ngay. Ảnh luôn bị cắt **chính giữa**. Muốn biết kết quả phải mở trang khách,
xem cả máy tính lẫn điện thoại — và trên hai loại màn hình khung còn khác nhau
(`DATA-CONTRACT.md` §3). Không có cách nào chọn phần ảnh được giữ.

## Cần thiết kế

1. **Trình chỉnh khung** — mở ra khi:
   - chọn ảnh mới cho một ô (trước khi tải lên), hoặc
   - bấm "Chỉnh khung" trên ảnh đã có (ở ô cố định, ở từng ảnh trong album, ở ảnh của
     mốc giờ lịch trình).
2. **Thao tác:** kéo để dời, phóng (chụm 2 ngón / lăn chuột / thanh trượt), "Về giữa",
   xoay 90° (chỉ ảnh mới), chuyển giữa **Máy tính / Điện thoại**, và công tắc
   "Điện thoại dùng chung khung với máy tính" (bật mặc định).
3. **Xem trước đúng khung thật** ở mọi bố cục của ô đó: đúng tỉ lệ, đúng hình (vòm, giọt
   nước), có thể thêm chi tiết xung quanh nếu giúp hình dung (vd. thẻ đếm ngược đè chân ảnh
   16:9, nền mờ phía sau thẻ album). Xem trước cập nhật **ngay khi kéo**.
4. **Lối vào** trên trang Media: nút/khả năng "Chỉnh khung" cạnh ảnh đã có, và ô xem trước
   nhỏ hiện tại phải phản ánh khung đã lưu.
5. Trạng thái: đang tải ảnh, đang tải lên sau khi lưu, lỗi tải lên, ảnh không mở được
   (HEIC trên Chrome), đã lưu.

## Điện thoại là bắt buộc, không phải phụ

Màn 390×844: vùng ảnh để kéo phải đủ to cho ngón tay, các khung xem trước không được đẩy
nút "Lưu" ra khỏi màn hình. Kéo ảnh **không được** cuộn trang phía sau. Màn ngang
844×390 cũng phải dùng được.

## Ràng buộc

- Phong cách: theo `styles/admin.css` hiện có (Inter + Cormorant Garamond, tông hồng-nâu
  nhạt của admin). **Không sửa `admin.css`** — nó phải giữ nguyên byte; style mới để trong
  file riêng (gợi ý `styles/image-framer.css`).
- Không thư viện crop. React 18 thuần, pointer events.
- Mô hình dữ liệu là **tiêu điểm + phóng** (`DATA-CONTRACT.md` §1), không phải hình
  chữ nhật cắt tự do. Đừng thiết kế tay nắm kéo 4 góc.
- Chữ trên giao diện: **tiếng Việt**, giọng thân mật như các mô tả hiện có trong admin.
- Không thiết kế: bộ lọc màu/sáng, chữ đè ảnh, chỉnh con dấu, nhạc.

## Thành công là

Chủ nhà chọn ảnh chân dung cô dâu trên điện thoại, kéo cho mặt nằm đúng giữa vòm, thấy
ngay nó trông thế nào trên máy tính lẫn điện thoại, bấm Lưu, mở trang khách thấy y hệt —
không cần thử đi thử lại.
