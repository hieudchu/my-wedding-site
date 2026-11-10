/* ═══════════════════════════════════════════════════════════════════════════
   app/src/lib/phone.js — số điện thoại Việt Nam cho form RSVP
   formatVNPhone: chạy MỖI LẦN GÕ (onChange) → hiển thị có dấu cách.
   toE164VN:      chạy KHI GỬI → lưu cột rsvps.phone_e164 để admin tra / gộp trùng.
   formatVNPhone giống hệt bản trong app.jsx của prototype.
   ═══════════════════════════════════════════════════════════════════════════ */

/* Di động 10 số:        0912 345 678
   Cố định 11 số (02x):  024 3825 1234
   Đầu +84 / 84:         +84 912 345 678                                       */
export function formatVNPhone(raw) {
  const s = (raw || '').trim();
  let d = s.replace(/\D/g, '');
  const intl = s.startsWith('+') || (d.startsWith('84') && d.length > 9);
  if (intl) {
    if (d.length < 2 || !d.startsWith('84')) return d ? `+${d}` : (s.startsWith('+') ? '+' : ''); // đang gõ mã nước / mã nước khác
    d = d.slice(2).replace(/^0/, '').slice(0, 10);
    const g = d.startsWith('2') ? [2, 4, 4] : [3, 3, 4];
    const parts = []; let i = 0;
    for (const n of g) { if (i >= d.length) break; parts.push(d.slice(i, i + n)); i += n; }
    return '+84' + (parts.length ? ' ' + parts.join(' ') : '');
  }
  d = d.slice(0, 11);
  const g = d.startsWith('02') ? [3, 4, 4] : [4, 3, 3];
  const parts = []; let i = 0;
  for (const n of g) { if (i >= d.length) break; parts.push(d.slice(i, i + n)); i += n; }
  return parts.join(' ');
}

/* "0912 345 678" → "+84912345678";  "+84 912 345 678" → "+84912345678"
   "024 3825 1234" → "+842438251234"; số nước ngoài "+1 415…" → "+1415…"
   Rỗng / quá ngắn (< 9 số sau mã nước) → null (vẫn lưu cột `phone` thô).        */
export function toE164VN(display) {
  const s = (display || '').trim();
  const d = s.replace(/\D/g, '');
  if (!d) return null;
  if (s.startsWith('+') && !d.startsWith('84')) return d.length >= 8 ? `+${d}` : null;
  let nat = d.startsWith('84') && (s.startsWith('+') || d.length > 9) ? d.slice(2) : d;
  nat = nat.replace(/^0/, '');
  return nat.length >= 9 && nat.length <= 10 ? `+84${nat}` : null;
}

/* Giá trị ô "Số người tham dự" */
export const GUEST_OPTIONS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '10+'];
export const guestLabel = (v) => (v === '10+' ? 'Trên 10 người' : `${v} người`);
