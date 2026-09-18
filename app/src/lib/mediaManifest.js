/**
 * Bản kê media — danh sách file mà trang khách cần biết, do admin ghi sẵn.
 *
 * Kho file vẫn là sự thật. Bản kê chỉ là bản sao để khách khỏi phải đi hỏi từng
 * thư mục: đo trên trang đang chạy, làm thế tốn 14 lượt gọi trước khi tấm ảnh đầu
 * tiên kịp tải. Bản kê về cùng chuyến với nội dung chữ nên tốn 0 lượt.
 *
 * Mọi hàm ở đây đều thuần: nhận bản kê, trả bản kê mới, không sửa bản cũ.
 */

export const MEDIA_FOLDERS = ['carousel', 'portraits', 'background', 'icons', 'music', 'timeline'];

export function emptyManifest() {
  return { version: 1, folders: {} };
}

function normalizeEntry(raw) {
  if (!raw || typeof raw.file !== 'string' || !raw.file) return null;
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : raw.file,
    file: raw.file,
    v: Number.isFinite(raw.v) ? raw.v : 0,
    w: Number.isFinite(raw.w) ? raw.w : 0,
    h: Number.isFinite(raw.h) ? raw.h : 0,
    caption: typeof raw.caption === 'string' ? raw.caption : '',
  };
}

/** Bản kê đọc về nhưng nội dung hỏng — không phải lỗi mạng, nên phải phân biệt. */
export class ManifestCorruptError extends Error {
  constructor(reason) {
    super(`Bản kê media hỏng: ${reason}`);
    this.name = 'ManifestCorruptError';
    this.reason = reason;
  }
}

/**
 * Đọc bản kê và nói thật nếu có phần nào đọc không được.
 *
 * Trả `{ manifest, corrupt }`: `manifest` luôn dùng được ngay, `corrupt` là câu
 * mô tả chỗ hỏng (hoặc null). Hai bên cần hai thái độ khác hẳn nhau với cùng một
 * hàng dữ liệu hỏng, nên hàm này không tự chọn hộ:
 *
 *   - Trang khách phải chạy tiếp bằng `manifest` — hàng hỏng không được làm trắng
 *     trang cưới của khách.
 *   - Đường GHI của admin phải dừng lại ở `corrupt` — ghi tiếp là lấy bản rỗng
 *     vừa suy ra để đè lên hàng thật, xoá sạch thứ tự và chú thích của cả sáu thư
 *     mục, mà nút "Quét lại kho" cũng không dựng lại được những thứ đó nữa.
 *
 * Hàng chưa tồn tại (null / chuỗi rỗng) KHÔNG phải hỏng: site mới tinh chưa ai
 * ghi bản kê bao giờ, và lần ghi đầu tiên phải đi qua được.
 */
export function readManifest(raw) {
  if (raw === null || raw === undefined || raw === '') {
    return { manifest: emptyManifest(), corrupt: null };
  }
  if (typeof raw !== 'string') {
    return { manifest: emptyManifest(), corrupt: 'giá trị đọc về không phải chuỗi' };
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { manifest: emptyManifest(), corrupt: 'nội dung không phải JSON hợp lệ' };
  }
  if (!parsed || typeof parsed !== 'object' || !parsed.folders || typeof parsed.folders !== 'object') {
    return { manifest: emptyManifest(), corrupt: 'JSON đọc được nhưng không có phần "folders"' };
  }

  const folders = {};
  const damaged = [];
  for (const [name, list] of Object.entries(parsed.folders)) {
    if (!Array.isArray(list)) {
      damaged.push(`thư mục "${name}" không phải danh sách`);
      continue;                                      // thư mục hỏng thì bỏ, không kéo sập cả bản kê
    }
    const kept = list.map(normalizeEntry).filter(Boolean);
    if (kept.length !== list.length) {
      damaged.push(`thư mục "${name}" có ${list.length - kept.length} mục không đọc được`);
    }
    folders[name] = kept;
  }
  return { manifest: { version: 1, folders }, corrupt: damaged.length ? damaged.join('; ') : null };
}

/**
 * Bản dễ tính — dùng cho trang khách. Hỏng thì coi như rỗng và đi tiếp.
 * Giữ nguyên hành vi cũ: thư mục nào hỏng thì mất riêng thư mục đó thôi.
 */
