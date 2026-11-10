#!/bin/bash
# Double-click file này để xem prototype.
# Nó mở một máy chủ cục bộ (bắt buộc — trình duyệt chặn file://) rồi mở trình duyệt.
cd "$(dirname "$0")"
PORT=8767
echo "Đang chạy tại http://localhost:$PORT — đóng cửa sổ này để dừng."
(sleep 1 && open "http://localhost:$PORT") &
python3 -m http.server $PORT
