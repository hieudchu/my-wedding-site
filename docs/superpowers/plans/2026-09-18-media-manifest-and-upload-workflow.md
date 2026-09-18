# Bản kê media và luồng upload — kế hoạch triển khai

> **Cho người thực thi:** dùng `superpowers:subagent-driven-development` hoặc
> `superpowers:executing-plans` để làm từng task một. Các bước dùng checkbox để theo dõi.

**Mục tiêu:** Khách chỉ cần **một** lượt gọi mạng để biết toàn bộ danh sách ảnh, thay vì 14 lượt như hiện nay; và chủ nhà upload ảnh nhanh hơn, thấy ngay mình chọn đúng ảnh chưa, sắp thứ tự bằng kéo thả.

**Kiến trúc:** Admin ghi sẵn một **bản kê** (JSON) vào `site_config` mỗi khi thay đổi media. Trang khách đọc bản kê đó trong chính truy vấn `site_config` vốn đã gọi, nên không phát sinh lượt gọi nào. Kho file vẫn là sự thật; bản kê chỉ là bản sao cho nhanh, và admin có nút dựng lại từ kho.

**Công nghệ:** React 18, Vite 5, Supabase JS v2, Vitest (thêm mới trong Task 1).

**Phạm vi giao diện:** trang khách **không đổi gì về hình thức** — chỉ nhanh hơn và
hết nhảy khổ thẻ carousel. Trang admin **có thêm UI mới**: thumbnail tức thì, dòng
tiến độ, kéo thả sắp thứ tự, nút quét lại kho.

**Spec:** `docs/superpowers/specs/2026-09-18-backend-media-r2-design.md` — đợt 1 làm các mục 4.1, 4.3, 4.6. Mục 4.2, 4.4, 4.5 (R2, WebP) thuộc đợt 2, **không làm trong kế hoạch này**.

## Ràng buộc chung

- Giữ nguyên ba chữ ký `getMediaUrlAsync(path)`, `getMediaUrl(path)`, `listMedia(folder)` trong `app/src/lib/storage.js` — 9 component đang dùng, không được sửa chúng.
- Bản kê cất trong `site_config` với khoá `media_manifest`, giá trị là chuỗi JSON.
- Kho file là sự thật. Bản kê hỏng hoặc lệch thì phải dựng lại được từ kho.
- Thư mục media: `carousel`, `portraits`, `background`, `icons`, `music`, `timeline`.
- Toàn bộ chữ hiển thị cho người dùng bằng tiếng Việt.
- Mọi thay đổi phải qua `npm run build` sạch trước khi commit.

---

## Cấu trúc file

| File | Trách nhiệm |
|---|---|
| `app/src/lib/mediaManifest.js` *(tạo mới)* | Logic thuần về bản kê: đọc, dựng, sửa, ghi ra chuỗi |
| `app/src/lib/mediaManifest.test.js` *(tạo mới)* | Test cho trên |
| `app/src/lib/uploadQueue.js` *(tạo mới)* | Chạy nhiều việc song song có giới hạn, báo tiến độ |
| `app/src/lib/uploadQueue.test.js` *(tạo mới)* | Test cho trên |
| `app/src/lib/storage.js` *(sửa)* | Bỏ gọi trùng; ưu tiên đọc bản kê |
| `app/src/hooks/useSiteConfig.js` *(sửa)* | Trả thêm `manifest` |
| `app/src/App.jsx` *(sửa)* | Nạp bản kê vào tầng lưu trữ khi có |
| `app/src/components/Hero.jsx` *(sửa)* | Lấy `w`/`h` từ bản kê, hết nhảy khổ thẻ |
| `app/src/admin/sections/MediaManager.jsx` *(sửa)* | Upload song song, thumbnail tức thì, kéo thả, ghi bản kê, nút quét lại |
| `app/package.json`, `app/vite.config.js` *(sửa)* | Thêm Vitest |

---

## Task 1: Dựng hạ tầng test

Repo hiện **không có test nào**. Các task sau cần chỗ để viết test, nên dựng trước.

**Files:**
- Modify: `app/package.json`
- Modify: `app/vite.config.js`
- Test: `app/src/lib/smoke.test.js` (tạo rồi xoá ở bước cuối)

- [ ] **Bước 1: Cài Vitest**

```bash
cd app && npm install -D vitest@2
```

- [ ] **Bước 2: Thêm script test vào `app/package.json`**

Trong khối `"scripts"`, thêm dòng:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Bước 3: Bật môi trường test trong `app/vite.config.js`**

Thêm khối `test` vào object truyền cho `defineConfig`:

```js
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
```

- [ ] **Bước 4: Viết một test tạm để xác nhận bộ chạy hoạt động**

Tạo `app/src/lib/smoke.test.js`:

```js
import { describe, it, expect } from 'vitest';

describe('bộ chạy test', () => {
  it('chạy được', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Bước 5: Chạy và xác nhận PASS**

Chạy: `cd app && npm test`
Mong đợi: 1 test passed.

- [ ] **Bước 6: Xoá test tạm và commit**

```bash
cd app && rm src/lib/smoke.test.js
git add app/package.json app/package-lock.json app/vite.config.js
git commit -m "Add Vitest so the logic in this repo can be tested"
```

---

## Task 2: Module bản kê

**Files:**
- Create: `app/src/lib/mediaManifest.js`
- Test: `app/src/lib/mediaManifest.test.js`

**Interfaces — Produces:**

```js
emptyManifest()                          // → { version: 1, folders: {} }
parseManifest(raw)                       // chuỗi JSON | null | rác → bản kê hợp lệ
serializeManifest(m)                     // → chuỗi JSON
listFolder(m, folder)                    // → mảng entry theo đúng thứ tự
findEntry(m, path)                       // 'carousel/a.jpg' → entry | null
withEntry(m, folder, entry)              // thêm mới hoặc thay entry cùng tên file
withoutEntry(m, folder, file)            // → bản kê đã bỏ entry
withOrder(m, folder, ids)                // sắp lại theo mảng id
buildFromListing(listingByFolder)        // dựng lại từ kho
```

Mỗi entry: `{ id, file, v, w, h, caption }`. `v` là mốc sửa đổi (giây), dùng cho `?v=`. `w`/`h` là kích thước ảnh, `0` nếu không biết (ví dụ file nhạc).

- [ ] **Bước 1: Viết test trước**

Tạo `app/src/lib/mediaManifest.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
  emptyManifest, parseManifest, serializeManifest, listFolder,
  findEntry, withEntry, withoutEntry, withOrder, buildFromListing,
} from './mediaManifest';

const entry = (file, id) => ({ id, file, v: 100, w: 800, h: 1200, caption: '' });

describe('parseManifest', () => {
  it('trả bản kê rỗng khi không có gì', () => {
    expect(parseManifest(null)).toEqual(emptyManifest());
    expect(parseManifest('')).toEqual(emptyManifest());
  });

  it('không ném lỗi khi gặp JSON hỏng', () => {
    expect(parseManifest('{ hỏng')).toEqual(emptyManifest());
  });

  it('bỏ qua thư mục không phải mảng', () => {
    const m = parseManifest(JSON.stringify({ version: 1, folders: { carousel: 'sai' } }));
    expect(listFolder(m, 'carousel')).toEqual([]);
  });

  it('đọc lại đúng thứ tự đã ghi', () => {
    const m = { version: 1, folders: { carousel: [entry('b.jpg', '2'), entry('a.jpg', '1')] } };
    const back = parseManifest(serializeManifest(m));
    expect(listFolder(back, 'carousel').map((e) => e.file)).toEqual(['b.jpg', 'a.jpg']);
  });
});

describe('findEntry', () => {
  const m = { version: 1, folders: { portraits: [entry('bride.jpg', 'x')] } };

  it('tìm được theo đường dẫn đầy đủ', () => {
    expect(findEntry(m, 'portraits/bride.jpg').id).toBe('x');
  });

  it('trả null khi không có', () => {
    expect(findEntry(m, 'portraits/groom.jpg')).toBeNull();
    expect(findEntry(m, '')).toBeNull();
    expect(findEntry(m, undefined)).toBeNull();
  });
});

describe('withEntry', () => {
  it('thêm vào cuối thư mục', () => {
    const m = withEntry(emptyManifest(), 'carousel', entry('a.jpg', '1'));
    expect(listFolder(m, 'carousel')).toHaveLength(1);
  });

  it('thay entry cùng tên file, giữ nguyên vị trí', () => {
    let m = withEntry(emptyManifest(), 'carousel', entry('a.jpg', '1'));
    m = withEntry(m, 'carousel', entry('b.jpg', '2'));
    m = withEntry(m, 'carousel', { ...entry('a.jpg', '1'), v: 999 });
    const files = listFolder(m, 'carousel');
    expect(files.map((e) => e.file)).toEqual(['a.jpg', 'b.jpg']);
    expect(files[0].v).toBe(999);
  });

  it('không sửa bản kê cũ', () => {
    const before = emptyManifest();
    withEntry(before, 'carousel', entry('a.jpg', '1'));
    expect(listFolder(before, 'carousel')).toEqual([]);
  });
});

