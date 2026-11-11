/**
 * Xoay ảnh mới trước khi tải lên — nút "Xoay" của trình chỉnh khung.
 *
 * Thu luôn về cạnh dài 3000px trong cùng lượt vẽ: canvas trên iPhone tối đa
 * khoảng 16,7 megapixel, ảnh máy ảnh 24 megapixel xoay nguyên cỡ là ra canvas
 * trắng. 3000px cũng đúng là cỡ compressImage sẽ thu về ngay sau đó.
 *
 * Không xoay (0°) thì trả nguyên file. Hỏng thì ném — tải lên ảnh nằm nghiêng
 * mà không ai hay còn tệ hơn báo lỗi.
 */
const MAX_EDGE = 3000;
const QUALITY = 0.9;

export async function rotateFile(file, deg) {
  const turn = ((deg % 360) + 360) % 360;
  if (!turn) return file;

  // from-image: tôn trọng thẻ xoay EXIF, xoay thêm của người dùng tính từ đó
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const k = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * k);
  const h = Math.round(bitmap.height * k);
  const quarter = turn % 180 !== 0;

  const canvas = document.createElement('canvas');
  canvas.width = quarter ? h : w;
  canvas.height = quarter ? w : h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((turn * Math.PI) / 180);
  ctx.drawImage(bitmap, -w / 2, -h / 2, w, h);
  bitmap.close?.();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY));
  if (!blob) throw new Error('không xoay được ảnh');
  const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
  return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
}
