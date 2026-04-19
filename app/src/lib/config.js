export const WEDDING_CONFIG = {
  groomName: 'Chu Đăng Hiếu',
  groomShort: 'Hiếu',
  brideName: 'Nguyễn Thu Thiện Minh',
  brideShort: 'Minh',
  weddingDate: '2026-11-08',
  weddingTime: '17:00',
  venueName: 'White Palace Phạm Văn Đồng',
  venueAddress: '108 Phạm Văn Đồng, P. Hiệp Bình Chánh, TP. Thủ Đức, TP.HCM',
  phone: '+84 912 345 678',
  mapUrl: 'https://maps.google.com/?q=White+Palace+Pham+Van+Dong',
  musicTrack: 'Canon in D — Pachelbel',
};

export function formatDateParts(iso) {
  const d = new Date(iso + 'T12:00:00');
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const weekdays = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  const weekdaysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return {
    dd,
    mm,
    yyyy,
    weekday: weekdays[d.getDay()],
    weekdayEn: weekdaysEn[d.getDay()],
    monthVn: `Tháng ${d.getMonth() + 1}`,
  };
}
