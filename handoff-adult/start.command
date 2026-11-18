#!/bin/bash
# Double-click để xem prototype. Trình duyệt chặn file:// nên cần máy chủ cục bộ.
cd "$(dirname "$0")"
PORT=8769
echo "Đang chạy tại http://localhost:$PORT — đóng cửa sổ này để dừng."
(sleep 1 && open "http://localhost:$PORT") &
python3 -m http.server $PORT
