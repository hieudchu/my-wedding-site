/* ═══════════════════════════════════════════════════════════════════════════
   Mã sửa của khách: một uuid ngẫu nhiên giữ trên máy khách, gửi kèm mỗi lần → các rpc
   adult_rsvp_save / guest_rsvp_save / wish_save SỬA dòng cũ thay vì thêm dòng mới
   (migration 20261118000100, 20261118000200). Không ai đoán được mã của người khác.
     /adult xác nhận → localStorage 'hm-adult-rsvp'
     trang chính xác nhận → localStorage 'hm-rsvp'
     trang chính lời chúc → cookie 'hm_wish' (chủ thiệp chọn cookie)
   Mọi lần đọc / ghi bọc try/catch: chế độ riêng tư, webview chặn bộ nhớ → coi như chưa gửi.
   ═══════════════════════════════════════════════════════════════════════════ */

export const newToken = () => {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};

const valid = (v) => (v && typeof v.t === 'string' ? v : null);

export const loadLocal = (key) => {
  try { return valid(JSON.parse(localStorage.getItem(key) || 'null')); } catch { return null; }
};
export const saveLocal = (key, v) => {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* bỏ qua */ }
};

export const loadCookie = (key) => {
  try {
    const m = document.cookie.match(new RegExp(`(?:^|; )${key}=([^;]*)`));
    return m ? valid(JSON.parse(decodeURIComponent(m[1]))) : null;
  } catch { return null; }
};
// Cookie tối đa ~4 KB: lời chúc dài quá thì chỉ giữ mã + tên (lần sau ô lời chúc để trống).
export const saveCookie = (key, v) => {
  try {
    let s = encodeURIComponent(JSON.stringify(v));
    if (s.length > 3500) s = encodeURIComponent(JSON.stringify({ t: v.t, name: v.name }));
    document.cookie = `${key}=${s}; Max-Age=${60 * 60 * 24 * 400}; Path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
  } catch { /* bỏ qua */ }
};
