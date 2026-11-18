/*
 * app.jsx — TỰ SINH từ app/src bằng tools/build-from-production.mjs. Bản chụp 2026-11-17.
 *
 * Đây là mã production NGUYÊN VẸN của trang /adult (mọi khổ màn), chỉ ghép
 * lại thành một file cho Babel chạy trong trình duyệt. Mỗi khối mở đầu bằng
 * `// ═══ <file production> ═══` — đó là chỗ phải chép ngược về khi port.
 * Chỗ duy nhất khác production đánh dấu `PORT:` (client Supabase giả).
 */
const { Component, createContext, useCallback, useContext, useEffect, useRef, useState } = React;


// ═══ lib/supabase.js — PORT: thay bằng client giả ═══
// Production: createClient(VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY).
// Ở đây: đọc window.__DB__ (data/db.js) và ảnh trong ./media/. Đủ cho đúng những gì
// trang khách gọi: from(t).select().eq().order(), from(t).insert(), storage getPublicUrl/list.
// Gửi RSVP / lời chúc: không ghi đi đâu cả, chờ 600ms rồi báo thành công (xem console).
const supabaseConfigured = true;
const supabase = (() => {
  const db = window.__DB__ || {};
  function query(table) {
    let rows = [...(db[table] || [])];
    let inserting = false;
    const q = {
      select() { return q; },
      eq(col, val) { rows = rows.filter((r) => r[col] === val); return q; },
      order(col, opts) {
        const dir = opts && opts.ascending === false ? -1 : 1;
        rows.sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * dir);
        return q;
      },
      insert(row) { inserting = true; console.info('[prototype] insert vào', table, row); return q; },
      then(resolve, reject) {
        const wait = new Promise((r) => setTimeout(r, inserting ? 600 : 0));
        return wait.then(() => ({ data: inserting ? null : rows, error: null })).then(resolve, reject);
      },
    };
    return q;
  }
  return {
    from: query,
    storage: {
      from: () => ({
        getPublicUrl: (path) => ({
          data: { publicUrl: './media/' + path.split('/').map(encodeURIComponent).join('/') },
        }),
        // Production chỉ liệt kê thư mục khi file KHÔNG có trong bản kê. Bản kê ở đây
        // đầy đủ, nên trả rỗng = đúng hành vi "file không tồn tại → dùng ảnh dự phòng".
        list: () => Promise.resolve({ data: [], error: null }),
      }),
    },
  };
})();

// ═══ lib/config.js ═══
/**
 * Giá trị dự phòng khi chưa lấy được dữ liệu từ Supabase.
 * Nguồn thật là bảng site_config — sửa nội dung ở trang admin, không sửa ở đây.
 */
const WEDDING_CONFIG = {
  groomName: 'Chu Đăng Hiếu',
  groomShort: 'Hiếu',
  brideName: 'Nguyễn Thu Thiện Minh',
  brideShort: 'Minh',
  weddingDate: '2027-01-15',
  weddingTime: '18:00',
  venueName: 'Sheraton Hanoi',
  venueAddress: 'K5, Vành Đai 1/11 Đ. Xuân Diệu, Tây Hồ, Hà Nội',
  phone: '+84 919229000',
  mapUrl: 'https://maps.app.goo.gl/dp3LQbtQZo7iKYSc6',
  musicTrack: 'Canon in D — Pachelbel',
};

function formatDateParts(iso) {
  const d = new Date(iso + 'T12:00:00');
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const weekdays = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  return {
    dd,
    mm,
    yyyy,
    weekday: weekdays[d.getDay()],
    monthVn: `Tháng ${d.getMonth() + 1}`,
  };
}

// ═══ lib/fit.js ═══
/**
 * Khung ảnh (tiêu điểm + phóng) → props cho <img> ở trang khách.
 *
 * Chỉ gắn biến CSS; quy tắc `img.has-fit` trong globals.css (máy tính) và trong khối
 * PHONE_QUERY của sections.css (điện thoại) chọn bộ biến nào áp. Nhờ vậy cùng một
 * <img> đổi khung theo màn hình mà không cần JS đo màn hình.
 *
 * `fit` null → không gắn gì: ảnh hiện y như trước khi có tính năng này.
 */
function fitProps(fit, className = '') {
  if (!fit) return { className: className || undefined };
  const d = fit.d;
  const m = fit.m || fit.d;
  return {
    className: `${className} has-fit`.trim(),
    style: {
      '--fdx': `${d.x}%`, '--fdy': `${d.y}%`, '--fdz': d.z,
      '--fmx': `${m.x}%`, '--fmy': `${m.y}%`, '--fmz': m.z,
    },
  };
}

// ═══ hooks/useViewport.js ═══
const PHONE_MAX = 760;   // rộng dưới ngưỡng này là điện thoại (dọc)
const PHONE_MAX_H = 520; // HOẶC cao không quá ngưỡng này (điện thoại quay ngang)
const TABLET_MAX = 1080;

// SỬA 11 — điểm ngắt xét cả chiều cao. Chuỗi này phải khớp TỪNG KÝ TỰ với media
// query ở sections.css (khối "ĐIỆN THOẠI"). Đổi một bên mà quên bên kia là vỡ bố cục.
// Tablet / máy gập DỌC (rộng < 1200px, tỉ lệ ≤ 5:6) và mọi màn CẢM ỨNG rộng < 1440px
// (tablet / máy gập quay ngang) cũng dùng bố cục điện thoại.
const PHONE_QUERY =
  '(max-width: 759.98px), (max-height: 520px), (max-width: 1199.98px) and (max-aspect-ratio: 5/6), (hover: none) and (pointer: coarse) and (max-width: 1439.98px)';
