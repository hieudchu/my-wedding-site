// Xuất index.html thành ảnh 1200×630 JPEG (< 120 KB) để tải lên admin.
//   cd handoff-share-image && python3 -m http.server 8790 &
//   PW_FROM=<thư mục có node_modules/playwright>/x.js node tools/render.mjs [trang.html] [ra.jpg]
import { createRequire } from 'module';
const require = createRequire(process.env.PW_FROM || import.meta.url);
const { chromium } = require('playwright');
const [page = 'index.html', out = 'out.jpg'] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await p.goto(`http://localhost:8790/${page}`, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
for (const q of [86, 80, 74, 68, 60]) {
  const buf = await p.screenshot({ type: 'jpeg', quality: q });
  if (buf.length < 120 * 1024 || q === 60) { (await import('fs')).writeFileSync(out, buf); console.log(out, q, buf.length); break; }
}
await b.close();
