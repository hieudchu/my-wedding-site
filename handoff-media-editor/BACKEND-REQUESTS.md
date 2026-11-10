# Backend requests — trình chỉnh khung ảnh

Thiết kế chỉ dùng dữ liệu trong `DATA-CONTRACT.md`. **Không cần trường dữ liệu mới.**

Những điều cần backend xác nhận (không chặn port giao diện):

## Q-1 · Màn ngang dùng hồ sơ nào

Prototype coi điện thoại ngang / tablet dùng `fit.m` (cùng `--mfx/--mfy/--mfz`). CSS trang
khách cần áp `fit.m` cho cả bố cục ngang. Nếu muốn màn ngang dùng `fit.d`, đổi `profile` của
các khung ngang trong `frames.js` — giao diện không phải sửa.

## Q-2 · Tiến trình tải lên

Trình chỉnh hiện phần trăm nếu `onSave` gọi `reportProgress`. Nếu API tải lên không báo
tiến trình thì thôi — thanh chạy vô định, không cần làm gì thêm.

## Q-3 · Xoay ảnh mới

`result.rotate` (0/90/180/270) đi kèm ảnh **gốc chưa xoay**. Backend xoay file khi tải lên
(hoặc client xoay bằng canvas trước khi gửi — prototype làm vậy để xem trước, hàm
`rotateImageURL`). Fit được tính trên ảnh **đã xoay**.
