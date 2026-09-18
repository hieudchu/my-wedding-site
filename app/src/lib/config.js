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
  venueName: 'Long Vỹ Palace',
  venueAddress: '3A P. Đào Duy Anh, Phương Mai, Kim Liên, Hà Nội',
  phone: '+84 919229000',
  mapUrl: 'https://maps.app.goo.gl/YixfJipe3sQNtBocA',
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
