import { supabase, supabaseConfigured } from './supabase';
import { findEntry, listFolder, emptyManifest } from './mediaManifest';

const BUCKET = 'media';

// Hết thời gian này mà App vẫn chưa nạp bản kê thì cứ mở cổng, đi đường cũ.
const GATE_FALLBACK_MS = 3000;

let manifest = emptyManifest();

// Cổng chờ bản kê. Mọi lượt đọc kho phải đợi ở đây tới khi App nạp xong bản kê.
// Không có cổng, Nav/Hero/mọi MediaImage đều hỏi kho ngay ở lượt commit đầu tiên —
// tức là trước khi site_config kịp về — nên đi hết đường liệt kê cũ; bản kê về sau
// cũng chẳng ai đọc lại: đúng 14 lượt gọi mà task này sinh ra để bỏ.
let openGate;
const manifestReady = new Promise((resolve) => { openGate = resolve; });

// Van an toàn: lỡ setManifest không bao giờ được gọi thì ảnh vẫn phải tải được
// theo đường cũ, chứ không treo vĩnh viễn ở cổng.
const gateTimer = setTimeout(() => openGate(), GATE_FALLBACK_MS);

/** App nạp bản kê vào đây khi nội dung chữ về. Gọi bao nhiêu lần cũng vô hại. */
export function setManifest(next) {
  manifest = next || emptyManifest();
  clearTimeout(gateTimer);
  openGate();
}

// Danh sách file mỗi thư mục, kèm mốc sửa đổi. Map: folder -> Map(tên -> version)
const folderCache = new Map();

const resolvedCache = new Map();   // folder -> Map(tên → version), chỉ có khi đã xong

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
    const empty = Promise.resolve(new Map());
    folderCache.set(folder, empty);
    return empty;
  }

  // Nhớ LỜI HỨA, không phải kết quả: bốn component cùng hỏi một thư mục thì cùng
  // chờ chung một lượt gọi, thay vì mỗi đứa bắn một lượt y hệt nhau.
  const pending = (async () => {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(folder, { sortBy: { column: 'name', order: 'asc' } });

    if (error) throw error;

    const files = new Map();
    for (const f of data || []) {
      if (f.id?.endsWith('/') || f.name === '.emptyFolderPlaceholder') continue;
      files.set(f.name, versionOf(f));
    }
    resolvedCache.set(folder, files);
    return files;
  })();

  // Hỏng thì quên đi, để lần sau còn thử lại thay vì nhớ mãi cái rỗng
  const guarded = pending.catch((err) => {
    // Kêu lên cho biết vì sao ảnh không hiện, đừng nuốt lỗi trong im lặng
    console.error(`Không liệt kê được thư mục "${folder}" trong bucket ${BUCKET}:`, err);
    folderCache.delete(folder);
    return new Map();
  });

  folderCache.set(folder, guarded);
  return guarded;
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
  await manifestReady;
  const known = findEntry(manifest, path);
  if (known) return buildPublicUrl(path, known.v);
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
  if (!resolvedCache.has(folder)) return null;
  const files = resolvedCache.get(folder);
  if (!files.has(name)) return null;
  return buildPublicUrl(path, files.get(name));
}

/**
 * Liệt kê file trong một thư mục, sắp theo tên.
 * Trả về mảng { name, url }, kèm { w, h, caption } khi bản kê có sẵn.
 */
export async function listMedia(folder) {
  await manifestReady;
  const fromManifest = listFolder(manifest, folder);
  if (fromManifest.length) {
    return fromManifest.map((e) => ({
      name: e.file,
      url: buildPublicUrl(`${folder}/${e.file}`, e.v),
      w: e.w,
      h: e.h,
      caption: e.caption,
    }));
  }
  const files = await getCachedFolder(folder);
  return [...files.entries()].map(([name, version]) => ({
    name,
    url: buildPublicUrl(`${folder}/${name}`, version),
  }));
}
