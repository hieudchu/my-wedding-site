/**
 * Giá trị dự phòng khi chưa lấy được dữ liệu từ Supabase.
 * Nguồn thật là bảng site_config — sửa nội dung ở trang admin, không sửa ở đây.
 */
export const WEDDING_CONFIG = {
  groomName: 'Chu Đăng Hiếu',
  groomShort: 'Hiếu',
  brideName: 'Nguyễn Thu Thiện Minh',
  brideShort: 'Minh',
  weddingDate: '2027-01-15',
  weddingTime: '18:00',
  venueName: 'Sheraton Hanoi',
  venueAddress: 'K5, Vành Đai 1/11 Đ. Xuân Diệu, Tây Hồ, Hà Nội',
  phone: '+84 919229000',
  // TẠM: link tìm kiếm theo địa chỉ. Cần thay bằng link chia sẻ thật của
  // Sheraton Hanoi (Google Maps → Chia sẻ → Sao chép liên kết).
  mapUrl: 'https://www.google.com/maps/search/?api=1&query=Sheraton+Hanoi+K5+Xu%C3%A2n+Di%E1%BB%87u+T%C3%A2y+H%E1%BB%93+H%C3%A0+N%E1%BB%99i',
  musicTrack: 'Canon in D — Pachelbel',
};

export function formatDateParts(iso) {
  const d = new Date(iso + 'T12:00:00');
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const weekdays = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  return {
    dd,
    mm,
    yyyy,
    weekday: weekdays[d.getDay()],
    monthVn: `Tháng ${d.getMonth() + 1}`,
  };
}
