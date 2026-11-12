/**
 * Tên file an toàn cho kho Supabase.
 *
 * Supabase Storage từ chối ("Invalid key") mọi tên có chữ ngoài bảng ASCII hoặc
 * vài ký tự như [ ] # % — tức là gần như mọi bài hát tải về: "Nơi này có anh.mp3",
 * "Perfect [Official Audio].mp3". Lỗi đó trước đây chỉ hiện thành "Đã tải lên 0/1 file".
 *
 *   "Nơi Này Có Anh [Official].MP3" → "Noi-Nay-Co-Anh-Official.mp3"
 *
 * Tên bài có dấu không mất: thư mục nhạc ghi tên gốc vào `caption` của bản kê, và
 * trình phát đọc caption trước tên file.
 */
export function storageSafeName(name) {
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : '';
  const clean = base
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 100) || 'file';
  return ext ? `${clean}.${ext}` : clean;
}

/** Tên gốc bỏ đuôi — dùng làm tên bài hiện cho khách. */
export function displayName(name) {
  return name.replace(/\.[^.]+$/, '').trim();
}

/** Đổi tên một File mà giữ nguyên nội dung và loại. */
export function renamed(file, name) {
  return name === file.name ? file : new File([file], name, { type: file.type, lastModified: file.lastModified });
}