describe('withoutEntry', () => {
  it('bỏ đúng entry', () => {
    let m = withEntry(emptyManifest(), 'carousel', entry('a.jpg', '1'));
    m = withEntry(m, 'carousel', entry('b.jpg', '2'));
    m = withoutEntry(m, 'carousel', 'a.jpg');
    expect(listFolder(m, 'carousel').map((e) => e.file)).toEqual(['b.jpg']);
  });
});

describe('withOrder', () => {
  it('sắp lại theo mảng id', () => {
    let m = withEntry(emptyManifest(), 'carousel', entry('a.jpg', '1'));
    m = withEntry(m, 'carousel', entry('b.jpg', '2'));
    m = withOrder(m, 'carousel', ['2', '1']);
    expect(listFolder(m, 'carousel').map((e) => e.file)).toEqual(['b.jpg', 'a.jpg']);
  });

  it('id lạ thì bỏ qua, entry thiếu thì dồn về cuối', () => {
    let m = withEntry(emptyManifest(), 'carousel', entry('a.jpg', '1'));
    m = withEntry(m, 'carousel', entry('b.jpg', '2'));
    m = withOrder(m, 'carousel', ['2', 'khong-ton-tai']);
    expect(listFolder(m, 'carousel').map((e) => e.file)).toEqual(['b.jpg', 'a.jpg']);
  });
});

describe('buildFromListing', () => {
  it('dựng lại từ kho, giữ caption cũ nếu truyền vào', () => {
    const listing = {
      carousel: [{ name: 'a.jpg', updated_at: '2026-01-01T00:00:00Z' }],
    };
    const old = withEntry(emptyManifest(), 'carousel', { ...entry('a.jpg', '1'), caption: 'giữ lại' });
    const m = buildFromListing(listing, old);
    const e = listFolder(m, 'carousel')[0];
    expect(e.file).toBe('a.jpg');
    expect(e.caption).toBe('giữ lại');
    expect(e.v).toBe(Math.floor(Date.parse('2026-01-01T00:00:00Z') / 1000));
  });
});
```

- [ ] **Bước 2: Chạy test, xác nhận FAIL**

Chạy: `cd app && npm test`
Mong đợi: FAIL vì `./mediaManifest` chưa tồn tại.

- [ ] **Bước 3: Viết `app/src/lib/mediaManifest.js`**

```js
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
```

- [ ] **Bước 4: Chạy test, xác nhận PASS**

Chạy: `cd app && npm test`
Mong đợi: toàn bộ test trong `mediaManifest.test.js` passed.

- [ ] **Bước 5: Commit**

```bash
git add app/src/lib/mediaManifest.js app/src/lib/mediaManifest.test.js
git commit -m "Add the media manifest module

Pure functions over the list of media files, so the guest page can learn what
exists in one round trip instead of asking storage folder by folder."
```

---

## Task 3: Bỏ gọi trùng trong tầng lưu trữ

Đo trên trang đang chạy: 10 lượt liệt kê thư mục, khoảng 4 lượt trùng nhau. Nguyên nhân là `getCachedFolder` chỉ ghi cache **sau khi** có kết quả, nên bốn component cùng hỏi `icons` một lúc thì bốn lượt gọi cùng bay đi.

**Files:**
- Modify: `app/src/lib/storage.js`
- Test: `app/src/lib/storage.test.js` (tạo mới)

- [ ] **Bước 1: Viết test trước**

Tạo `app/src/lib/storage.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';

const listMock = vi.fn();

vi.mock('./supabase', () => ({
  supabaseConfigured: true,
  supabase: {
    storage: {
      from: () => ({
        list: listMock,
        getPublicUrl: (p) => ({ data: { publicUrl: `https://kho.test/${p}` } }),
      }),
    },
  },
}));