export function parseManifest(raw) {
  return readManifest(raw).manifest;
}

/**
 * Bản khó tính — dùng cho mọi đường GHI. Hỏng thì ném, để người gọi biết mà
 * đừng ghi đè lên hàng đang hỏng bằng một bản kê nghèo hơn.
 */
export function parseManifestStrict(raw) {
  const { manifest, corrupt } = readManifest(raw);
  if (corrupt) throw new ManifestCorruptError(corrupt);
  return manifest;
}

export function serializeManifest(m) {
  return JSON.stringify({ version: 1, folders: m?.folders || {} });
}

export function listFolder(m, folder) {
  return m?.folders?.[folder] || [];
}

export function findEntry(m, path) {
  if (!path || typeof path !== 'string') return null;
  const i = path.lastIndexOf('/');
  if (i < 1) return null;
  const folder = path.slice(0, i);
  const file = path.slice(i + 1);
  return listFolder(m, folder).find((e) => e.file === file) || null;
}

function replaceFolder(m, folder, list) {
  return { version: 1, folders: { ...(m?.folders || {}), [folder]: list } };
}

export function withEntry(m, folder, entry) {
  const clean = normalizeEntry(entry);
  if (!clean) return m;
  const list = listFolder(m, folder);
  const at = list.findIndex((e) => e.file === clean.file);
  const next = at === -1 ? [...list, clean] : list.map((e, i) => (i === at ? clean : e));
  return replaceFolder(m, folder, next);
}

export function withoutEntry(m, folder, file) {
  return replaceFolder(m, folder, listFolder(m, folder).filter((e) => e.file !== file));
}

export function withOrder(m, folder, ids) {
  const list = listFolder(m, folder);
  const byId = new Map(list.map((e) => [e.id, e]));
  const ordered = [];
  for (const id of ids || []) {
    const hit = byId.get(id);
    if (hit) { ordered.push(hit); byId.delete(id); }
  }
  // Entry không có trong mảng thứ tự vẫn phải giữ lại, dồn về cuối
  return replaceFolder(m, folder, [...ordered, ...byId.values()]);
}

/**
 * Mốc sửa đổi của một file trong kho, đổi ra giây — đây là `v` trong bản kê và
 * cũng là `?v=` trong URL ảnh. Một công thức duy nhất cho cả trang khách lẫn
 * admin: hai công thức lệch nhau là URL đổi mà ảnh không đổi, hoặc ngược lại.
 */
export function storageVersion(file) {
  const stamp = file?.updated_at || file?.created_at || file?.last_accessed_at;
  const ms = stamp ? Date.parse(stamp) : NaN;
  return Number.isNaN(ms) ? 0 : Math.floor(ms / 1000);
}

/** Mốc "vừa xong" — dùng khi file mới tải lên chưa có mốc nào đọc về từ kho. */
export function nowVersion() {
  return Math.floor(Date.now() / 1000);
}

/**
 * Một id bền cho mỗi mục: thư mục + tên file.
 *
 * Chỉ có MỘT công thức, ở đây. buildFromListing và đường ghi của admin phải sinh
 * ra cùng một id cho cùng một file, nếu không nút "Quét lại kho" sẽ đổi id của
 * mọi thứ đang có và thứ tự đã kéo tay biến mất.
 */
export function entryId(folder, file) {
  return `${folder}-${file}`;
}

/**
 * Dựng lại bản kê từ danh sách thật trong kho, giữ caption và thứ tự cũ nếu còn.
 * Dùng cho nút "Quét lại kho" khi bản kê lệch với thực tế.
 */
export function buildFromListing(listingByFolder, previous) {
  let next = emptyManifest();
  for (const [folder, files] of Object.entries(listingByFolder || {})) {
    if (!Array.isArray(files)) continue;
    for (const f of files) {
      if (!f?.name || f.name === '.emptyFolderPlaceholder') continue;
      const old = findEntry(previous, `${folder}/${f.name}`);
      next = withEntry(next, folder, {
        id: old?.id || entryId(folder, f.name),
        file: f.name,
        v: storageVersion(f),
        w: old?.w || 0,
        h: old?.h || 0,
        caption: old?.caption || '',
      });
    }
    const keepOrder = listFolder(previous, folder).map((e) => e.id);
    next = withOrder(next, folder, keepOrder);
  }
  return next;
}
