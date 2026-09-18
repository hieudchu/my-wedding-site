/**
 * Kho bản kê media — chỗ duy nhất được phép đọc và ghi hàng `media_manifest`.
 *
 * Cả sáu thư mục media nằm trong ĐÚNG MỘT hàng site_config. Hàng ấy chính là
 * danh sách ảnh cưới của hai vợ chồng: mất nó là trang khách trắng ảnh cho tới
 * khi có người bấm "Quét lại kho". Nên mọi lượt ghi phải đi qua đây, và ở đây có
 * ba thứ giữ cho nó không mất:
 *
 *   1. Một hàng đợi duy nhất — hai lượt đọc–sửa–ghi chồng lên nhau thì lượt sau
 *      đè mất phần của lượt trước, mà không có lỗi nào báo.
 *   2. Đọc khó tính — hàng hỏng thì ném ra, không coi là rỗng rồi ghi đè.
 *   3. Chép sẵn kho vào thư mục lần đầu ghi — xem seedFolderFromStorage.
 *
 * Trước đây mấy thứ này nằm riêng trong MediaManager.jsx, nên TimelineSettings —
 * người ghi thứ hai vào cùng kho ảnh — không hề đụng tới bản kê: thay ảnh thì
 * `v` đứng yên nên khách vẫn thấy ảnh cũ trong cache, xoá ảnh thì bản kê còn lại
 * một mục trỏ vào chỗ trống. Tách ra đây để cả hai trang dùng CHUNG một hàng đợi:
 * hai hàng đợi song song là mở lại đúng cái lỗ mà hàng đợi sinh ra để bịt.
 */

import { supabase } from './supabase';
import {
  parseManifest, parseManifestStrict, serializeManifest, ManifestCorruptError,
  withEntry, listFolder, storageVersion, entryId,
} from './mediaManifest';

export const BUCKET = 'media';
const MANIFEST_KEY = 'media_manifest';

/* ── Hàng đợi ghi ── */

let manifestChain = Promise.resolve();

/**
 * Xếp hàng một lượt đọc–sửa–ghi. Mỗi lượt chạy trọn vẹn rồi mới đến lượt kế.
 * Chỉ có một `manifestChain` cho cả ứng dụng, vì module chỉ được nạp một lần.
 */
export function queueManifestWrite(task) {
  const run = manifestChain.then(task, task);
  // Nuốt lỗi ở bản lưu hàng đợi, nếu không một lượt hỏng sẽ chặn mọi lượt sau
  manifestChain = run.then(() => {}, () => {});
  return run;
}

/* ── Đọc / ghi ── */

/**
 * Đọc bản kê media.
 *
 * Ném lỗi ở CẢ HAI kiểu hỏng, vì người gọi cần biết để đừng ghi đè:
 *   - hỏng đường truyền: Supabase trả lỗi trong kết quả chứ không ném;
 *   - hỏng nội dung: hàng đọc về nhưng không phải bản kê đọc được.
 *
 * `tolerateCorrupt` chỉ dành cho nút "Quét lại kho". Đó là đường CHỮA: nó dựng
 * lại toàn bộ bản kê từ kho, nên bản cũ hỏng đến đâu cũng không sao — mà nếu ở
 * đây cũng ném thì bản kê hỏng sẽ không còn lối nào sửa được nữa.
 */
export async function loadManifest({ tolerateCorrupt = false } = {}) {
  const { data, error } = await supabase
    .from('site_config').select('value').eq('key', MANIFEST_KEY).maybeSingle();
  if (error) throw error;
  return tolerateCorrupt ? parseManifest(data?.value) : parseManifestStrict(data?.value);
}