describe('getMediaUrlAsync', () => {
  beforeEach(() => {
    vi.resetModules();
    listMock.mockReset();
  });

  it('bốn lời gọi cùng lúc cho một thư mục chỉ tạo MỘT lượt liệt kê', async () => {
    listMock.mockImplementation(
      () => new Promise((r) => setTimeout(() => r({
        data: [{ name: 'medallion-ink.png', updated_at: '2026-01-01T00:00:00Z' }],
        error: null,
      }), 10))
    );
    const { getMediaUrlAsync } = await import('./storage');

    const urls = await Promise.all([
      getMediaUrlAsync('icons/medallion-ink.png'),
      getMediaUrlAsync('icons/medallion-ink.png'),
      getMediaUrlAsync('icons/medallion-ink.png'),
      getMediaUrlAsync('icons/medallion-ink.png'),
    ]);

    expect(listMock).toHaveBeenCalledTimes(1);
    expect(urls[0]).toContain('icons/medallion-ink.png');
    expect(urls.every((u) => u === urls[0])).toBe(true);
  });

  it('liệt kê hỏng thì không nhớ kết quả hỏng vĩnh viễn', async () => {
    listMock.mockResolvedValueOnce({ data: null, error: new Error('mạng lỗi') });
    const { getMediaUrlAsync } = await import('./storage');

    expect(await getMediaUrlAsync('icons/medallion-ink.png')).toBeNull();

    listMock.mockResolvedValueOnce({
      data: [{ name: 'medallion-ink.png', updated_at: '2026-01-01T00:00:00Z' }],
      error: null,
    });
    expect(await getMediaUrlAsync('icons/medallion-ink.png')).toContain('medallion-ink.png');
  });
});
```

- [ ] **Bước 2: Chạy test, xác nhận FAIL**

Chạy: `cd app && npm test -- storage`
Mong đợi: test đầu FAIL với `expected 1, received 4`.

- [ ] **Bước 3: Sửa `app/src/lib/storage.js`**

Đổi `getCachedFolder` sang nhớ **lời hứa** thay vì nhớ kết quả, và xoá lời hứa hỏng để lần sau còn thử lại:

```js
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
    return files;
  })();

  // Hỏng thì quên đi, để lần sau còn thử lại thay vì nhớ mãi cái rỗng
  const guarded = pending.catch(() => {
    folderCache.delete(folder);
    return new Map();
  });

  folderCache.set(folder, guarded);
  return guarded;
}
```

Các hàm gọi `getCachedFolder` đang dùng `await` nên không phải sửa. Riêng `getMediaUrl` (bản đồng bộ) đọc thẳng `folderCache.get(folder)` — nay giá trị là lời hứa, nên phải đổi: giữ thêm một `Map` kết quả đã xong (`resolvedCache`), ghi vào trong `pending` khi thành công, và `getMediaUrl` đọc `resolvedCache`.

```js
const resolvedCache = new Map();   // folder -> Map(tên → version), chỉ có khi đã xong
```

Trong `pending`, ngay trước `return files;` thêm `resolvedCache.set(folder, files);`
Trong `getMediaUrl`, đổi `folderCache` thành `resolvedCache`.

- [ ] **Bước 4: Chạy test, xác nhận PASS**

Chạy: `cd app && npm test`
Mong đợi: tất cả passed.

- [ ] **Bước 5: Build và commit**

```bash
cd app && npm run build
git add app/src/lib/storage.js app/src/lib/storage.test.js
git commit -m "Stop firing duplicate folder listings

Four components asking for the icons folder at once produced four identical
requests, because the cache was written only after a reply came back. Caching
the promise makes them share one."
```

---

## Task 4: Trang khách đọc bản kê

**Files:**
- Modify: `app/src/hooks/useSiteConfig.js`
- Modify: `app/src/lib/storage.js`
- Modify: `app/src/App.jsx`

**Interfaces — Consumes:** `parseManifest`, `findEntry`, `listFolder` (Task 2).
**Produces:** `useSiteConfig()` trả thêm `manifest`; `storage.js` xuất thêm `setManifest(manifest)`.

- [ ] **Bước 1: `useSiteConfig` trả thêm bản kê**

Trong `app/src/hooks/useSiteConfig.js`, thêm import và state:

```js
import { parseManifest, emptyManifest } from '../lib/mediaManifest';
```

```js
  const [manifest, setManifest] = useState(emptyManifest());
```

Trong vòng lặp đọc `data`, sau khi gán `texts[row.key] = row.value;` thêm:

```js
        if (row.key === 'media_manifest') {
          setManifest(parseManifest(row.value));
        }
```

Và đổi dòng cuối thành:

```js
  return { config, siteText, manifest, loading };
```

- [ ] **Bước 2: `storage.js` ưu tiên bản kê**

Thêm vào đầu file:

```js
import { findEntry, listFolder, emptyManifest } from './mediaManifest';

let manifest = emptyManifest();

/** App nạp bản kê vào đây ngay khi nội dung chữ về. */
export function setManifest(next) {
  manifest = next || emptyManifest();
}
```

Trong `getMediaUrlAsync`, **trước** khi gọi `getCachedFolder`:

```js
  const known = findEntry(manifest, path);
  if (known) return buildPublicUrl(path, known.v);
