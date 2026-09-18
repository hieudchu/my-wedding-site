import { describe, it, expect, vi, beforeEach } from 'vitest';
import { emptyManifest } from './mediaManifest';

const listMock = vi.fn();

vi.mock('./supabase', () => ({
  supabaseConfigured: true,
  supabase: {
    storage: {
      from: () => ({
        list: listMock,
        getPublicUrl: (p) => ({ data: { publicUrl: `https://kho.test/${p}` } }),
      }),
    },
  },
}));

describe('getMediaUrlAsync', () => {
  beforeEach(() => {
    vi.resetModules();
    listMock.mockReset();
  });

  it('bốn lời gọi cùng lúc cho một thư mục chỉ tạo MỘT lượt liệt kê', async () => {
    listMock.mockImplementation(
      () => new Promise((r) => setTimeout(() => r({
        data: [{ name: 'medallion-ink.png', updated_at: '2026-01-01T00:00:00Z' }],
        error: null,
      }), 10))
    );
    const { getMediaUrlAsync, setManifest } = await import('./storage');
    // Mở cổng y như App làm khi site_config về mà chưa có bản kê nào
    setManifest(emptyManifest());

    const urls = await Promise.all([
      getMediaUrlAsync('icons/medallion-ink.png'),
      getMediaUrlAsync('icons/medallion-ink.png'),
      getMediaUrlAsync('icons/medallion-ink.png'),
      getMediaUrlAsync('icons/medallion-ink.png'),
    ]);

    expect(listMock).toHaveBeenCalledTimes(1);
    expect(urls[0]).toContain('icons/medallion-ink.png');
    expect(urls.every((u) => u === urls[0])).toBe(true);
  });

  it('liệt kê hỏng thì không nhớ kết quả hỏng vĩnh viễn', async () => {
    listMock.mockResolvedValueOnce({ data: null, error: new Error('mạng lỗi') });
    const { getMediaUrlAsync, setManifest } = await import('./storage');
    setManifest(emptyManifest());

    expect(await getMediaUrlAsync('icons/medallion-ink.png')).toBeNull();

    listMock.mockResolvedValueOnce({
      data: [{ name: 'medallion-ink.png', updated_at: '2026-01-01T00:00:00Z' }],
      error: null,
    });
    expect(await getMediaUrlAsync('icons/medallion-ink.png')).toContain('medallion-ink.png');
  });

  it('có bản kê thì không hỏi kho lấy một lượt', async () => {
    const { getMediaUrlAsync, setManifest } = await import('./storage');
    setManifest({
      version: 1,
      folders: {
        icons: [{ id: 'icons-medallion-ink.png', file: 'medallion-ink.png', v: 1767225600, w: 0, h: 0, caption: '' }],
      },
    });

    const url = await getMediaUrlAsync('icons/medallion-ink.png');

    expect(url).toBe('https://kho.test/icons/medallion-ink.png?v=1767225600');
    expect(listMock).not.toHaveBeenCalled();
  });

  it('không ai nạp bản kê thì van an toàn vẫn mở cổng', async () => {
    // Đồng hồ giả: chứng minh van hoạt động mà không phải ngồi chờ thật 3 giây
    vi.useFakeTimers();
    try {
      listMock.mockResolvedValue({
        data: [{ name: 'medallion-ink.png', updated_at: '2026-01-01T00:00:00Z' }],
        error: null,
      });
      const { getMediaUrlAsync } = await import('./storage');

      // Cố tình KHÔNG gọi setManifest: chỉ còn van an toàn mới mở được cổng
      let settled = false;
      const pending = getMediaUrlAsync('icons/medallion-ink.png')
        .then((u) => { settled = true; return u; });

      await vi.advanceTimersByTimeAsync(2999);
      expect(settled).toBe(false);          // chưa tới giờ thì vẫn đứng chờ ở cổng

      await vi.advanceTimersByTimeAsync(1);
      expect(await pending).toContain('medallion-ink.png');
    } finally {
      vi.useRealTimers();
    }
  });
});
