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
  if (/^timeline\//.test(slot)) return 'timeline';
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
      var r = kindOf(slot) === 'blob-right' ? 3 / 4 : 4 / 5;
      var edge = kindOf(slot) === 'blob-right' ? 'phải' : 'trái';
      var rs = kindOf(slot) === 'blob-right' ? '3:4' : '4:5';
      return [
        { id: 'd', profile: 'd', ratio: r, shape: 'blob',
          title: 'Máy tính', short: 'Giọt nước', sub: 'Mảng giọt nước ' + rs + ', tràn ra mép ' + edge + ' màn hình.' },
        { id: 'm', profile: 'm', ratio: r, shape: 'blob',
          title: 'Điện thoại', short: 'Giọt nước', sub: 'Cùng hình. Màn dọc rộng tối đa 300px giữa màn; màn ngang cao 82% màn.' },
      ];
    }
    case 'timeline':
      return [
        { id: 'd', profile: 'd', ratio: 4 / 3, shape: 'rect', radius: 3,
          title: 'Máy tính', short: '4:3', sub: 'Ảnh 4:3 cạnh mốc giờ.' },
        // Điện thoại (cả tablet dọc, màn ngang ngắn) dùng lịch trình dạng sợi chỉ `.tlw`
        // với biểu tượng — `.tl-track` có ảnh bị ẩn hẳn (sections.css, mục TimelineWave).
        { id: 'm-none', profile: 'm', natural: true, hidden: true,
          title: 'Điện thoại', short: 'Không hiện', sub: 'Điện thoại hiện lịch trình dạng biểu tượng, không có ảnh này.' },
      ];
    case 'moment':
      // Điện thoại — cả dọc lẫn ngang — hiện TRỌN ảnh (sections.css, khối màn ngang
      // cuối file đè lên tỉ lệ 560:428 cũ), nên không có khung điện thoại nào để chỉnh.
      return [
        { id: 'd', profile: 'd', ratio: 16 / 9, shape: 'rect', radius: 4, decor: 'countdown', overlap: 0.09,
          title: 'Máy tính', short: 'Dải 16:9', sub: 'Dải 16:9 bo 6px. Thẻ đếm ngược đè lên khoảng 50px mép dưới — đừng để mặt nằm ở đó.' },
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
