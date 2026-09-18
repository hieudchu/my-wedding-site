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

export function parseManifest(raw) {
  if (!raw || typeof raw !== 'string') return emptyManifest();
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return emptyManifest();
  }
  if (!parsed || typeof parsed !== 'object' || !parsed.folders) return emptyManifest();

  const folders = {};
  for (const [name, list] of Object.entries(parsed.folders)) {
    if (!Array.isArray(list)) continue;              // thư mục hỏng thì bỏ, không kéo sập cả bản kê
    folders[name] = list.map(normalizeEntry).filter(Boolean);
  }
  return { version: 1, folders };
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

function versionOf(file) {
  const stamp = file.updated_at || file.created_at;
  const ms = stamp ? Date.parse(stamp) : NaN;
  return Number.isNaN(ms) ? 0 : Math.floor(ms / 1000);
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
        id: old?.id || `${folder}-${f.name}`,
        file: f.name,
        v: versionOf(f),
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
