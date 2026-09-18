import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  emptyManifest, parseManifest, serializeManifest, listFolder,
  withEntry, ManifestCorruptError,
} from './mediaManifest';

const maybeSingleMock = vi.fn();
const upsertMock = vi.fn();
const listMock = vi.fn();

vi.mock('./supabase', () => ({
  supabaseConfigured: true,
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: maybeSingleMock }) }),
      upsert: upsertMock,
    }),
    storage: { from: () => ({ list: listMock }) },
  },
}));

const { loadManifest, applyToManifest, listAllInFolder, seedFolderFromStorage } =
  await import('./manifestStore');

const entry = (file) => ({ id: `carousel-${file}`, file, v: 1, w: 0, h: 0, caption: '' });
const rowOf = (m) => ({ data: { value: serializeManifest(m) }, error: null });
const page = (n, prefix = 'f') =>
  Array.from({ length: n }, (_, i) => ({ name: `${prefix}${i}.jpg`, updated_at: '2026-01-01T00:00:00Z' }));

beforeEach(() => {
  maybeSingleMock.mockReset();
  upsertMock.mockReset();
  listMock.mockReset();
  upsertMock.mockResolvedValue({ error: null });
});

describe('bản kê hỏng thì chặn đường ghi', () => {
  it('applyToManifest không ghi gì, cũng không gọi tới hàm sửa', async () => {
    maybeSingleMock.mockResolvedValue({ data: { value: '{ hỏng' }, error: null });
    const mutate = vi.fn((m) => m);

    await expect(applyToManifest(mutate)).rejects.toThrow(ManifestCorruptError);

    // Đây mới là điều quan trọng: hàng hỏng vẫn còn nguyên trên máy chủ, chưa bị
    // một bản kê rỗng suy ra từ chính chỗ hỏng đó đè lên.
    expect(upsertMock).not.toHaveBeenCalled();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('một thư mục hỏng cũng đủ để dừng — mất thứ tự của năm thư mục kia là mất thật', async () => {
    maybeSingleMock.mockResolvedValue({
      data: { value: JSON.stringify({ version: 1, folders: { carousel: 'sai' } }) },
      error: null,
    });
    await expect(applyToManifest((m) => m)).rejects.toThrow(ManifestCorruptError);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it('lỗi đường truyền vẫn ném như cũ', async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: new Error('mất mạng') });
    await expect(loadManifest()).rejects.toThrow('mất mạng');
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it('chưa có bản kê nào thì lượt ghi đầu tiên vẫn đi qua', async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null });
    await applyToManifest((m) => withEntry(m, 'carousel', entry('a.jpg')));
    expect(upsertMock).toHaveBeenCalledTimes(1);
  });

  it('nút quét lại kho vẫn đi qua được bản kê hỏng — nếu không thì hết đường chữa', async () => {
    maybeSingleMock.mockResolvedValue({ data: { value: '{ hỏng' }, error: null });
    await applyToManifest((m) => withEntry(m, 'carousel', entry('a.jpg')), { tolerateCorrupt: true });
    expect(upsertMock).toHaveBeenCalledTimes(1);
    expect(listFolder(parseManifest(upsertMock.mock.calls[0][0].value), 'carousel')).toHaveLength(1);
  });
});

describe('applyToManifest xếp hàng', () => {
  it('hai lượt ghi cùng lúc không đè mất phần của nhau', async () => {
    let stored = null;
    maybeSingleMock.mockImplementation(async () => ({ data: { value: stored }, error: null }));
    upsertMock.mockImplementation(async (row) => { stored = row.value; return { error: null }; });

    await Promise.all([
      applyToManifest((m) => withEntry(m, 'carousel', entry('a.jpg'))),
      applyToManifest((m) => withEntry(m, 'portraits', { ...entry('groom.jpg'), id: 'portraits-groom.jpg' })),
    ]);

    const final = parseManifest(stored);
    expect(listFolder(final, 'carousel')).toHaveLength(1);
    expect(listFolder(final, 'portraits')).toHaveLength(1);
  });

  it('một lượt hỏng không chặn lượt sau', async () => {
    maybeSingleMock.mockResolvedValueOnce({ data: null, error: new Error('hỏng một lần') });
    maybeSingleMock.mockResolvedValue({ data: null, error: null });

    await expect(applyToManifest((m) => m)).rejects.toThrow('hỏng một lần');
    await applyToManifest((m) => withEntry(m, 'carousel', entry('a.jpg')));
    expect(upsertMock).toHaveBeenCalledTimes(1);
  });
});