const COARSE_QUERY = '(hover: none) and (pointer: coarse)';

// SỬA 3 — iOS bắn `resize` mỗi lần thanh địa chỉ thu/giãn (60–100px). Trên thiết bị
// cảm ứng, đổi chiều cao dưới ngưỡng này mà bề ngang giữ nguyên thì coi là thanh địa
// chỉ, bỏ qua. Xoay máy luôn đổi bề ngang nên không bị chặn nhầm.
const ADDRESS_BAR_SLACK = 120;

function mqMatches(q) {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(q).matches;
}

function onMediaChange(q, fn) {
  const m = window.matchMedia(q);
  if (m.addEventListener) {
    m.addEventListener('change', fn);
    return () => m.removeEventListener('change', fn);
  }
  m.addListener(fn); // Safari < 14
  return () => m.removeListener(fn);
}

/**
 * Kích thước khung nhìn + cờ "đang ở bố cục điện thoại".
 *
 * `isPhone` đọc từ matchMedia chứ không so sánh bề ngang, để khớp đúng với CSS.
 */
function useViewport() {
  const [size, setSize] = useState(() => ({
    vw: typeof window !== 'undefined' ? window.innerWidth : 1280,
    vh: typeof window !== 'undefined' ? window.innerHeight : 800,
  }));
  const [isPhone, setIsPhone] = useState(() => mqMatches(PHONE_QUERY));

  useEffect(() => {
    const coarse = mqMatches(COARSE_QUERY);
    const read = () => setSize((prev) => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (coarse && vw === prev.vw && Math.abs(vh - prev.vh) < ADDRESS_BAR_SLACK) return prev; // SỬA 3
      return vw === prev.vw && vh === prev.vh ? prev : { vw, vh };
    });
    const onOrientation = () => {
      read();
      setTimeout(read, 250); // iOS báo kích thước cũ ngay lúc xoay
    };
    read();
    setIsPhone(mqMatches(PHONE_QUERY));
    const offPhone = onMediaChange(PHONE_QUERY, () => setIsPhone(mqMatches(PHONE_QUERY)));
    window.addEventListener('resize', read);
    window.addEventListener('orientationchange', onOrientation);
    return () => {
      offPhone();
      window.removeEventListener('resize', read);
      window.removeEventListener('orientationchange', onOrientation);
    };
  }, []);

  return { ...size, isPhone, isTablet: !isPhone && size.vw < TABLET_MAX };
}

// ═══ lib/scrollLock.js ═══
/**
 * Khoá cuộn trang.
 *
 * SỬA 7 — `body.style.overflow = 'hidden'` không chặn được cuộn bằng ngón tay trên
 * iOS. Trên thiết bị cảm ứng, ghim hẳn body bằng `position: fixed` và trả lại vị trí
 * cuộn khi mở khoá. Máy tính giữ cách cũ (overflow) → desktop không đổi.
 *
 * Có bộ đếm vì nhiều chỗ có thể cùng khoá. Hiện chỉ lightbox dùng (cổng đã bỏ).
 */

let lockDepth = 0;
let lockY = 0;

function instantScrollTo(y) {
  const root = document.documentElement;
  const prev = root.style.scrollBehavior;
  root.style.scrollBehavior = 'auto'; // html có scroll-behavior: smooth
  window.scrollTo(0, y);
  root.style.scrollBehavior = prev;
}

function lockScroll({ toTop = false } = {}) {
  lockDepth += 1;
  if (lockDepth > 1) return;
  const b = document.body.style;
  if (mqMatches(COARSE_QUERY)) {
    if (toTop) instantScrollTo(0);
    lockY = window.scrollY;
    b.position = 'fixed';
    b.top = `-${lockY}px`;
    b.left = '0';
    b.right = '0';
    b.width = '100%';
  }
  b.overflow = 'hidden';
}

function unlockScroll() {
  if (lockDepth === 0) return;
  lockDepth -= 1;
  if (lockDepth > 0) return;
  const b = document.body.style;
  const pinned = b.position === 'fixed';
  b.position = '';
  b.top = '';
  b.left = '';
  b.right = '';
  b.width = '';
  b.overflow = '';
  if (pinned) instantScrollTo(lockY);
}

// ═══ lib/mediaManifest.js ═══
/**
 * Bản kê media — danh sách file mà trang khách cần biết, do admin ghi sẵn.
 *
 * Kho file vẫn là sự thật. Bản kê chỉ là bản sao để khách khỏi phải đi hỏi từng
 * thư mục: đo trên trang đang chạy, làm thế tốn 14 lượt gọi trước khi tấm ảnh đầu
 * tiên kịp tải. Bản kê về cùng chuyến với nội dung chữ nên tốn 0 lượt.
 *
 * Mọi hàm ở đây đều thuần: nhận bản kê, trả bản kê mới, không sửa bản cũ.
 */

// 'icons' (con dấu) và 'timeline' (ảnh từng mốc giờ) đã bỏ 11/2026: trang khách dùng con dấu
// có sẵn trong /assets, và lịch trình không còn ảnh từng mốc.
const MEDIA_FOLDERS = ['carousel', 'portraits', 'background', 'music'];

function emptyManifest() {
  return { version: 1, folders: {} };
}

/**
 * Bản nén của ảnh nằm NGOÀI các thư mục media, ở `_opt/<thư mục>/<tên>-<rộng>.<đuôi>`,
 * để "Quét lại kho" — vốn liệt kê từng thư mục — không bao giờ nhặt nhầm chúng
 * thành ảnh.
 */