```

Trong `listMedia`, **trước** khi gọi `getCachedFolder`:

```js
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
```

Bản kê rỗng thì rơi xuống đường cũ — nên trang vẫn chạy y như hiện nay trước khi admin ghi bản kê lần đầu.

- [ ] **Bước 3: `App.jsx` nạp bản kê**

```js
import { setManifest } from './lib/storage';
```

```js
  const { config, siteText, manifest } = useSiteConfig();
  setManifest(manifest);
```

Gọi thẳng trong thân component (không đặt trong `useEffect`) để tầng lưu trữ có bản kê **trước** lượt render đầu tiên của các component con.

- [ ] **Bước 4: Build và kiểm tra bằng mắt**

```bash
cd app && npm run build
```

Chạy `npm run dev`, mở trang, xác nhận ảnh vẫn hiện bình thường (bản kê còn rỗng nên đi đường cũ).

- [ ] **Bước 5: Commit**

```bash
git add app/src/hooks/useSiteConfig.js app/src/lib/storage.js app/src/App.jsx
git commit -m "Read media from the manifest when there is one

Falls back to listing storage while the manifest is empty, so nothing changes
for guests until the admin writes one."
```

---

## Task 5: Hero lấy kích thước từ bản kê

Hiện `Hero` phải đợi `onLoad` mới biết ảnh dọc hay ngang để tính khổ thẻ, nên thẻ đổi kích thước sau khi ảnh tải xong.

**Files:**
- Modify: `app/src/components/Hero.jsx`

- [ ] **Bước 1: Dùng `w`/`h` từ bản kê làm giá trị ban đầu**

`listMedia` (Task 4) nay trả kèm `w`/`h`. Trong `Hero`, đổi khởi tạo `orient`:

```js
  const [orient, setOrient] = useState({});

  // Bản kê đã biết kích thước từ lúc upload — dùng ngay, khỏi đợi ảnh tải xong
  useEffect(() => {
    const known = {};
    photos.forEach((p, k) => {
      if (p.w && p.h) known[k + 1] = p.w > p.h ? 'l' : 'p';
    });
    if (Object.keys(known).length) setOrient((prev) => ({ ...known, ...prev }));
  }, [photos]);
```

Giữ nguyên `onImgLoad` làm đường dự phòng cho ảnh chưa có trong bản kê.

- [ ] **Bước 2: Build**

```bash
cd app && npm run build
```

- [ ] **Bước 3: Commit**

```bash
git add app/src/components/Hero.jsx
git commit -m "Size carousel cards from the manifest instead of waiting for onLoad"
```

---

## Task 6: Hàng đợi upload song song

**Files:**
- Create: `app/src/lib/uploadQueue.js`
- Test: `app/src/lib/uploadQueue.test.js`

**Interfaces — Produces:**

```js
runQueue(items, worker, { concurrency = 3, onProgress })
// worker: (item, index) => Promise<any>
// onProgress: ({ done, total, item, ok, error }) => void
// → Promise<Array<{ item, ok, value?, error? }>>  — theo đúng thứ tự items
```

- [ ] **Bước 1: Viết test trước**

Tạo `app/src/lib/uploadQueue.test.js`:

```js
import { describe, it, expect, vi } from 'vitest';
import { runQueue } from './uploadQueue';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

describe('runQueue', () => {
  it('không bao giờ chạy quá số luồng cho phép', async () => {
    let now = 0;
    let peak = 0;
    const items = [1, 2, 3, 4, 5, 6, 7];
    await runQueue(items, async () => {
      now++; peak = Math.max(peak, now);
      await wait(5);
      now--;
    }, { concurrency: 3 });
    expect(peak).toBe(3);
  });

  it('trả kết quả đúng thứ tự đầu vào dù xong lộn xộn', async () => {
    const items = [30, 5, 15];
    const res = await runQueue(items, async (ms) => { await wait(ms); return ms; }, { concurrency: 3 });
    expect(res.map((r) => r.value)).toEqual([30, 5, 15]);
  });

  it('một việc hỏng không làm sập cả mẻ', async () => {
    const res = await runQueue([1, 2, 3], async (n) => {
      if (n === 2) throw new Error('hỏng');
      return n;
    }, { concurrency: 2 });
    expect(res.map((r) => r.ok)).toEqual([true, false, true]);
    expect(res[1].error.message).toBe('hỏng');
  });

  it('báo tiến độ đủ số lần', async () => {
    const onProgress = vi.fn();
    await runQueue([1, 2, 3], async (n) => n, { concurrency: 2, onProgress });
    expect(onProgress).toHaveBeenCalledTimes(3);
    expect(onProgress.mock.calls[2][0]).toMatchObject({ done: 3, total: 3 });
  });

  it('danh sách rỗng thì trả mảng rỗng', async () => {
    expect(await runQueue([], async () => 1, {})).toEqual([]);
  });
});
```

- [ ] **Bước 2: Chạy test, xác nhận FAIL**

Chạy: `cd app && npm test -- uploadQueue`
Mong đợi: FAIL vì file chưa tồn tại.

- [ ] **Bước 3: Viết `app/src/lib/uploadQueue.js`**

```js
/**
 * Chạy nhiều việc song song nhưng có giới hạn, và báo tiến độ.
 *
 * Admin đang upload tuần tự từng file một; với 30 ảnh thì ngồi chờ vài phút mà
 * màn hình chỉ hiện chữ "Uploading…" đứng im. Ba luồng là đủ nhanh mà không làm
 * nghẽn mạng nhà hay bị kho chặn vì gọi quá dày.
 */
