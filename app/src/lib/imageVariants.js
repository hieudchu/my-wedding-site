import { supabase } from './supabase';
import { OPT_DIR } from './mediaManifest';

/**
 * Bản nén nhiều cỡ cho một ảnh vừa tải lên — sinh ngay trong trình duyệt.
 *
 * Trang khách dùng chúng qua `srcset`: điện thoại tải bản 960/1280 thay vì bản
 * 1600. Đặt ở đây (lúc upload) chứ không làm tay một lần cho xong, vì lần sửa
 * trước chỉ nén ảnh gốc lúc upload và quên mất những ảnh đã nằm sẵn trong kho —
 * kho vẫn đầy file 14 MB mà không ai hay. Từ giờ mọi ảnh mới đều tự có bản nén.
 *
 * Không bao giờ ném lỗi: sinh bản nén hỏng thì ảnh gốc vẫn được lưu và trang
 * khách tự dùng ảnh gốc (xem variantPaths). Chậm hơn, nhưng không mất ảnh.
 */

// 2000: cho khung admin đã phóng to (fit.z) trên màn Retina — xem sourcesFor (storage.js).
const WIDTHS = [480, 960, 1280, 1600, 2000];
const QUALITY = 0.78;
// Một năm. An toàn vì URL bản nén mang `?v=` theo phiên bản ảnh — đổi ảnh là đổi URL.
const CACHE_SECONDS = '31536000';

/** Các cỡ cần sinh cho ảnh rộng `width` px. Không bao giờ phóng to. */
export function variantWidths(width) {
  if (!Number.isFinite(width) || width <= 0) return [];
  const below = WIDTHS.filter((w) => w < width);
  return width <= WIDTHS[WIDTHS.length - 1] ? [...below, width] : WIDTHS;
}

function toBlob(canvas, type) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

/**
 * Sinh và tải lên mọi bản nén của `file`, đặt ở `_opt/<folder>/<tên>-<rộng>.<đuôi>`.
 * Trả `{ fmt, w: [...] }` để người gọi ghi vào bản kê (kèm `v`), hoặc null nếu hỏng.
 */
export async function uploadVariants(folder, fileName, file) {
  if (!file?.type?.startsWith('image/') || /svg|gif/i.test(file.type)) return null;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const widths = variantWidths(bitmap.width);
    if (!widths.length) { bitmap.close?.(); return null; }

    const base = fileName.replace(/\.[^.]+$/, '');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';

    // Safari không xuất được WebP từ canvas — toBlob lặng lẽ trả PNG. Thấy vậy
    // thì cả bộ chuyển sang JPEG, để mọi cỡ của một ảnh cùng một đuôi.
    let fmt = null;
    const done = [];
    for (const w of widths) {
      const h = Math.round((bitmap.height * w) / bitmap.width);
      canvas.width = w;
      canvas.height = h;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(bitmap, 0, 0, w, h);

      let blob = fmt !== 'jpg' ? await toBlob(canvas, 'image/webp') : null;
      if (!blob || blob.type !== 'image/webp') {
        fmt = 'jpg';
        blob = await toBlob(canvas, 'image/jpeg');
      } else {
        fmt = 'webp';
      }
      if (!blob) continue;

      const path = `${OPT_DIR}/${folder}/${base}-${w}.${fmt}`;
      const { error } = await supabase.storage.from('media').upload(path, blob, {
        upsert: true,
        cacheControl: CACHE_SECONDS,
        contentType: fmt === 'webp' ? 'image/webp' : 'image/jpeg',
      });
      if (!error) done.push({ w, fmt });
    }
    bitmap.close?.();

    // Thiếu cỡ nào, hoặc lẫn hai đuôi (đổi webp → jpg giữa chừng), thì bỏ cả bộ:
    // bản kê chỉ ghi được MỘT đuôi cho mọi cỡ, ghi bừa là trỏ vào file không có.
    const sameFmt = done.every((d) => d.fmt === fmt);
    return done.length === widths.length && sameFmt ? { fmt, w: done.map((d) => d.w) } : null;
  } catch (err) {
    console.error('[media] không sinh được bản nén, trang sẽ dùng ảnh gốc', err);
    return null;
  }
}

export { CACHE_SECONDS };
