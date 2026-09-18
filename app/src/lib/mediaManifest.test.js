import { describe, it, expect } from 'vitest';
import {
  emptyManifest, parseManifest, serializeManifest, listFolder,
  findEntry, withEntry, withoutEntry, withOrder, buildFromListing,
} from './mediaManifest';

const entry = (file, id) => ({ id, file, v: 100, w: 800, h: 1200, caption: '' });

describe('parseManifest', () => {
  it('trả bản kê rỗng khi không có gì', () => {
    expect(parseManifest(null)).toEqual(emptyManifest());
    expect(parseManifest('')).toEqual(emptyManifest());
  });

  it('không ném lỗi khi gặp JSON hỏng', () => {
    expect(parseManifest('{ hỏng')).toEqual(emptyManifest());
  });

  it('bỏ qua thư mục không phải mảng', () => {
    const m = parseManifest(JSON.stringify({ version: 1, folders: { carousel: 'sai' } }));
    expect(listFolder(m, 'carousel')).toEqual([]);
  });

  it('đọc lại đúng thứ tự đã ghi', () => {
    const m = { version: 1, folders: { carousel: [entry('b.jpg', '2'), entry('a.jpg', '1')] } };
    const back = parseManifest(serializeManifest(m));
    expect(listFolder(back, 'carousel').map((e) => e.file)).toEqual(['b.jpg', 'a.jpg']);
  });
});

describe('findEntry', () => {
  const m = { version: 1, folders: { portraits: [entry('bride.jpg', 'x')] } };

  it('tìm được theo đường dẫn đầy đủ', () => {
    expect(findEntry(m, 'portraits/bride.jpg').id).toBe('x');
  });

  it('trả null khi không có', () => {
    expect(findEntry(m, 'portraits/groom.jpg')).toBeNull();
    expect(findEntry(m, '')).toBeNull();
    expect(findEntry(m, undefined)).toBeNull();
  });
});

describe('withEntry', () => {
  it('thêm vào cuối thư mục', () => {
    const m = withEntry(emptyManifest(), 'carousel', entry('a.jpg', '1'));
    expect(listFolder(m, 'carousel')).toHaveLength(1);
  });

  it('thay entry cùng tên file, giữ nguyên vị trí', () => {
    let m = withEntry(emptyManifest(), 'carousel', entry('a.jpg', '1'));
    m = withEntry(m, 'carousel', entry('b.jpg', '2'));
    m = withEntry(m, 'carousel', { ...entry('a.jpg', '1'), v: 999 });
    const files = listFolder(m, 'carousel');
    expect(files.map((e) => e.file)).toEqual(['a.jpg', 'b.jpg']);
    expect(files[0].v).toBe(999);
  });

  it('không sửa bản kê cũ', () => {
    const before = emptyManifest();
    withEntry(before, 'carousel', entry('a.jpg', '1'));
    expect(listFolder(before, 'carousel')).toEqual([]);
  });
});

describe('withoutEntry', () => {
  it('bỏ đúng entry', () => {
    let m = withEntry(emptyManifest(), 'carousel', entry('a.jpg', '1'));
    m = withEntry(m, 'carousel', entry('b.jpg', '2'));
    m = withoutEntry(m, 'carousel', 'a.jpg');
    expect(listFolder(m, 'carousel').map((e) => e.file)).toEqual(['b.jpg']);
  });
});

describe('withOrder', () => {
  it('sắp lại theo mảng id', () => {
    let m = withEntry(emptyManifest(), 'carousel', entry('a.jpg', '1'));
    m = withEntry(m, 'carousel', entry('b.jpg', '2'));
    m = withOrder(m, 'carousel', ['2', '1']);
    expect(listFolder(m, 'carousel').map((e) => e.file)).toEqual(['b.jpg', 'a.jpg']);
  });

  it('id lạ thì bỏ qua, entry thiếu thì dồn về cuối', () => {
    let m = withEntry(emptyManifest(), 'carousel', entry('a.jpg', '1'));
    m = withEntry(m, 'carousel', entry('b.jpg', '2'));
    m = withOrder(m, 'carousel', ['2', 'khong-ton-tai']);
    expect(listFolder(m, 'carousel').map((e) => e.file)).toEqual(['b.jpg', 'a.jpg']);
  });
});

describe('buildFromListing', () => {
  it('dựng lại từ kho, giữ caption cũ nếu truyền vào', () => {
    const listing = {
      carousel: [{ name: 'a.jpg', updated_at: '2026-01-01T00:00:00Z' }],
    };
    const old = withEntry(emptyManifest(), 'carousel', { ...entry('a.jpg', '1'), caption: 'giữ lại' });
    const m = buildFromListing(listing, old);
    const e = listFolder(m, 'carousel')[0];
    expect(e.file).toBe('a.jpg');
    expect(e.caption).toBe('giữ lại');
    expect(e.v).toBe(Math.floor(Date.parse('2026-01-01T00:00:00Z') / 1000));
  });
});
