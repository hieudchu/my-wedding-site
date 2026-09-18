/**
 * Chạy nhiều việc song song nhưng có giới hạn, và báo tiến độ.
 *
 * Admin đang upload tuần tự từng file một; với 30 ảnh thì ngồi chờ vài phút mà
 * màn hình chỉ hiện chữ "Uploading…" đứng im. Ba luồng là đủ nhanh mà không làm
 * nghẽn mạng nhà hay bị kho chặn vì gọi quá dày.
 */
export async function runQueue(items, worker, { concurrency = 3, onProgress } = {}) {
  const list = Array.from(items || []);
  const results = new Array(list.length);
  if (!list.length) return results;

  // Ít nhất một luồng: concurrency bằng 0 hay số âm mà cho chạy 0 luồng thì
  // hàng đợi trả về mảng toàn chỗ trống mà chẳng upload gì, lại không báo lỗi.
  const lanes = Math.max(1, Math.min(concurrency, list.length));

  let next = 0;
  let done = 0;

  async function lane() {
    while (true) {
      const i = next++;
      if (i >= list.length) return;
      const item = list[i];
      try {
        const value = await worker(item, i);
        results[i] = { item, ok: true, value };
      } catch (error) {
        results[i] = { item, ok: false, error };
      }
      done++;
      // Báo tiến độ chỉ để vẽ lại màn hình. Kết quả của việc này đã ghi xong
      // rồi, nên người nghe có ném lỗi thì cũng nuốt luôn: cả mẻ upload không
      // được chết vì cái thanh tiến độ. Vẫn ghi log để còn lần ra lỗi lập trình.
      try {
        onProgress?.({ done, total: list.length, item, ok: results[i].ok, error: results[i].error });
      } catch (err) {
        console.error('Lỗi khi báo tiến độ upload:', err);
      }
    }
  }

  await Promise.all(Array.from({ length: lanes }, lane));
  return results;
}
