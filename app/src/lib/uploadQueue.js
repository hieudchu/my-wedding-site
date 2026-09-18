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
      onProgress?.({ done, total: list.length, item, ok: results[i].ok, error: results[i].error });
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, list.length) }, lane));
  return results;
}
