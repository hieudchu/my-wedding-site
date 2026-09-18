import { describe, it, expect, vi } from 'vitest';
import { runQueue } from './uploadQueue';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

describe('runQueue', () => {
  it('không bao giờ chạy quá số luồng cho phép', async () => {
    let now = 0;
    let peak = 0;
    const items = [1, 2, 3, 4, 5, 6, 7];
    await runQueue(items, async () => {
      now++; peak = Math.max(peak, now);
      await wait(5);
      now--;
    }, { concurrency: 3 });
    expect(peak).toBe(3);
  });

  it('trả kết quả đúng thứ tự đầu vào dù xong lộn xộn', async () => {
    const items = [30, 5, 15];
    const res = await runQueue(items, async (ms) => { await wait(ms); return ms; }, { concurrency: 3 });
    expect(res.map((r) => r.value)).toEqual([30, 5, 15]);
  });

  it('một việc hỏng không làm sập cả mẻ', async () => {
    const res = await runQueue([1, 2, 3], async (n) => {
      if (n === 2) throw new Error('hỏng');
      return n;
    }, { concurrency: 2 });
    expect(res.map((r) => r.ok)).toEqual([true, false, true]);
    expect(res[1].error.message).toBe('hỏng');
  });

  it('báo tiến độ đủ số lần', async () => {
    const onProgress = vi.fn();
    await runQueue([1, 2, 3], async (n) => n, { concurrency: 2, onProgress });
    expect(onProgress).toHaveBeenCalledTimes(3);
    expect(onProgress.mock.calls[2][0]).toMatchObject({ done: 3, total: 3 });
  });

  it('danh sách rỗng thì trả mảng rỗng', async () => {
    expect(await runQueue([], async () => 1, {})).toEqual([]);
  });
});