export async function runQueue(items, worker, { concurrency = 3, onProgress } = {}) {
  const list = Array.from(items || []);
  const results = new Array(list.length);
  if (!list.length) return results;

  let next = 0;
  let done = 0;

  async function lane() {
    while (true) {
      const i = next++;
      if (i >= list.length) return;
      const item = list[i];
      try {
        const value = await worker(item, i);
        results[i] = { item, ok: true, value };
      } catch (error) {
        results[i] = { item, ok: false, error };
      }
      done++;
      onProgress?.({ done, total: list.length, item, ok: results[i].ok, error: results[i].error });
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, list.length) }, lane));
  return results;
}
```

- [ ] **Bước 4: Chạy test, xác nhận PASS**

Chạy: `cd app && npm test`
Mong đợi: tất cả passed.

- [ ] **Bước 5: Commit**

```bash
git add app/src/lib/uploadQueue.js app/src/lib/uploadQueue.test.js
git commit -m "Add a bounded parallel queue with progress reporting"
```

---

## Task 7: MediaManager — upload song song, thumbnail tức thì, ghi bản kê

**Files:**
- Modify: `app/src/admin/sections/MediaManager.jsx`

**Interfaces — Consumes:** `runQueue` (Task 6), `compressImage` (đã có), `withEntry`, `withoutEntry`, `serializeManifest`, `parseManifest` (Task 2).

- [ ] **Bước 1: Thêm import**

```js
import { runQueue } from '../../lib/uploadQueue';
import {
  parseManifest, serializeManifest, withEntry, withoutEntry,
} from '../../lib/mediaManifest';
```

- [ ] **Bước 2: Hàm đọc và ghi bản kê**

Thêm vào `MultiFileManager`:

```js
  const loadManifest = async () => {
    const { data } = await supabase
      .from('site_config').select('value').eq('key', 'media_manifest').maybeSingle();
    return parseManifest(data?.value);
  };

  const saveManifest = async (m) => {
    await supabase.from('site_config').upsert(
      {
        key: 'media_manifest',
        value: serializeManifest(m),
        section: 'media',
        label: 'Bản kê media (trang tự ghi)',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );
  };
```

- [ ] **Bước 3: Đo kích thước ảnh ngay khi nén**

Thêm hàm phụ trong cùng file:

```js
  // Đọc kích thước từ chính file đã nén, để bản kê biết ảnh dọc hay ngang
  const measure = (file) =>
    new Promise((resolve) => {
      if (!file.type.startsWith('image/')) return resolve({ w: 0, h: 0 });
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { resolve({ w: img.naturalWidth, h: img.naturalHeight }); URL.revokeObjectURL(url); };
      img.onerror = () => { resolve({ w: 0, h: 0 }); URL.revokeObjectURL(url); };
      img.src = url;
    });
```

- [ ] **Bước 4: Thay `handleUpload` bằng bản song song có tiến độ**

```js
  const [progress, setProgress] = useState(null);   // { done, total } | null

  const handleUpload = async (e) => {
    const selected = Array.from(e.target.files);
    if (!selected.length) return;
    setUploading(true);
    setProgress({ done: 0, total: selected.length });

    // Hiện thumbnail ngay từ file cục bộ, không đợi mạng
    setPending(selected.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })));

    let manifest = await loadManifest();
    let savedBytes = 0;

    const results = await runQueue(
      selected,
      async (picked) => {
        const file = await compressImage(picked);
        savedBytes += Math.max(0, picked.size - file.size);
        const { w, h } = await measure(file);
        const path = `${config.folder}/${file.name}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
        if (error) throw error;
        return { file: file.name, w, h };
      },
      {
        concurrency: 3,
        onProgress: ({ done, total }) => setProgress({ done, total }),
      }
    );

    for (const r of results) {
      if (!r.ok) continue;
      manifest = withEntry(manifest, config.folder, {
        id: `${config.folder}-${r.value.file}-${Date.now()}`,
        file: r.value.file,
        v: Math.floor(Date.now() / 1000),
        w: r.value.w,
        h: r.value.h,
        caption: captions[r.value.file] || '',
      });
    }
    await saveManifest(manifest);

    const ok = results.filter((r) => r.ok).length;
    const savedMb = (savedBytes / 1048576).toFixed(1);
    onToast(`Đã tải lên ${ok}/${selected.length} file` + (savedBytes > 0 ? ` · tiết kiệm ${savedMb} MB` : ''));

    setPending([]);
    setProgress(null);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
    fetchFiles();
  };
```

Thêm state `pending`:

```js
  const [pending, setPending] = useState([]);
```

- [ ] **Bước 5: Hiện thumbnail tạm và tiến độ**

Ngay trên lưới file hiện có, thêm:

```jsx
      {progress && (
        <div className="upload-progress">
          Đang tải lên {progress.done}/{progress.total}…
        </div>
      )}
      {pending.length > 0 && (
        <div className="file-grid">
          {pending.map((p) => (
            <div key={p.url} className="file-card pending">
              <img src={p.url} alt="" />
              <span>{p.name}</span>
            </div>
          ))}
        </div>
      )}
```

- [ ] **Bước 6: Xoá file thì cũng cập nhật bản kê**

Trong `handleDelete`, sau khi xoá thành công trên kho:

```js
      const manifest = await loadManifest();
      await saveManifest(withoutEntry(manifest, config.folder, fileName));
```

- [ ] **Bước 7: Build và thử tay**

```bash
cd app && npm run build && npm run dev
```

Mở `/admin`, tải lên 3 ảnh cùng lúc. Xác nhận: thumbnail hiện ngay lập tức; dòng tiến độ đếm `1/3`, `2/3`, `3/3`; xong thì ảnh vào lưới; mở trang khách thấy ảnh mới.

- [ ] **Bước 8: Commit**

```bash
git add app/src/admin/sections/MediaManager.jsx
git commit -m "Upload media three at a time, with real progress and instant thumbnails

Also records each file in the manifest as it lands, including the dimensions
measured from the compressed file, so the guest page never has to guess."
```

---

## Task 8: Kéo thả sắp thứ tự

**Files:**
- Modify: `app/src/admin/sections/MediaManager.jsx`
- Modify: `app/src/admin/admin.css`

**Interfaces — Consumes:** `withOrder` (Task 2).

- [ ] **Bước 1: Cho thẻ file kéo thả được**

Trên mỗi `.file-card` trong lưới, thêm:

```jsx
              draggable
              onDragStart={() => { dragFrom.current = index; }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleReorder(dragFrom.current, index)}
```

Thêm ref:

```js
  const dragFrom = useRef(null);
```

- [ ] **Bước 2: Hàm sắp lại**

```js
  // Kéo thả chỉ ghi lại thứ tự trong bản kê — KHÔNG đổi tên file, vì đổi tên là
  // phá cache của khách và làm mồ côi caption.
  const handleReorder = async (from, to) => {
    if (from == null || from === to) return;
    const next = [...files];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setFiles(next);
    dragFrom.current = null;

    const manifest = await loadManifest();
    const ids = next.map(
      (f) => listFolder(manifest, config.folder).find((e) => e.file === f.name)?.id
    ).filter(Boolean);
    await saveManifest(withOrder(manifest, config.folder, ids));
    onToast('Đã lưu thứ tự');
  };
```

Thêm `withOrder`, `listFolder` vào import từ `mediaManifest`.

- [ ] **Bước 3: Gợi ý thị giác khi kéo**

Trong `app/src/admin/admin.css`:

```css
.file-card[draggable='true'] { cursor: grab; }
.file-card.pending { opacity: 0.55; }
.upload-progress {
  margin: 12px 0;
  font-size: 14px;
  color: #7E1416;
}
```

- [ ] **Bước 4: Build và thử tay**

Mở `/admin`, kéo một ảnh từ cuối lên đầu. Tải lại trang khách, xác nhận thứ tự carousel đổi theo.

- [ ] **Bước 5: Caption chuyển vào bản kê**

Spec mục 4.3 nói bản kê sửa được chuyện caption mồ côi khi tên file đổi. Muốn vậy
thì caption phải sống trong bản kê, không phải trong khoá `carousel_captions` cũ.

Trong hàm lưu caption hiện có, sau khi ghi khoá cũ, ghi thêm vào bản kê:

```js
    const manifest = await loadManifest();
    const entry = listFolder(manifest, config.folder).find((e) => e.file === fileName);
    if (entry) {
      await saveManifest(withEntry(manifest, config.folder, { ...entry, caption: value }));
    }
```

Giữ khoá `carousel_captions` song song trong đợt này để lỡ có gì sai còn đường lùi;
`buildFromListing` đã giữ caption cũ khi quét lại nên không mất dữ liệu. Gỡ hẳn
khoá cũ là việc của đợt 2, sau khi bản kê chạy ổn qua một vài lần upload thật.

- [ ] **Bước 6: Commit**

```bash
git add app/src/admin/sections/MediaManager.jsx app/src/admin/admin.css
git commit -m "Reorder photos by dragging, without renaming any files

Captions move into the manifest too, so renaming a file no longer orphans one."
```

---

## Task 9: Nút quét lại kho

Bản kê là bản sao; kho mới là sự thật. Ghi hỏng giữa chừng, hoặc ai đó upload thẳng vào kho, thì hai bên lệch nhau và cần đường dựng lại.

**Files:**
- Modify: `app/src/admin/sections/MediaManager.jsx`

**Interfaces — Consumes:** `buildFromListing` (Task 2), `MEDIA_FOLDERS` (Task 2).

- [ ] **Bước 1: Hàm quét**

```js
  const [rescanning, setRescanning] = useState(false);

  const handleRescan = async () => {
    setRescanning(true);
    const listing = {};
    for (const folder of MEDIA_FOLDERS) {
      const { data } = await supabase.storage
        .from(BUCKET).list(folder, { sortBy: { column: 'name', order: 'asc' } });
      listing[folder] = data || [];
    }
    const previous = await loadManifest();
    await saveManifest(buildFromListing(listing, previous));
    setRescanning(false);
    onToast('Đã dựng lại bản kê từ kho');
    fetchFiles();
  };
```

- [ ] **Bước 2: Nút trong giao diện**

Đặt cạnh tiêu đề mục media:

```jsx
      <button className="btn-ghost" onClick={handleRescan} disabled={rescanning}>
        {rescanning ? 'Đang quét…' : 'Quét lại kho'}
      </button>
```

- [ ] **Bước 3: Thử lệch bản kê**

Vào Supabase Dashboard → Storage, xoá tay một file trong `carousel`. Mở trang khách: ảnh đó vẫn nằm trong bản kê nên hiện ô hỏng. Vào `/admin` bấm **Quét lại kho**. Tải lại trang khách: ảnh đã biến mất, caption các ảnh còn lại giữ nguyên.

- [ ] **Bước 4: Commit**

```bash
git add app/src/admin/sections/MediaManager.jsx
git commit -m "Add a rebuild button so the manifest can be recovered from storage"
```

---

## Task 10: Đo lại và xác nhận đạt mục tiêu

**Files:** không sửa file nào — đây là bước nghiệm thu.

- [ ] **Bước 1: Deploy và chờ Ready**

```bash
git push origin main
```

- [ ] **Bước 2: Đếm lượt gọi trước tấm ảnh đầu tiên**

Chạy lại kịch bản đã dùng để đo baseline (`/tmp/render-check/flow.mjs`), trỏ vào trang production.

Mong đợi: **1 lượt truy vấn bảng**, **0 lượt liệt kê thư mục**, ảnh đầu tiên bắt đầu tải **dưới 500ms** (baseline: 14 lượt, +1213ms).

- [ ] **Bước 3: So ảnh với bản thiết kế**

Chạy `/tmp/render-check/shoot.mjs` rồi `/tmp/render-check/diff.mjs`.

Mong đợi: không cặp nào lệch bố cục so với lần đo trước (ngưỡng cảnh báo 8%).

- [ ] **Bước 4: Chạy toàn bộ test**

```bash
cd app && npm test
```

Mong đợi: tất cả passed.

- [ ] **Bước 5: Ghi kết quả vào spec**

Cập nhật mục 7 của spec với số đo thật đạt được, rồi commit.

---

## Không làm trong đợt này

- Chuyển media sang R2 (spec mục 4.2) — chờ tài khoản Cloudflare
- WebP và `srcset` (spec mục 4.5) — thuộc đợt 2
- Cron chống ngủ (spec mục 4.7) và script đóng băng (mục 4.8)
- Di trú ảnh cũ — chủ nhà sẽ tải lên lại từ đầu