const OPT_DIR = '_opt';
const OPT_FORMATS = ['webp', 'jpg'];

/**
 * `opt` = { v, fmt, w: [480, 960, 1600] }: ảnh này có những bản nén nào.
 * `v` là phiên bản của ẢNH GỐC lúc sinh bản nén — xem variantPaths.
 * Hỏng thì trả null: mất bản nén chỉ làm ảnh tải chậm, không làm mất ảnh.
 */
function normalizeOpt(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (!Number.isFinite(raw.v) || !OPT_FORMATS.includes(raw.fmt) || !Array.isArray(raw.w)) return null;
  const w = [...new Set(raw.w.filter((x) => Number.isInteger(x) && x > 0))].sort((a, b) => a - b);
  return w.length ? { v: raw.v, fmt: raw.fmt, w } : null;
}

/**
 * `fit` = { v, d: {x, y, z}, m: {x, y, z} | null }: phần ảnh được giữ trong khung.
 *
 *   x, y — tiêu điểm, % theo bề rộng/cao ảnh (0–100). Điểm này đứng yên ở cùng vị
 *          trí tương đối trong mọi khung, dù khung có tỉ lệ nào.
 *   z    — độ phóng 1–3; 1 = ảnh vừa khít khung (object-fit: cover).
 *   d    — bố cục máy tính · m — bố cục điện thoại (PHONE_QUERY); null = dùng d.
 *   v    — phiên bản ẢNH lúc lưu khung. Khác `entry.v` (ảnh đã bị thay) thì bỏ qua —
 *          xem fitFor. Khung của ảnh cũ áp lên ảnh mới là lệch mặt người ra ngoài.
 *
 * Không cắt file: khách bấm vào ảnh vẫn mở ảnh đầy đủ.
 */
const FIT_CENTER = Object.freeze({ x: 50, y: 50, z: 1 });

function normalizePoint(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const { x, y, z } = raw;
  if (![x, y, z].every(Number.isFinite)) return null;
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  return { x: clamp(x, 0, 100), y: clamp(y, 0, 100), z: clamp(z, 1, 3) };
}

function normalizeFit(raw) {
  if (!raw || typeof raw !== 'object' || !Number.isFinite(raw.v)) return null;
  const d = normalizePoint(raw.d) || { ...FIT_CENTER };
  const m = normalizePoint(raw.m);
  return { v: raw.v, d, m };
}

/** Khung hợp lệ của một mục, hoặc null (chưa chỉnh, hoặc đã thay ảnh từ lúc chỉnh). */
function fitFor(entry) {
  const fit = entry?.fit;
  if (!fit || fit.v !== entry.v) return null;
  return fit;
}

function normalizeEntry(raw) {
  if (!raw || typeof raw.file !== 'string' || !raw.file) return null;
  const opt = normalizeOpt(raw.opt);
  const fit = normalizeFit(raw.fit);
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : raw.file,
    file: raw.file,
    v: Number.isFinite(raw.v) ? raw.v : 0,
    w: Number.isFinite(raw.w) ? raw.w : 0,
    h: Number.isFinite(raw.h) ? raw.h : 0,
    caption: typeof raw.caption === 'string' ? raw.caption : '',
    // Phải giữ lại ở đây: mọi đường ghi đều đi qua hàm này, bỏ sót là lượt ghi kế
    // tiếp của admin xoá sạch thông tin bản nén mà không ai hay.
    ...(opt ? { opt } : {}),
    // Cùng lý do với `opt`: bỏ sót ở đây là lượt ghi kế tiếp xoá sạch khung đã chỉnh.
    ...(fit ? { fit } : {}),
  };
}

/**
 * Đường dẫn các bản nén của một mục, tăng dần theo bề rộng.
 *
 * Chỉ trả khi bản nén được sinh từ ĐÚNG phiên bản ảnh hiện tại (`opt.v === v`).
 * Chủ nhà thay ảnh mà bản nén chưa kịp sinh lại thì trả rỗng → trang dùng ảnh gốc:
 * chậm hơn, nhưng không bao giờ hiện ảnh cũ.
 */
function variantPaths(folder, entry) {
  const opt = entry?.opt;
  if (!opt || opt.v !== entry.v) return [];
  const base = entry.file.replace(/\.[^.]+$/, '');
  return opt.w.map((w) => ({ w, path: `${OPT_DIR}/${folder}/${base}-${w}.${opt.fmt}` }));
}