describe('listAllInFolder', () => {
  it('đọc hết mọi trang chứ không dừng ở 100 dòng đầu', async () => {
    listMock
      .mockResolvedValueOnce({ data: page(100, 'a'), error: null })
      .mockResolvedValueOnce({ data: page(100, 'b'), error: null })
      .mockResolvedValueOnce({ data: page(30, 'c'), error: null });

    const all = await listAllInFolder('carousel');

    expect(all).toHaveLength(230);
    expect(listMock).toHaveBeenCalledTimes(3);
    // Trang sau phải nhảy offset, nếu không là đọc đi đọc lại đúng 100 dòng đầu
    expect(listMock.mock.calls.map((c) => c[1].offset)).toEqual([0, 100, 200]);
  });

  it('trang đầu chưa đầy thì dừng ngay, không hỏi thêm lượt nào', async () => {
    listMock.mockResolvedValue({ data: page(3), error: null });
    expect(await listAllInFolder('carousel')).toHaveLength(3);
    expect(listMock).toHaveBeenCalledTimes(1);
  });

  it('thư mục rỗng trả mảng rỗng', async () => {
    listMock.mockResolvedValue({ data: [], error: null });
    expect(await listAllInFolder('carousel')).toEqual([]);
  });

  it('liệt kê hỏng thì ném, không coi là thư mục rỗng', async () => {
    listMock.mockResolvedValue({ data: null, error: new Error('kho không trả lời') });
    await expect(listAllInFolder('carousel')).rejects.toThrow('kho không trả lời');
  });

  it('kho trả đầy trang mãi không hết thì ném chứ không quay vô tận', async () => {
    listMock.mockResolvedValue({ data: page(100), error: null });
    await expect(listAllInFolder('carousel')).rejects.toThrow(/quá nhiều file/);
  });
});

describe('seedFolderFromStorage', () => {
  it('chép cả kho vào thư mục chưa có mục nào trong bản kê', async () => {
    listMock.mockResolvedValue({
      data: [
        { name: 'cu-1.jpg', updated_at: '2026-01-01T00:00:00Z' },
        { name: 'cu-2.jpg', updated_at: '2026-01-02T00:00:00Z' },
        { name: '.emptyFolderPlaceholder' },
      ],
      error: null,
    });

    const m = await seedFolderFromStorage(emptyManifest(), 'carousel');
    const files = listFolder(m, 'carousel');

    expect(files.map((e) => e.file)).toEqual(['cu-1.jpg', 'cu-2.jpg']);
    expect(files[0].id).toBe('carousel-cu-1.jpg');
    expect(files[0].v).toBe(Math.floor(Date.parse('2026-01-01T00:00:00Z') / 1000));
    // Không tải ảnh về thì không đo được; 0 nghĩa là chưa biết
    expect(files[0].w).toBe(0);
  });

  it('thư mục đã có bản kê thì không đụng vào, cũng không hỏi kho', async () => {
    const before = withEntry(emptyManifest(), 'carousel', entry('a.jpg'));
    expect(await seedFolderFromStorage(before, 'carousel')).toBe(before);
    expect(listMock).not.toHaveBeenCalled();
  });

  it('vá caption đang có vào những mục vừa chép', async () => {
    listMock.mockResolvedValue({ data: [{ name: 'a.jpg', updated_at: '2026-01-01T00:00:00Z' }], error: null });
    const m = await seedFolderFromStorage(emptyManifest(), 'carousel', { 'a.jpg': 'lời đề cũ' });
    expect(listFolder(m, 'carousel')[0].caption).toBe('lời đề cũ');
  });

  it('liệt kê hỏng thì ném ra — thà đừng ghi còn hơn ghi một bản thiếu ảnh cũ', async () => {
    listMock.mockResolvedValue({ data: null, error: new Error('kho không trả lời') });
    await expect(seedFolderFromStorage(emptyManifest(), 'carousel')).rejects.toThrow('kho không trả lời');
  });
});
