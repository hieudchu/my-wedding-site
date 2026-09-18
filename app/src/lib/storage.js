import { supabase, supabaseConfigured } from './supabase';

const BUCKET = 'media';

// Danh sách file mỗi thư mục, kèm mốc sửa đổi. Map: folder -> Map(tên -> version)
const folderCache = new Map();

/** Đổi mốc sửa đổi của file thành một chuỗi ngắn để gắn vào URL */
function versionOf(file) {
  const stamp = file.updated_at || file.created_at || file.last_accessed_at;
  const ms = stamp ? Date.parse(stamp) : NaN;
  return Number.isNaN(ms) ? '0' : String(Math.floor(ms / 1000));
}

/**
 * Liệt kê và ghi nhớ các file trong một thư mục của bucket.
 */
async function getCachedFolder(folder) {
  if (folderCache.has(folder)) return folderCache.get(folder);
  if (!supabaseConfigured) {
    folderCache.set(folder, new Map());
    return folderCache.get(folder);
  }

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(folder, { sortBy: { column: 'name', order: 'asc' } });

    const files = new Map();
    if (!error && data) {
      for (const f of data) {
        if (f.id?.endsWith('/') || f.name === '.emptyFolderPlaceholder') continue;
        files.set(f.name, versionOf(f));
      }
    }
    folderCache.set(folder, files);
    return files;
  } catch {
    folderCache.set(folder, new Map());
    return folderCache.get(folder);
  }
}

/**
 * Dựng URL công khai cho một file.
 *
 * Gắn `?v=` theo **mốc sửa đổi của chính file đó**, không phải theo thời điểm tải
 * trang. Nhờ vậy URL đứng yên giữa các lần truy cập nên CDN cache được — khách quay
 * lại gần như không tốn dữ liệu — nhưng vẫn đổi ngay khi chủ nhà upload ảnh mới.
 */
function buildPublicUrl(path, version) {
  if (!path || !supabaseConfigured) return null;
  try {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    if (!data?.publicUrl) return null;
    return version ? `${data.publicUrl}?v=${version}` : data.publicUrl;
  } catch {
    return null;
  }
}

function splitPath(path) {
  const i = path.lastIndexOf('/');
  return {
    folder: i > 0 ? path.substring(0, i) : '',
    name: i > 0 ? path.substring(i + 1) : path,
  };
}

/**
 * URL công khai của file, chỉ trả về nếu file thật sự tồn tại trong bucket.
 */
export async function getMediaUrlAsync(path) {
  if (!path || !supabaseConfigured) return null;
  const { folder, name } = splitPath(path);
  const files = await getCachedFolder(folder);
  if (!files.has(name)) return null;
  return buildPublicUrl(path, files.get(name));
}

/**
 * Bản đồng bộ — chỉ trả về URL nếu thư mục đã được liệt kê trước đó.
 */
export function getMediaUrl(path) {
  if (!path || !supabaseConfigured) return null;
  const { folder, name } = splitPath(path);
  if (!folderCache.has(folder)) return null;
  const files = folderCache.get(folder);
  if (!files.has(name)) return null;
  return buildPublicUrl(path, files.get(name));
}

/**
 * Liệt kê file trong một thư mục, sắp theo tên.
 * Trả về mảng { name, url }.
 */
export async function listMedia(folder) {
  const files = await getCachedFolder(folder);
  return [...files.entries()].map(([name, version]) => ({
    name,
    url: buildPublicUrl(`${folder}/${name}`, version),
  }));
}