/** Bản kê đọc về nhưng nội dung hỏng — không phải lỗi mạng, nên phải phân biệt. */
class ManifestCorruptError extends Error {
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
function readManifest(raw) {
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
function parseManifest(raw) {
  return readManifest(raw).manifest;
}

/**
 * Bản khó tính — dùng cho mọi đường GHI. Hỏng thì ném, để người gọi biết mà
 * đừng ghi đè lên hàng đang hỏng bằng một bản kê nghèo hơn.
 */
function parseManifestStrict(raw) {
  const { manifest, corrupt } = readManifest(raw);
  if (corrupt) throw new ManifestCorruptError(corrupt);
  return manifest;
}

function serializeManifest(m) {
  return JSON.stringify({ version: 1, folders: m?.folders || {} });
}

function listFolder(m, folder) {
  return m?.folders?.[folder] || [];
}

function findEntry(m, path) {
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

function withEntry(m, folder, entry) {
  const clean = normalizeEntry(entry);
  if (!clean) return m;
  const list = listFolder(m, folder);
  const at = list.findIndex((e) => e.file === clean.file);
  const next = at === -1 ? [...list, clean] : list.map((e, i) => (i === at ? clean : e));
  return replaceFolder(m, folder, next);
}

function withoutEntry(m, folder, file) {
  return replaceFolder(m, folder, listFolder(m, folder).filter((e) => e.file !== file));
}

function withOrder(m, folder, ids) {
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
function storageVersion(file) {
  const stamp = file?.updated_at || file?.created_at || file?.last_accessed_at;
  const ms = stamp ? Date.parse(stamp) : NaN;
  return Number.isNaN(ms) ? 0 : Math.floor(ms / 1000);
}

/** Mốc "vừa xong" — dùng khi file mới tải lên chưa có mốc nào đọc về từ kho. */
function nowVersion() {
  return Math.floor(Date.now() / 1000);
}

/**
 * Một id bền cho mỗi mục: thư mục + tên file.
 *
 * Chỉ có MỘT công thức, ở đây. buildFromListing và đường ghi của admin phải sinh
 * ra cùng một id cho cùng một file, nếu không nút "Quét lại kho" sẽ đổi id của
 * mọi thứ đang có và thứ tự đã kéo tay biến mất.
 */
function entryId(folder, file) {
  return `${folder}-${file}`;
}

/** Độ lệch đồng hồ máy admin so với kho được bỏ qua khi quét lại (giây). */
const RESTAMP_SLACK = 120;

/**
 * Dựng lại bản kê từ danh sách thật trong kho, giữ caption và thứ tự cũ nếu còn.
 * Dùng cho nút "Quét lại kho" khi bản kê lệch với thực tế.
 */
function buildFromListing(listingByFolder, previous) {
  let next = emptyManifest();
  for (const [folder, files] of Object.entries(listingByFolder || {})) {
    if (!Array.isArray(files)) continue;
    for (const f of files) {
      if (!f?.name || f.name === '.emptyFolderPlaceholder') continue;
      const old = findEntry(previous, `${folder}/${f.name}`);
      const v = storageVersion(f);
      // Admin ghi `v` bằng đồng hồ máy SAU khi tải ảnh + bản nén (nowVersion), còn kho
      // ghi mốc lúc nhận ảnh gốc, sớm hơn vài giây. Quét lại đổi `v` sang mốc kho, nên
      // nếu giữ nguyên opt.v / fit.v thì bản nén và khung đã chỉnh mất hiệu lực, dù ảnh
      // không đổi (11/2026: cả 22 ảnh rơi về ảnh gốc 3000px, khung căn giữa).
      // Mốc kho không mới hơn lần admin tải lên (cho lệch đồng hồ RESTAMP_SLACK giây)
      // → vẫn là file đó → dời opt.v / fit.v theo. File bị thay sau đó thì mốc kho mới
      // hơn → giữ nguyên, bản nén / khung cũ tự vô hiệu như trước.
      const same = !!old?.v && v <= old.v + RESTAMP_SLACK;
      const restamp = (x) => (x && same && x.v === old.v ? { ...x, v } : x);
      next = withEntry(next, folder, {
        id: old?.id || entryId(folder, f.name),
        file: f.name,
        v,
        w: old?.w || 0,
        h: old?.h || 0,
        caption: old?.caption || '',
        opt: restamp(old?.opt),
        // Khung chỉ còn hiệu lực nếu `fit.v` khớp `v` mới (fitFor), nên mang sang
        // luôn cũng an toàn: file bị thay ngoài trang này thì khung tự vô hiệu.
        fit: restamp(old?.fit),
      });
    }
    const keepOrder = listFolder(previous, folder).map((e) => e.id);
    next = withOrder(next, folder, keepOrder);
  }
  return next;
}

// ═══ lib/storage.js ═══
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
function setManifest(next) {
  manifest = next || emptyManifest();
  clearTimeout(gateTimer);
  openGate();
}

// Danh sách file mỗi thư mục, kèm mốc sửa đổi. Map: folder -> Map(tên -> version)
const folderCache = new Map();

const resolvedCache = new Map();   // folder -> Map(tên → version), chỉ có khi đã xong

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
      // URL cần chuỗi; bản kê cần số. Cùng một mốc, chỉ khác lúc viết ra.
      files.set(f.name, String(storageVersion(f)));
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

/**
 * Mọi cỡ của một ảnh trong bản kê, sẵn để gắn vào <img>.
 *
 *   url    — cỡ giữa (≤ 960px): `src` mặc định cho trình duyệt bỏ qua srcset
 *   srcSet — mọi bản nén, để trình duyệt tự chọn theo màn hình
 *   small  — cỡ nhỏ nhất: ảnh nền bị làm mờ, logo bé
 *   full   — cỡ lớn nhất: lightbox
 *   original — ảnh gốc: nấc lùi khi bản nén không tải được
 *
 * URL bản nén gắn `?v=` của CHÍNH bản nén. Tên file bản nén không đổi khi chủ nhà
 * thay ảnh, mà cache để một năm — thiếu `?v=` là khách thấy ảnh cũ suốt một năm.
 *
 * Chưa có bản nén thì cả bốn đều là ảnh gốc: chậm hơn nhưng vẫn đúng ảnh.
 */
function sourcesFor(folder, entry) {
  const original = buildPublicUrl(`${folder}/${entry.file}`, entry.v);
  const variants = variantPaths(folder, entry)
    .map(({ w, path }) => ({ w, url: buildPublicUrl(path, entry.opt.v) }))
    .filter((x) => x.url);
  const fit = fitFor(entry);
  if (!variants.length) return { url: original, srcSet: undefined, small: original, full: original, original, fit };
  const mid = [...variants].reverse().find((x) => x.w <= 960) || variants[0];
  // Khung phóng z× (fit) thì ô cần z lần số điểm ảnh, nhưng `sizes` chỉ biết bề rộng ô.
  // Khai bề rộng mỗi bản nén chia cho z → trình duyệt tự chọn bản lớn hơn đúng z lần.
  // Lấy z lớn nhất của máy tính/điện thoại: một srcset dùng chung cho cả hai bố cục.
  const zoom = Math.max(1, fit?.d?.z || 1, fit?.m?.z || 1);
  return {
    url: mid.url,
    srcSet: variants.map((x) => `${x.url} ${Math.max(1, Math.round(x.w / zoom))}w`).join(', '),
    small: variants[0].url,
    full: variants[variants.length - 1].url,
    original,
    fit,
  };
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
async function getMediaSourcesAsync(path) {
  if (!path || !supabaseConfigured) return null;
  await manifestReady;
  const known = findEntry(manifest, path);
  if (known) return sourcesFor(splitPath(path).folder, known);
  const url = await getMediaUrlAsync(path);
  return url ? { url, srcSet: undefined, small: url, full: url, original: url } : null;
}

async function getMediaUrlAsync(path) {
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
function getMediaUrl(path) {
  if (!path || !supabaseConfigured) return null;
  const { folder, name } = splitPath(path);
  if (!resolvedCache.has(folder)) return null;
  const files = resolvedCache.get(folder);
  if (!files.has(name)) return null;
  return buildPublicUrl(path, files.get(name));
}

/**
 * Liệt kê file trong một thư mục, sắp theo tên.
 * Trả về mảng { name, url }, kèm { srcSet, small, full, w, h, caption } khi bản kê có sẵn.
 */
async function listMedia(folder) {
  await manifestReady;
  const fromManifest = listFolder(manifest, folder);
  if (fromManifest.length) {
    return fromManifest.map((e) => ({
      name: e.file,
      ...sourcesFor(folder, e),
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

// ═══ hooks/useSiteConfig.js ═══
const DB_KEY_TO_CONFIG = {
  groom_name: 'groomName',
  groom_short: 'groomShort',
  bride_name: 'brideName',
  bride_short: 'brideShort',
  wedding_date: 'weddingDate',
  wedding_time: 'weddingTime',
  venue_name: 'venueName',
  venue_address: 'venueAddress',
  phone: 'phone',
  map_url: 'mapUrl',
};

function useSiteConfig() {
  const [config, setConfig] = useState(WEDDING_CONFIG);
  const [siteText, setSiteText] = useState({});
  const [manifest, setManifest] = useState(emptyManifest());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchConfig() {
      try {
        // index.html đã hỏi sẵn từ lúc tải trang. Chỉ dùng một lần: lần mount sau
        // (StrictMode, điều hướng) phải hỏi mới, không đọc lại bản cũ.
        const early = window.__siteConfig;
        window.__siteConfig = null;
        let data = early ? await early : null;
        if (!Array.isArray(data)) {
          const res = await supabase.from('site_config').select('key, value');
          if (res.error) throw res.error;
          data = res.data;
        }
        if (cancelled) return;

        const merged = { ...WEDDING_CONFIG };
        const texts = {};

        for (const row of data) {
          if (DB_KEY_TO_CONFIG[row.key]) {
            merged[DB_KEY_TO_CONFIG[row.key]] = row.value;
          }
          texts[row.key] = row.value;
          if (row.key === 'media_manifest') {
            setManifest(parseManifest(row.value));
          }
        }

        setConfig(merged);
        setSiteText(texts);
      } catch {
        // Fallback to hardcoded defaults
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchConfig();
    return () => { cancelled = true; };
  }, []);

  return { config, siteText, manifest, loading };
}

// ═══ hooks/useMedia.js ═══
/**
 * Get a single media file URL by its storage path.
 * Waits for bucket availability check, then returns remote URL or localFallback.
 */
function useMediaUrl(storagePath, localFallback = null) {
  const [url, setUrl] = useState(localFallback);

  useEffect(() => {
    let cancelled = false;
    getMediaUrlAsync(storagePath).then((remoteUrl) => {
      if (cancelled) return;
      setUrl(remoteUrl || localFallback);
    });
    return () => { cancelled = true; };
  }, [storagePath, localFallback]);

  return url;
}

/**
 * Mọi cỡ của một ảnh: { url, srcSet, small, full } — xem sourcesFor trong storage.js.
 * Không có trong kho thì dùng `localFallback` cho cả bốn.
 */
function useMediaSources(storagePath, localFallback = null) {
  const fallback = localFallback
    ? { url: localFallback, srcSet: undefined, small: localFallback, full: localFallback }
    : null;
  const [sources, setSources] = useState(fallback);

  useEffect(() => {
    let cancelled = false;
    getMediaSourcesAsync(storagePath).then((found) => {
      if (!cancelled) setSources(found || fallback);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storagePath, localFallback]);

  return sources;
}

/**
 * List all files in a storage folder.
 * Returns { files: [{ name, url }], loading }.
 */
function useMediaList(folder) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listMedia(folder)
      .then((result) => {
        if (!cancelled) {
          setFiles(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [folder]);

  return { files, loading };
}

// ═══ components/Lightbox.jsx ═══
const LightboxContext = createContext(null);

function useLightbox() {
  return useContext(LightboxContext);
}

/**
 * Lớp phủ xem ảnh toàn màn hình.
 * Mở: bấm bất kỳ ảnh nào. Đóng: nút ×, bấm nền, hoặc Esc.
 *
 * Khoá cuộn qua `lockScroll()` (SỬA 7) thay vì tự đặt `body.overflow`, vì trên
 * iOS cách cũ không chặn được cuộn bằng ngón tay.
 */
function LightboxProvider({ children }) {
  const [item, setItem] = useState(null);
  const [closing, setClosing] = useState(false);
  const [zoom, setZoom] = useState(false);
  const closeTimer = useRef(null);

  const open = useCallback((src, label) => {
    lockScroll();
    setItem({ src: src || null, label: label || '' });
    setClosing(false);
    setZoom(false);
  }, []);

  const close = useCallback(() => {
    setClosing((isClosing) => {
      if (isClosing) return isClosing;
      clearTimeout(closeTimer.current);
      closeTimer.current = setTimeout(() => {
        unlockScroll();
        setItem(null);
        setClosing(false);
        setZoom(false);
      }, 320);
      return true;
    });
  }, []);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  useEffect(() => {
    if (!item) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [item, close]);

  // SỬA 9 — trên điện thoại bỏ phóng 1.7× (phóng mà không kéo được là tệ nhất
  // trong ba lựa chọn). Khách dùng pinch-zoom gốc của trình duyệt.
  // Desktop giữ nguyên hành vi cũ.
  const toggleZoom = (e) => {
    e.stopPropagation();
    if (mqMatches(PHONE_QUERY)) return;
    setZoom((z) => !z);
  };

  return (
    <LightboxContext.Provider value={open}>
      {children}
      {item && (
        <div className={`lb-overlay ${closing ? 'closing' : ''}`} onClick={close}>
          <div className="lb-inner" onClick={(e) => e.stopPropagation()}>
            <div className="lb-frame">
              <div className={`lb-zoom ${zoom ? 'zoomed' : ''}`}>
                {item.src ? (
                  <img src={item.src} alt={item.label || ''} className="lb-img" onClick={toggleZoom} />
                ) : (
                  <div className="ph lb-placeholder" data-label={item.label} />
                )}
              </div>
            </div>
          </div>
          <button className="lb-close" onClick={close} aria-label="Đóng">×</button>
        </div>
      )}
    </LightboxContext.Provider>
  );
}

// ═══ components/MediaImage.jsx ═══
/**
 * Ảnh lấy từ Supabase Storage.
 * Chuỗi fallback: URL Supabase → localFallback → ô .ph kẻ sọc có nhãn.
 * Bấm vào mở lightbox (trừ khi clickable={false}) — lightbox luôn nhận cỡ lớn nhất.
 *
 * `sizes` cho trình duyệt biết ảnh chiếm bao rộng trên màn hình, để nó tự chọn
 * bản nén vừa đủ trong `srcset`. Thiếu `sizes` thì trình duyệt coi ảnh rộng bằng cả
 * màn hình và tải bản to hơn cần thiết.
 *
 * Style do CSS của từng section quyết định — component chỉ gắn class. Ngoại lệ là
 * khung admin đã chỉnh (`sources.fit`): gắn class `has-fit` + biến CSS, xem lib/fit.js.
 * Lightbox vẫn mở ảnh đầy đủ, khung chỉ chọn phần hiện trong ô.
 */
function MediaImage({
  storagePath,
  localFallback,
  label,
  alt = '',
  className = '',
  clickable = true,
  sizes,
  loading = 'lazy',
}) {
  const sources = useMediaSources(storagePath, localFallback);
  // 0 = bản nén · 1 = lùi về ảnh gốc · 2 = hỏng hẳn, hiện ô kẻ sọc
  const [stage, setStage] = useState(0);
  const openLightbox = useLightbox();

  const useOriginal = stage === 1 || !sources?.srcSet;
  const src = stage === 2 ? null : (useOriginal ? (sources?.original || sources?.url) : sources?.url);
  const handleClick = clickable && openLightbox ? () => openLightbox(sources?.full || src, label) : undefined;
  const interactive = handleClick
    ? { onClick: handleClick, role: 'button', tabIndex: 0 }
    : {};

  if (!src) {
    return <div className={`ph ${className}`.trim()} data-label={label} {...interactive} />;
  }

  return (
    <img
      src={src}
      srcSet={useOriginal ? undefined : sources.srcSet}
      sizes={useOriginal ? undefined : sizes}
      alt={alt || label || ''}
      {...fitProps(sources?.fit, className)}
      // Bản nén lỗi thì thử ảnh gốc một lần, rồi mới chịu hiện ô kẻ sọc
      onError={() => setStage((n) => (n === 0 && sources?.srcSet ? 1 : 2))}
      loading={loading}
      decoding="async"
      {...interactive}
    />
  );
}

// ═══ components/ErrorBoundary.jsx ═══
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('React error boundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '"Cormorant Garamond", serif',
          color: '#6B5E5B',
          textAlign: 'center',
          padding: 40,
        }}>
          <div>
            <h1 style={{ fontSize: 48, fontWeight: 400, margin: '0 0 12px' }}>Hiếu &amp; Minh</h1>
            <p style={{ fontStyle: 'italic', color: '#A89996' }}>
              Trang web đang được cập nhật. Vui lòng quay lại sau.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ═══ adult/AdultRSVP.jsx ═══
const NOTE_MAX = 300; // = ràng buộc rsvps_message_len
const isRateLimited = (err) => err?.code === 'P0001' && err?.message === 'rate_limited';

/**
 * Xác nhận của trang /adult: chỉ họ tên + tham dự / không + lời nhắn tuỳ ý.
 * Không hỏi SĐT, số người, nhà trai / nhà gái (chủ thiệp chọn, 2026-11-17).
 *
 * Ghi vào `rsvps` với audience = 'adult'; side / guest_count / phone để trống.
 * Khác trang chính: lời TỪ CHỐI cũng được ghi (attending = false) để bố mẹ biết ai không
 * đến. Không gọi .select() sau insert (anon không có quyền đọc). Lỗi mạng: vẫn cảm ơn
 * như trang chính, ghi log; bị chặn spam (rate_limited) thì báo thử lại sau.
 */
function AdultRSVP({ config }) {
  const [name, setName] = useState('');
  const [attending, setAttending] = useState(null); // true | false | null
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(null); // null | 'yes' | 'no'
  const [limited, setLimited] = useState(false);
  const d = formatDateParts(config.weddingDate);

  const ready = name.trim() && attending !== null;
  const missing = !name.trim() && attending === null
    ? 'Xin Quý khách điền họ tên và chọn tham dự hay không'
    : !name.trim() ? 'Xin Quý khách điền họ tên'
      : attending === null ? 'Xin Quý khách chọn tham dự hay không' : '';

  const submit = async (e) => {
    e.preventDefault();
    if (sending || !ready) return;
    setSending(true);
    setLimited(false);
    const row = {
      name: name.trim().slice(0, 120),
      attending,
      audience: 'adult',
      message: note.trim().slice(0, NOTE_MAX) || null,
    };
    try {
      const { error } = await supabase.from('rsvps').insert(row);
      if (error) throw error;
    } catch (err) {
      if (isRateLimited(err)) { setSending(false); setLimited(true); return; }
      console.error('[adult-rsvp] insert failed', err);
    }
    setSending(false);
    setSent(attending ? 'yes' : 'no');
  };

  return (
    <section className="a-rsvp" id="xac-nhan" aria-labelledby="a-rsvp-title">
      <p className="a-eyebrow">Xác nhận tham dự</p>
      <h2 id="a-rsvp-title" className="a-rsvp-title">Kính mong Quý khách hồi âm</h2>
      <p className="a-rsvp-lead">
        Để gia đình chúng tôi được chu đáo đón tiếp, xin Quý khách vui lòng cho biết
        có thể tới dự hay không.
      </p>

      {sent ? (
        <div className="a-thanks" role="status">
          <img src="./assets/medallion-gold.png" alt="" />
          {sent === 'yes' ? (
            <>
              <h3>Trân trọng cảm ơn Quý khách</h3>
              <p>
                Gia đình chúng tôi rất hân hạnh được đón tiếp Quý khách
                vào {config.weddingTime} ngày {d.dd}.{d.mm}.{d.yyyy} tại {config.venueName}.
              </p>
            </>
          ) : (
            <>
              <h3>Trân trọng cảm ơn Quý khách đã hồi âm</h3>
              <p>Gia đình chúng tôi xin ghi nhận và cảm ơn tình cảm Quý khách đã dành cho các con.</p>
            </>
          )}
          <button type="button" className="a-link" onClick={() => setSent(null)}>Sửa lại xác nhận</button>
        </div>
      ) : (
        <form className="a-form" onSubmit={submit} noValidate>
          <label className="a-field">
            <span className="a-label">Họ và tên <i aria-hidden="true">*</i></span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              autoComplete="name"
              enterKeyHint="next"
              placeholder="Ví dụ: Nguyễn Văn An"
              required
            />
          </label>

          <fieldset className="a-field a-choice">
            <legend className="a-label">Quý khách có thể tới dự? <i aria-hidden="true">*</i></legend>
            <div className="a-choice-row" role="radiogroup">
              <button
                type="button"
                role="radio"
                aria-checked={attending === true}
                className={`a-opt ${attending === true ? 'on' : ''}`}
                onClick={() => setAttending(true)}
              >
                Tôi sẽ tham dự
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={attending === false}
                className={`a-opt ${attending === false ? 'on' : ''}`}
                onClick={() => setAttending(false)}
              >
                Rất tiếc, tôi không thể đến
              </button>
            </div>
          </fieldset>

          <label className="a-field">
            <span className="a-label">Lời nhắn gửi gia đình <small>(không bắt buộc)</small></span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
              rows={3}
              placeholder="Lời chúc hoặc điều Quý khách muốn nhắn"
            />
            <span className="a-count">{note.length}/{NOTE_MAX}</span>
          </label>

          {limited && (
            <p className="a-alert" role="alert">
              Quý khách đã gửi nhiều lần trong ít phút. Xin vui lòng thử lại sau ít phút.
            </p>
          )}

          <button type="submit" className="a-btn a-btn-red a-submit" disabled={!ready || sending}>
            {sending ? 'Đang gửi…' : 'Gửi xác nhận'}
          </button>
          {!ready && <p className="a-hint">{missing}</p>}
        </form>
      )}
    </section>
  );
}

// ═══ adult/AdultApp.jsx ═══
/**
 * Trang /adult (2026-11-17): thiệp BỐ MẸ HAI BÊN gửi đồng nghiệp, cấp trên, bạn bè của
 * mình. Giọng trang trọng ("Quý khách", "gia đình chúng tôi"), đi thẳng vào thiệp mời rồi
 * xác nhận; một ảnh cưới; không nhạc, không lịch trình, không đếm ngược.
 *
 * Tách hẳn khỏi trang chính: class `a-` trong adult.css, không phụ thuộc PHONE_QUERY,
 * nạp lười (main.jsx) nên khách trang chính không tải trang này.
 * Dữ liệu: site_config (tên, ngày, giờ, nơi tổ chức, bản đồ) + family_members (tên bố mẹ).
 * Xác nhận ghi vào `rsvps` với audience = 'adult' (xem AdultRSVP.jsx).
 */

// family_members.role_label ("Cha"/"Mẹ") → cách xưng trên thiệp bố mẹ gửi
const HONORIFIC = { Cha: 'Ông', Bố: 'Ông', Mẹ: 'Bà' };

function useParents() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    supabase
      .from('family_members')
      .select('side, role_label, name_vi, sort_order')
      .order('sort_order')
      .then(({ data }) => { if (data) setRows(data); })
      .catch(() => {});
  }, []);
  const pick = (side) => rows
    .filter((r) => r.side === side)
    .map((r) => ({ title: HONORIFIC[r.role_label] || r.role_label, name: r.name_vi }));
  return { groom: pick('groom'), bride: pick('bride') };
}

function timeWords(hhmm) {
  const [h, m] = (hhmm || '').split(':');
  return h ? `${Number(h)} giờ ${m || '00'}` : '';
}

function ParentsCol({ label, people }) {
  return (
    <div className="a-house">
      <span className="a-house-label">{label}</span>
      {people.length
        ? people.map((p) => (
          <span key={p.title + p.name} className="a-house-name"><small>{p.title}</small> {p.name}</span>
        ))
        : <span className="a-house-name a-dim">—</span>}
    </div>
  );
}

function AdultApp() {
  const { config, siteText, manifest, loading } = useSiteConfig();
  if (!loading) setManifest(manifest); // như App.jsx: nạp bản kê trước khi MediaImage render
  const parents = useParents();
  const d = formatDateParts(config.weddingDate);

  useEffect(() => {
    document.title = `Thiệp mời · ${config.groomShort} & ${config.brideShort}`;
  }, [config.groomShort, config.brideShort]);

  const toRsvp = (e) => {
    e.preventDefault();
    document.getElementById('xac-nhan')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <LightboxProvider>
      <main className="a-page">
        {/* ── Thiệp mời ─────────────────────────────────────────── */}
        <section className="a-card" id="thiep-moi" aria-label="Thiệp mời">
          <span className="a-corner tl" aria-hidden="true" /><span className="a-corner tr" aria-hidden="true" />
          <span className="a-corner bl" aria-hidden="true" /><span className="a-corner br" aria-hidden="true" />

          <img className="a-seal" src="./assets/medallion-gold.png" alt="" />
          <p className="a-eyebrow">Thiệp mời</p>

          <div className="a-houses">
            <ParentsCol label="Nhà trai" people={parents.groom} />
            <ParentsCol label="Nhà gái" people={parents.bride} />
          </div>

          <p className="a-lead">Trân trọng báo tin lễ thành hôn của con chúng tôi</p>

          <h1 className="a-couple">
            <span className="a-person"><small>Chú rể</small>{config.groomName}</span>
            <span className="a-amp" aria-hidden="true">&amp;</span>
            <span className="a-person"><small>Cô dâu</small>{config.brideName}</span>
          </h1>

          <p className="a-invite">
            Trân trọng kính mời <strong>Quý khách</strong><br />
            tới dự bữa tiệc chung vui cùng gia đình chúng tôi
          </p>

          <div className="a-when">
            <span className="a-when-time">Vào hồi {timeWords(config.weddingTime)} · {d.weekday}</span>
            <span className="a-when-date">{d.dd} · {d.mm} · {d.yyyy}</span>
          </div>

          <div className="a-where">
            <span className="a-where-name">{config.venueName}</span>
            <span className="a-where-addr">{config.venueAddress}</span>
          </div>

          <div className="a-actions">
            {config.mapUrl && (
              <a className="a-btn a-btn-ghost" href={config.mapUrl} target="_blank" rel="noopener noreferrer">Xem bản đồ</a>
            )}
            <a className="a-btn a-btn-red" href="#xac-nhan" onClick={toRsvp}>Xác nhận tham dự</a>
          </div>

          <p className="a-honor">Sự hiện diện của Quý khách là niềm vinh hạnh cho gia đình chúng tôi.</p>
        </section>

        {/* ── Một ảnh cưới ──────────────────────────────────────── */}
        <figure className="a-photo">
          <div className="a-photo-frame">
            <MediaImage
              storagePath="background/moment-2.jpg"
              label={`${config.groomShort} và ${config.brideShort}`}
              alt={`${config.groomShort} và ${config.brideShort}`}
              sizes="(max-width: 600px) 92vw, 520px"
            />
          </div>
        </figure>

        {/* ── Xác nhận ──────────────────────────────────────────── */}
        <AdultRSVP config={config} siteText={siteText} />

        <footer className="a-foot">
          <img src="./assets/medallion-gold.png" alt="" loading="lazy" />
          <p>Gia đình hai họ trân trọng cảm ơn</p>
          <span>{config.groomShort} &amp; {config.brideShort} · {d.dd}.{d.mm}.{d.yyyy}</span>
        </footer>
      </main>
    </LightboxProvider>
  );
}

// ═══ main.jsx — PORT: production là <Route path="/adult"> nạp lười trong react-router ═══
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AdultApp />
    </ErrorBoundary>
  </React.StrictMode>
);
