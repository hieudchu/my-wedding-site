/* Các khung ảnh trên trang khách, theo handoff-media-editor/DATA-CONTRACT.md §3.
   Trình chỉnh khung đọc bảng này để biết phải xem trước những khung nào.
   Nếu CSS trang khách đổi tỉ lệ/hình dạng, sửa ở đây.

   Mỗi khung:
     id       khoá duy nhất trong ô
     profile  'd' = dùng fit.d (máy tính) · 'm' = dùng fit.m (điện thoại; null thì lấy fit.d)
     ratio    rộng / cao
     shape    'rect' | 'arch' | 'blob'
     radius   bo góc (px trong ô xem trước) cho 'rect'
     decor    'blurbg' | 'maroon' | 'countdown' | 'gold' — chi tiết xung quanh giúp hình dung
     overlap  (countdown) phần chiều cao ảnh bị thẻ đếm ngược đè lên
     natural  true = trang khách hiện trọn ảnh, khung không có tác dụng
    hidden   true (kèm natural) = bố cục này không hiện ảnh này chút nào
     title / short / sub   chữ hiện dưới ô xem trước (short: dải ô nhỏ trên điện thoại) */
export const FRAMER_BLOB = '48% 52% 56% 44% / 54% 46% 54% 46%';
const BLOB = FRAMER_BLOB;

function kindOf(slot) {
  if (/^carousel\//.test(slot)) return 'carousel';
  if (/^portraits\//.test(slot)) return 'portrait';
  if (slot === 'background/right.jpg') return 'blob-right';
  if (slot === 'background/left.jpg') return 'blob-left';
  // Ảnh từng mốc giờ (timeline/…) không còn hiện ở đâu từ bản desktop 11/2026 → không có khung.
  if (slot === 'background/timeline-left.jpg' || slot === 'background/timeline-right.jpg') return 'timeline-side';
  if (slot === 'background/moment-2.jpg') return 'moment';
  return null;
}

export function framesFor(slot, imgW, imgH) {
  var tall = imgH >= imgW;
  switch (kindOf(slot)) {
    case 'carousel':
      return [
        tall
          ? { id: 'd', profile: 'd', ratio: 1 / 1.34, shape: 'rect', radius: 3, decor: 'blurbg',
              title: 'Máy tính', short: 'Thẻ 3:4', sub: 'Thẻ dọc 3:4, cao tới 760px. Phía sau là chính ảnh này, phóng to và làm mờ.' }
          : { id: 'd', profile: 'd', ratio: 3 / 2, shape: 'rect', radius: 3, decor: 'blurbg',
              title: 'Máy tính', short: 'Thẻ 3:2', sub: 'Ảnh ngang nên thẻ 3:2. Phía sau là chính ảnh này, phóng to và làm mờ.' },
        { id: 'm', profile: 'm', ratio: 2 / 3, shape: 'rect', radius: 3, decor: 'maroon',
          title: 'Điện thoại', short: 'Thẻ 2:3', sub: 'Thẻ 2:3 gần trọn màn, nền đỏ sẫm. Màn ngang cũng 2:3, theo chiều cao màn.' },
      ];
    case 'portrait':
      return [
        { id: 'd', profile: 'd', ratio: 3 / 4, shape: 'arch',
          title: 'Máy tính', short: 'Vòm 3:4', sub: 'Vòm 3:4.' },
        { id: 'm', profile: 'm', ratio: 3 / 4, shape: 'arch', decor: 'gold',
          title: 'Điện thoại dọc', short: 'Dọc', sub: 'Vòm 3:4, rộng tối đa 340px, viền vàng mảnh.' },
        { id: 'm-narrow', profile: 'm', ratio: 0.6, shape: 'arch',
          title: 'Ngang · hẹp nhất', short: 'Ngang · hẹp', sub: 'Màn ngang: vòm cao bằng khối chữ bên cạnh, nên tỉ lệ đổi theo máy. Đây là lúc hẹp nhất.' },
        { id: 'm-wide', profile: 'm', ratio: 1, shape: 'arch',
          title: 'Ngang · rộng nhất', short: 'Ngang · rộng', sub: 'Lúc rộng nhất (vuông).' },
      ];
    case 'blob-right':
    case 'blob-left': {
      // Máy tính (DeskInfo, desktop.css .d-info-photo): cả hai ảnh 3:4, đứng trọn hai bên thẻ.
      // Điện thoại (sections.css) giữ tỉ lệ cũ: phải 3:4, trái 4:5.
      var right = kindOf(slot) === 'blob-right';
      var r = right ? 3 / 4 : 4 / 5;
      var rs = right ? '3:4' : '4:5';
      return [
        { id: 'd', profile: 'd', ratio: 3 / 4, shape: 'blob',
          title: 'Máy tính', short: 'Giọt nước', sub: 'Mảng giọt nước 3:4, đứng trọn ' + (right ? 'bên phải, cao hơn' : 'bên trái, thấp hơn') + ' tấm thiệp.' },
        { id: 'm', profile: 'm', ratio: r, shape: 'blob',
          title: 'Điện thoại', short: 'Giọt nước', sub: 'Giọt nước ' + rs + '. Màn dọc rộng tối đa 300px giữa màn; màn ngang cao 82% màn.' },
      ];
    }
    case 'timeline-side':
      // desktop.css .d-tl-side: 4:5 bo 3px, rộng ≤ 340px, ẩn dưới 1100px. Điện thoại không có.
      return [
        { id: 'd', profile: 'd', ratio: 4 / 5, shape: 'rect', radius: 3,
          title: 'Máy tính', short: 'Dọc 4:5', sub: 'Khung dọc 4:5 cạnh trục lịch trình, bám theo khi cuộn. Màn hẹp dưới 1100px thì ẩn.' },
        { id: 'm-none', profile: 'm', natural: true, hidden: true,
          title: 'Điện thoại', short: 'Không hiện', sub: 'Điện thoại không có ảnh này.' },
      ];
    case 'moment':
      // Điện thoại — cả dọc lẫn ngang — hiện TRỌN ảnh (sections.css, khối màn ngang
      // cuối file đè lên tỉ lệ 560:428 cũ), nên không có khung điện thoại nào để chỉnh.
      return [
        // desktop.css .d-cd-photo: 4:5 bo 3px; thẻ đếm ngược đè 48px mép dưới (~8% ảnh cao ~600px)
        { id: 'd', profile: 'd', ratio: 4 / 5, shape: 'rect', radius: 3, decor: 'countdown', overlap: 0.08,
          title: 'Máy tính', short: 'Dọc 4:5', sub: 'Khung dọc 4:5. Thẻ đếm ngược đè lên khoảng 48px mép dưới — đừng để mặt nằm ở đó.' },
        { id: 'm-portrait', profile: 'm', natural: true,
          title: 'Điện thoại', short: 'Dọc & ngang', sub: 'Điện thoại dọc lẫn ngang đều hiện trọn ảnh, không cắt — khung không áp ở đây.' },
      ];
    default:
      return [
        { id: 'd', profile: 'd', ratio: 1, shape: 'rect', radius: 3, title: 'Máy tính', short: '1:1', sub: '' },
        { id: 'm', profile: 'm', ratio: 1, shape: 'rect', radius: 3, title: 'Điện thoại', short: '1:1', sub: '' },
      ];
  }
}

/** Ô này có khung để chỉnh không. Con dấu, nhạc và ảnh không còn chỗ hiện thì không. */
export function canFrame(slot) {
  return kindOf(slot) !== null;
}
