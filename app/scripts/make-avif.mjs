#!/usr/bin/env node
/**
 * Sinh bản AVIF cho ảnh cưới đã có bản nén WebP, tải lên `media/_opt/…`, rồi bật cờ
 * `opt.avif` trong bản kê. Trình duyệt không xuất được AVIF nên admin upload chỉ tạo WebP;
 * ảnh mới upload sau này vẫn hiện bình thường (WebP) cho tới khi chạy lại script này.
 *
 * Chất lượng: AVIF q60, 4:2:0, effort 6 — đo 11/2026 trên 4 ảnh thật: giống ảnh gốc hơn
 * WebP q78 đang dùng (SSIM ngang WebP q85–90) mà nhẹ hơn 6–16%. Cùng các cỡ trong `opt.w`,
 * thu nhỏ thẳng từ ảnh gốc 3000 px (lanczos3), không bao giờ phóng to.
 *
 * Chạy (cần sharp, không có trong dependencies của app):
 *   npm i --no-save sharp@0.34.4
 *   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=… node scripts/make-avif.mjs [--force]
 * Khoá service role: Supabase › Project Settings › API keys (legacy service_role). Không commit khoá.
 * Chỉ sinh file ra máy, không ghi gì lên kho (không cần khoá service role, đọc bản kê bằng
 * khoá publishable):
 *   SUPABASE_URL=… SUPABASE_ANON_KEY=… node scripts/make-avif.mjs --out /thư/mục
 *
 * An toàn: chỉ thêm file mới (`.avif`) và cờ `avif: true`; đọc lại bản kê ngay trước khi ghi
 * và chỉ bật cờ cho mục mà `opt.v` vẫn đúng phiên bản vừa nén (admin thay ảnh giữa chừng thì
 * bỏ qua mục đó). Bản kê cũ được lưu ra `manifest-backup-<thời điểm>.json` trước khi ghi.
 */
import fs from 'node:fs';

const sharp = (await import(process.env.SHARP_PATH || 'sharp')).default;
const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const argOut = process.argv.indexOf('--out');
const OUT = argOut > 0 ? process.argv[argOut + 1] : null;
const DRY = process.argv.includes('--dry') || Boolean(OUT);
const FORCE = process.argv.includes('--force');
const BACKUP_DIR = process.env.BACKUP_DIR || '.';
const READ_KEY = KEY || process.env.SUPABASE_ANON_KEY;
if (!URL_ || !READ_KEY || (!DRY && !KEY)) { console.error('Thiếu SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

const AVIF = { quality: 60, effort: 6, chromaSubsampling: '4:2:0' };
const IMAGE_FOLDERS = ['carousel', 'portraits', 'background', 'gallery', 'timeline'];
const auth = { apikey: READ_KEY, Authorization: `Bearer ${READ_KEY}` };
const enc = (p) => p.split('/').map(encodeURIComponent).join('/');

async function readManifestRow() {
  const r = await fetch(`${URL_}/rest/v1/site_config?select=value&key=eq.media_manifest`, { headers: auth });
  if (!r.ok) throw new Error(`đọc bản kê: ${r.status} ${await r.text()}`);
  const [row] = await r.json();
  if (!row || typeof row.value !== 'string') throw new Error('không có hàng media_manifest');
  return row.value;
}

async function makeOne(folder, e) {
  const src = `${URL_}/storage/v1/object/public/media/${enc(`${folder}/${e.file}`)}?v=${e.v}`;
  const r = await fetch(src);
  if (!r.ok) throw new Error(`tải gốc ${folder}/${e.file}: ${r.status}`);
  const orig = Buffer.from(await r.arrayBuffer());
  const meta = await sharp(orig).rotate().metadata();
  const base = e.file.replace(/\.[^.]+$/, '');
  let bytes = 0;
  for (const w of e.opt.w) {
    const out = await sharp(orig).rotate()
      .resize({ width: w, kernel: 'lanczos3', withoutEnlargement: true })
      .avif(AVIF).toBuffer({ resolveWithObject: true });
    bytes += out.data.length;
    const path = `_opt/${folder}/${base}-${w}.avif`;
    if (DRY) {
      if (OUT) { fs.mkdirSync(`${OUT}/_opt/${folder}`, { recursive: true }); fs.writeFileSync(`${OUT}/${path}`, out.data); }
      continue;
    }
    const up = await fetch(`${URL_}/storage/v1/object/media/${enc(path)}`, {
      method: 'POST',
      headers: { ...auth, 'content-type': 'image/avif', 'cache-control': 'max-age=31536000', 'x-upsert': 'true' },
      body: out.data,
    });
    if (!up.ok) throw new Error(`tải lên ${path}: ${up.status} ${await up.text()}`);
  }
  console.log(`✓ ${folder}/${e.file} (${meta.width}x${meta.height}) → ${e.opt.w.join('/')} AVIF, ${(bytes / 1024).toFixed(0)} KB`);
}

const before = JSON.parse(await readManifestRow());
const todo = [];
for (const folder of IMAGE_FOLDERS) {
  for (const e of before.folders?.[folder] || []) {
    if (!e.opt || e.opt.v !== e.v || !['webp', 'jpg'].includes(e.opt.fmt)) continue;
    if (e.opt.avif && !FORCE) continue;
    todo.push({ folder, e });
  }
}
console.log(`${todo.length} ảnh cần AVIF${DRY ? ' (thử, không ghi)' : ''}`);

const done = [];
const queue = [...todo];
await Promise.all(Array.from({ length: 3 }, async () => {
  while (queue.length) {
    const job = queue.shift();
    try { await makeOne(job.folder, job.e); done.push(job); } catch (err) { console.error(`✗ ${job.folder}/${job.e.file}: ${err.message}`); }
  }
}));
if (DRY || !done.length) process.exit(0);

// Đọc lại ngay trước khi ghi: admin có thể vừa sửa bản kê trong lúc nén
const raw = await readManifestRow();
fs.writeFileSync(`${BACKUP_DIR}/manifest-backup-${Date.now()}.json`, raw);
const now = JSON.parse(raw);
let flagged = 0;
for (const { folder, e } of done) {
  const cur = (now.folders?.[folder] || []).find((x) => x.file === e.file);
  if (!cur?.opt || cur.v !== e.v || cur.opt.v !== e.opt.v) { console.warn(`  bỏ qua cờ ${folder}/${e.file}: ảnh đã đổi trong lúc nén`); continue; }
  cur.opt.avif = true;
  flagged += 1;
}
const w = await fetch(`${URL_}/rest/v1/site_config?key=eq.media_manifest`, {
  method: 'PATCH',
  headers: { ...auth, 'content-type': 'application/json', Prefer: 'return=minimal' },
  body: JSON.stringify({ value: JSON.stringify({ version: 1, folders: now.folders }), updated_at: new Date().toISOString() }),
});
if (!w.ok) throw new Error(`ghi bản kê: ${w.status} ${await w.text()}`);
console.log(`Bản kê: bật avif cho ${flagged} ảnh.`);
