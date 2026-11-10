/**
 * Tên trên thẻ thiệp điện thoại ("Đăng Hiếu", "Thiện Minh") viết toàn bộ bằng
 * TAN Whistling.
 *
 * Font có "ê" nhưng thiếu "ế" và "ệ" — và dấu ghép rời cũng bị trình duyệt đẩy
 * sang font khác — nên vẽ "ê" của font rồi thêm dấu sắc / dấu nặng bằng CSS
 * (`.dia-ac` / `.dia-dot`). Không có tên đầy đủ thì rơi về tên ngắn.
 *
 * Đổi sang tên có dấu khác mà font thiếu thì bổ sung vào SCRIPT_DIACRITIC.
 */
const SCRIPT_DIACRITIC = { 'ế': ['ê', 'dia-ac'], 'ệ': ['ê', 'dia-dot'] };

export default function ScriptName({ full, short }) {
  const name = (full || short || '').trim().normalize('NFC');
  return (
    <span className="nm script" role="text" aria-label={name}>
      {Array.from(name).map((ch, i) => {
        const d = SCRIPT_DIACRITIC[ch];
        return d ? <span key={i} className={`dia ${d[1]}`}>{d[0]}</span> : ch;
      })}
    </span>
  );
}