/** Ghi bản kê media. Ném lỗi khi ghi hỏng. */
export async function saveManifest(m) {
  const { error } = await supabase.from('site_config').upsert(
    {
      key: MANIFEST_KEY,
      value: serializeManifest(m),
      section: 'media',
      label: 'Bản kê media (trang tự ghi)',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' }
  );
  if (error) throw error;
}

/**
 * Đọc bản kê hiện tại, sửa, rồi ghi lại — trọn vẹn một lượt, không ai chen ngang.
 * Không bao giờ ghi một bản kê dựng riêng cho mẻ này: làm thế là xoá sạch phần
 * của những thư mục khác. `mutate` được phép là hàm async.
 */
export function applyToManifest(mutate, options) {
  return queueManifestWrite(async () => {
    const manifest = await loadManifest(options);
    await saveManifest(await mutate(manifest));
  });
}

/**
 * Câu nhắc hợp với lỗi vừa gặp, để dán vào cuối thông báo.
 *
 * Bản kê hỏng thì bấm lại bao nhiêu lần cũng hỏng y như thế — chỉ nút "Quét lại
 * kho" chữa được. Bảo người ta "thử lại" trong cảnh đó là chỉ sai đường.
 */
export function manifestErrorHint(err) {
  return err instanceof ManifestCorruptError
    ? 'bản kê đang hỏng · bấm “Quét lại kho” ở đầu trang Media'
    : 'thử lại';
}

/* ── Liệt kê kho ── */

/**
 * Liệt kê TẤT CẢ file trong một thư mục kho.
 *
 * supabase.storage.list() mặc định chỉ trả 100 dòng và không hề báo là còn nữa.
 * Ở những chỗ chỉ để xem thì thiếu vài dòng là chuyện nhỏ; ở đây thì không —
 * danh sách này được ghi thẳng vào bản kê, nên đọc thiếu 100 dòng là ảnh biến
 * mất khỏi trang khách, do chính cái nút sinh ra để chữa chuyện đó gây ra.
 *
 * Nên đọc hết từng trang một chứ không từ chối thư mục đông file: từ chối nghĩa
 * là thư mục hơn 100 ảnh vĩnh viễn không có đường dựng lại, mà đó lại đúng là
 * thư mục có nhiều thứ để mất nhất. Hết MAX_LIST_PAGES mà kho vẫn còn trả đầy
 * trang thì ném lỗi — thà không ghi gì còn hơn ghi một bản kê thiếu file.
 */
export const LIST_PAGE_SIZE = 100;
export const MAX_LIST_PAGES = 100;   // 10.000 file/thư mục; quá ngần ấy là có chuyện khác

export async function listAllInFolder(folder) {
  const all = [];
  for (let page = 0; page < MAX_LIST_PAGES; page += 1) {
    const { data, error } = await supabase.storage.from(BUCKET).list(folder, {
      limit: LIST_PAGE_SIZE,
      offset: page * LIST_PAGE_SIZE,
      sortBy: { column: 'name', order: 'asc' },
    });
    // Liệt kê hỏng thì ném ra, đừng coi là thư mục rỗng: coi là rỗng nghĩa là
    // ghi một bản kê trắng cho thư mục vẫn còn nguyên ảnh.
    if (error) throw error;
    const batch = data || [];
    all.push(...batch);
    // Trang chưa đầy nghĩa là đã hết. Trang đầy thì còn có thể còn nữa, đọc tiếp.
    if (batch.length < LIST_PAGE_SIZE) return all;
  }
  throw new Error(`Thư mục "${folder}" có quá nhiều file để quét một lượt`);
}

/**
 * Lần đầu ghi bản kê cho một thư mục thì phải chép luôn những file đã nằm sẵn
 * trong kho vào đó.
 *
 * listMedia() chuyển hẳn sang đọc bản kê ngay khi thư mục có dù chỉ một mục.
 * Thành ra nếu chỉ ghi mấy file vừa tải lên, thư mục đang có ba ảnh mà tải thêm
 * hai sẽ còn đúng hai — ba ảnh cũ biến mất khỏi trang khách.
 */
export async function seedFolderFromStorage(m, folder, captionsByFile) {
  if (listFolder(m, folder).length) return m;   // đã có bản kê rồi thì không đụng vào

  // Đọc hết chứ không chỉ 100 dòng đầu: chép thiếu ở đây cũng là mất ảnh, y hệt
  // lúc quét lại kho. Không liệt kê được thì ném ra, thà đừng ghi bản kê còn hơn
  // ghi một bản thiếu ảnh cũ.
  const data = await listAllInFolder(folder);

  let next = m;
  for (const f of data) {
    if (!f?.name || f.name === '.emptyFolderPlaceholder') continue;
    next = withEntry(next, folder, {
      id: entryId(folder, f.name),
      file: f.name,
      // Không đo được ảnh nằm sẵn trong kho mà không tải nó về. 0 nghĩa là chưa
      // biết, và trang khách đã tự xoay xở được với số 0 (Hero.jsx kiểm tra p.w && p.h).
      v: storageVersion(f),
      w: 0,
      h: 0,
      caption: captionsByFile?.[f.name] || '',
    });
  }
  return next;
}
