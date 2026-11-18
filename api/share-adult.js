/**
 * Trang thiệp bố mẹ (/adult, /thiep-moi) cho bot Zalo / Messenger / WhatsApp: các bot này không
 * chạy JS, chỉ đọc thẻ og:* trong HTML. Ảnh xem trước đổi được trong admin (site_config
 * `share_adult_image` = đường dẫn trong kho `media`, vd. "share/adult-m3x9k2.jpg"; trống = ảnh mặc
 * định public/og-adult-2.jpg), nên HTML phải ghép lúc phục vụ, không viết cứng lúc build.
 *
 * Lấy adult.html đã build (vite.config.js), thay og:image / twitter:image / og:url rồi trả về.
 * og:url đổi theo từng ảnh (/thiep-moi/<mã ảnh>): Zalo gộp bản xem trước theo og:url, giữ nguyên
 * thì nó cứ hiện ảnh cũ. Lỗi gì cũng trả nguyên adult.html (ảnh mặc định), không bao giờ trang trắng.
 * CDN giữ 60 giây.
 */
const fs = require('fs');
const path = require('path');

const SITE = 'https://hieu-minh-wedding.vercel.app';
const SAFE_PATH = /^share\/[A-Za-z0-9._-]+\.jpe?g$/;

let cachedHtml = null;
async function baseHtml(host) {
  if (cachedHtml) return cachedHtml;
  for (const p of [
    path.join(process.cwd(), 'app/dist/adult.html'),
    path.join(__dirname, '../app/dist/adult.html'),
  ]) {
    try { cachedHtml = fs.readFileSync(p, 'utf8'); return cachedHtml; } catch { /* thử chỗ khác */ }
  }
  // Không có trong gói hàm → lấy bản tĩnh (đường /adult.html không qua rewrite)
  const r = await fetch(`https://${host || 'hieu-minh-wedding.vercel.app'}/adult.html`);
  if (!r.ok) throw new Error(`adult.html ${r.status}`);
  cachedHtml = await r.text();
  return cachedHtml;
}

async function chosenImage(html) {
  // URL + khoá publishable đã nằm sẵn trong HTML (đoạn hỏi site_config sớm của index.html)
  const m = html.match(/var url = '(https:[^']+)', key = '([^']+)'/);
  if (!m) return null;
  const [, url, key] = m;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 1500);
  try {
    const r = await fetch(`${url}/rest/v1/site_config?select=value&key=eq.share_adult_image&apikey=${encodeURIComponent(key)}`, { signal: ctl.signal });
    if (!r.ok) return null;
    const v = String((await r.json())[0]?.value || '').trim();
    if (!SAFE_PATH.test(v)) return null;
    return { src: `${url}/storage/v1/object/public/media/${v}`, tag: path.basename(v).replace(/\.[^.]+$/, '') };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

module.exports = async (req, res) => {
  let html;
  try {
    html = await baseHtml(req.headers.host);
  } catch (err) {
    console.error('[share-adult]', err);
    res.statusCode = 302;
    res.setHeader('Location', '/adult.html');
    return res.end();
  }
  let out = html;
  try {
    const img = await chosenImage(html);
    if (img) {
      out = out
        .replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${img.src}$2`)
        .replace(/(<meta name="twitter:image" content=")[^"]*(")/, `$1${img.src}$2`)
        .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${SITE}/thiep-moi/${img.tag}$2`);
    }
  } catch (err) {
    console.error('[share-adult]', err);
    out = html;
  }
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
  res.end(out);
};
