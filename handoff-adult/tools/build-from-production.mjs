#!/usr/bin/env node
/**
 * Dựng lại prototype trang /adult từ mã production (app/src) — không sửa tay app.jsx / styles/.
 *
 *   node handoff-adult/tools/build-from-production.mjs
 *
 * Làm gì:
 *   1. Ghép các file trang khách của app/src thành MỘT app.jsx (bỏ import/export,
 *      mỗi file một khối có tiêu đề `// ═══ <đường dẫn production> ═══`).
 *   2. Thay lib/supabase.js bằng client giả đọc data/db.js và ./media/.
 *   3. Chép globals.css + sections.css + desktop.css + mobile.css (main.jsx nạp chúng cho MỌI
 *      route, kể cả /adult) + adult/adult.css, đổi '/assets/…' tuyệt đối thành tương đối
 *      để trang chạy được ở bất kỳ thư mục con nào.
 *
 * Không đụng tới data/, media/, fonts/, assets/ — những thứ đó chép một lần.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..');
const SRC = join(OUT, '..', 'app', 'src');

// Thứ tự = thứ tự phụ thuộc: thư viện → hook → component → App.
const FILES = [
  'lib/config.js',
  'lib/fit.js',
  'hooks/useViewport.js',
  'lib/scrollLock.js',
  'lib/mediaManifest.js',
  'lib/storage.js',
  'hooks/useSiteConfig.js',
  'hooks/useMedia.js',
  'components/Lightbox.jsx',
  'components/MediaImage.jsx',
  'components/ErrorBoundary.jsx',
  'adult/AdultRSVP.jsx',
  'adult/AdultApp.jsx',
];

const reactNames = new Set();

function transform(code, file) {
  const out = [];
  for (const line of code.split('\n')) {
    if (/^import\s+['"][^'"]+\.css['"];?\s*$/.test(line)) continue; // CSS: index.html nạp
    const imp = line.match(/^import\s+(.*?)\s+from\s+['"]([^'"]+)['"];?\s*$/);
    if (imp) {
      if (imp[2] === 'react') {
        const named = imp[1].match(/\{([^}]*)\}/);
        if (named) named[1].split(',').map((s) => s.trim()).filter(Boolean).forEach((n) => reactNames.add(n));
      } else if (imp[2] === 'react-dom') {
        /* prototype: ReactDOM là biến toàn cục */
      } else if (!imp[2].startsWith('.')) {
        throw new Error(`${file}: import ngoài React chưa được hỗ trợ: ${line}`);
      }
      continue;
    }
    if (/^import\s/.test(line)) throw new Error(`${file}: import nhiều dòng chưa được hỗ trợ: ${line}`);
    if (/^export\s+default\s+[A-Za-z_$][\w$]*;\s*$/.test(line)) continue;
    out.push(
      line
        .replace(/^export\s+default\s+/, '')
        .replace(/^export\s+(?=(async\s+)?(function|const|let|class)\b)/, '')
        .replace(/(['"`])\/assets\//g, '$1./assets/'),
    );
  }
  return out.join('\n').trim();
}

const SUPABASE_SHIM = `// ═══ lib/supabase.js — PORT: thay bằng client giả ═══
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
})();`;

const chunks = FILES.map((f) => `// ═══ ${f} ═══\n${transform(readFileSync(join(SRC, f), 'utf8'), f)}`);

const header = `/*
 * app.jsx — TỰ SINH từ app/src bằng tools/build-from-production.mjs. Bản chụp ${new Date().toISOString().slice(0, 10)}.
 *
 * Đây là mã production NGUYÊN VẸN của trang /adult (mọi khổ màn), chỉ ghép
 * lại thành một file cho Babel chạy trong trình duyệt. Mỗi khối mở đầu bằng
 * \`// ═══ <file production> ═══\` — đó là chỗ phải chép ngược về khi port.
 * Chỗ duy nhất khác production đánh dấu \`PORT:\` (client Supabase giả).
 */
const { ${[...reactNames].sort().join(', ')} } = React;
`;

const footer = `// ═══ main.jsx — PORT: production là <Route path="/adult"> nạp lười trong react-router ═══
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AdultApp />
    </ErrorBoundary>
  </React.StrictMode>
);
`;

writeFileSync(join(OUT, 'app.jsx'), [header, SUPABASE_SHIM, ...chunks, footer].join('\n\n'));

const CSS = ['styles/globals.css', 'styles/sections.css', 'styles/desktop.css', 'styles/mobile.css', 'adult/adult.css'];
for (const css of CSS) {
  const text = readFileSync(join(SRC, css), 'utf8').replace(/url\((['"]?)\/assets\//g, 'url($1../assets/');
  writeFileSync(join(OUT, 'styles', css.split('/')[1]), text);
}

console.log(`app.jsx: ${FILES.length} file production + client giả · styles/: ${CSS.length} file`);
