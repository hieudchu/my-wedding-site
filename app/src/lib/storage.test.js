import { describe, it, expect, vi, beforeEach } from 'vitest';

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
    const { getMediaUrlAsync } = await import('./storage');

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
    const { getMediaUrlAsync } = await import('./storage');

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
});
