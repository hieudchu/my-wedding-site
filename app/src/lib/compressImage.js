/**
 * Thu nhỏ ảnh ngay trong trình duyệt trước khi tải lên kho.
 *
 * Ảnh máy ảnh thường là 4000×6000 (24 megapixel, hơn 10 MB). Trang web hiển thị
 * chúng ở bề rộng vài trăm pixel, nhưng điện thoại vẫn phải tải về đủ 10 MB rồi
 * giải nén thành khoảng 92 MB bộ nhớ — đó là nguyên nhân khiến trang giật và
 * tốn băng thông. Thu về cạnh dài 1600px là quá đủ cho cả màn hình Retina, mà
 * dung lượng chỉ còn khoảng 300–450 KB.
 *
 * Việc này làm ở phía trình duyệt lúc upload, nên kho ảnh **luôn** sạch, không
 * phụ thuộc vào việc người tải lên có nhớ nén trước hay không.
 */

const MAX_EDGE = 1600;
const QUALITY = 0.82;
// Dưới ngưỡng này thì ảnh đã đủ nhẹ, không cần đụng vào
const SKIP_UNDER = 600 * 1024;

/** Ảnh vector và ảnh động thì giữ nguyên — vẽ lại qua canvas sẽ làm hỏng */
function shouldSkip(file) {
  return !file.type.startsWith('image/') || /svg|gif/i.test(file.type);
}

export async function compressImage(file, maxEdge = MAX_EDGE) {
  if (shouldSkip(file)) return file;

  try {
    // from-image: tôn trọng thẻ xoay EXIF, nếu không ảnh chụp dọc sẽ bị nằm ngang
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, maxEdge / longest);

    if (scale === 1 && file.size < SKIP_UNDER) {
      bitmap.close?.();
      return file;
    }

    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY));
    if (!blob || blob.size >= file.size) return file;

    // Giữ đuôi .jpg/.jpeg sẵn có, còn lại đổi sang .jpg vì đầu ra là JPEG
    const keepsExt = /\.jpe?g$/i.test(file.name);
    const name = keepsExt ? file.name : file.name.replace(/\.[^.]+$/, '') + '.jpg';

    return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    // Trình duyệt cũ không hỗ trợ createImageBitmap — cứ tải nguyên bản còn hơn hỏng
    return file;
  }
}

/** Mô tả ngắn để hiện lên giao diện admin sau khi nén */
export function describeSaving(before, after) {
  if (after.size >= before.size) return null;
  const mb = (n) => (n / 1048576).toFixed(n < 1048576 ? 2 : 1);
  return `${mb(before.size)} MB → ${mb(after.size)} MB`;
}
