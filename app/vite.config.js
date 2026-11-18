import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/* Trang /adult (thiệp bố mẹ) cần thẻ xem trước riêng khi gửi link qua Zalo / Messenger: bot
   các app không chạy JS, chỉ đọc HTML tĩnh. Lúc build, chép index.html đã build thành adult.html
   rồi thay các thẻ dưới đây; vercel.json trỏ /adult → /adult.html. Cùng mã JS, react-router vẫn
   mở đúng trang. Đổi ảnh thì đổi TÊN FILE (og-adult-2.jpg…), không thêm ?v= (Zalo bỏ qua). */
const SITE = 'https://hieu-minh-wedding.vercel.app';
const ADULT_TITLE = 'Thiệp mời · Hiếu & Minh';
const ADULT_SHARE_TITLE = 'Thiệp mời lễ thành hôn · Đăng Hiếu & Thiện Minh';
const ADULT_DESC = 'Trân trọng kính mời Quý khách tới dự lễ thành hôn của hai con chúng tôi · 18:30 thứ sáu 15.01.2027 · Khách sạn Sheraton Hà Nội';
const ADULT_IMG = `${SITE}/og-adult-1.jpg`;
const ADULT_IMG_ALT = 'Thiệp mời lễ thành hôn Chu Đăng Hiếu & Nguyễn Thu Thiện Minh, 18:30 thứ sáu 15.01.2027, Khách sạn Sheraton';

function adultHtml() {
  const attr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  return {
    name: 'adult-html',
    apply: 'build',
    enforce: 'post', // index.html chỉ có trong bundle sau plugin build-html của Vite
    generateBundle(_, bundle) {
      const index = bundle['index.html'];
      if (!index) throw new Error('[adult-html] không thấy index.html trong bản build');
      let html = String(index.source);
      const swap = (re, to) => {
        if (!re.test(html)) throw new Error(`[adult-html] không thấy thẻ ${re}`);
        html = html.replace(re, to);
      };
      const meta = (sel, v) => swap(new RegExp(`(<meta ${sel} content=")[^"]*(")`), `$1${attr(v)}$2`);
      swap(/<title>[^<]*<\/title>/, `<title>${ADULT_TITLE.replace(/&/g, '&amp;')}</title>`);
      meta('name="description"', ADULT_DESC);
      meta('property="og:url"', `${SITE}/adult`);
      meta('property="og:title"', ADULT_SHARE_TITLE);
      meta('property="og:description"', ADULT_DESC);
      meta('property="og:image"', ADULT_IMG);
      meta('property="og:image:alt"', ADULT_IMG_ALT);
      meta('name="twitter:image"', ADULT_IMG);
      this.emitFile({ type: 'asset', fileName: 'adult.html', source: html });
    },
  };
}

export default defineConfig({
  plugins: [react(), adultHtml()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
})
