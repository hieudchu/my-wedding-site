/**
 * Câu trích trên thẻ thiệp: bỏ ngoặc kép và dấu chấm cuối, luôn xuống dòng trước
 * "của cuộc đời". Áp dụng mọi màn hình, kể cả desktop.
 * Chuỗi `gate_tagline` trong site_text không cần đổi.
 */
const TAGLINE_FALLBACK = '“Cùng nhau đón những hoàng hôn rực rỡ nhất của cuộc đời.”';
const TAGLINE_BREAK = /\s+(của cuộc đời)/;

export default function Tagline({ text }) {
  // Bỏ ngoặc kép (thẳng/cong) ở hai đầu và dấu chấm cuối câu
  const t = (text || TAGLINE_FALLBACK).trim()
    .replace(/^["“”'‘’]+|["“”'‘’]+$/g, '')
    .replace(/[.。]+$/, '')
    .trim();
  const m = t.match(TAGLINE_BREAK);
  if (!m) return t;
  const i = m.index;
  return <>{t.slice(0, i)}<br />{t.slice(i).trimStart()}</>;
}
