/**
 * Phần nối giữa trình chỉnh khung (ImageFramer) và kho ảnh — dùng chung cho trang
 * Media và trang Lịch trình, để ba đường tải ảnh không mỗi đường một kiểu.
 *
 * Khung (`fit`) nằm trong bản kê media, cạnh `opt`. Không đụng vào file: khách bấm
 * vào ảnh vẫn xem ảnh đầy đủ. Xem lib/mediaManifest.js › fitFor.
 */
import { useState } from 'react';
import ImageFramer, { FitImg } from './ImageFramer';
import { canFrame } from './framerFrames';
import { compressImage } from '../lib/compressImage';
import { uploadVariants, CACHE_SECONDS } from '../lib/imageVariants';
import { rotateFile } from '../lib/rotateImage';
import { withEntry, listFolder, entryId, nowVersion, variantPaths, fitFor, OPT_DIR } from '../lib/mediaManifest';
import { BUCKET, applyToManifest, seedFolderFromStorage, manifestErrorHint } from '../lib/manifestStore';
import { supabase } from '../lib/supabase';

export { canFrame };

const MEASURE_TIMEOUT_MS = 5000;

/** Kích thước thật của ảnh (đã theo thẻ xoay EXIF). Hỏng thì 0 — bản kê chấp nhận 0. */
export function measure(file) {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) return resolve({ w: 0, h: 0 });
    const url = URL.createObjectURL(file);
    const img = new Image();
    let settled = false;
    const done = (dims) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      resolve(dims);
    };
    // Ảnh hỏng có thể không bắn cả onload lẫn onerror — không có mốc dừng là treo
    const timer = setTimeout(() => done({ w: 0, h: 0 }), MEASURE_TIMEOUT_MS);
    img.onload = () => done({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => done({ w: 0, h: 0 });
    img.src = url;
  });
}

function publicUrl(path, v) {
  const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  return v ? `${url}?v=${v}` : url;
}

/** URL để trình chỉnh mở ảnh đã có: bản nén lớn nhất (≤ 1600px), không thì ảnh gốc. */
export function entrySrc(folder, entry) {
  const variants = variantPaths(folder, entry);
  if (variants.length) return publicUrl(variants[variants.length - 1].path, entry.opt.v);
  return publicUrl(`${folder}/${entry.file}`, entry.v);
}

/**
 * Đường dẫn mọi bản nén của một mục trong kho, để xoá cùng ảnh gốc. Không lọc theo
 * `opt.v` như variantPaths: bản nén cũ cũng là file thừa cần dọn.
 */
export function variantStoragePaths(folder, entry) {
  const opt = entry?.opt;
  if (!opt?.w?.length) return [];
  const base = entry.file.replace(/\.[^.]+$/, '');
  return opt.w.map((w) => `${OPT_DIR}/${folder}/${base}-${w}.${opt.fmt}`);
}

/** Câu trạng thái dưới ô ảnh. */
export function fitStatus(fit) {
  const isCenter = (f) => !f || (f.x === 50 && f.y === 50 && f.z === 1);
  if (!fit || (isCenter(fit.d) && !fit.m)) return { set: false, text: 'Khung: giữa ảnh (chưa chỉnh)' };
  return { set: true, text: 'Khung đã chỉnh · điện thoại ' + (fit.m ? 'có khung riêng' : 'dùng chung') };
}

/** Admin đang ở điện thoại thì mở sẵn hồ sơ Điện thoại — chắc là đang sửa cái vừa thấy. */
const initialProfile = () => (window.innerWidth <= 768 ? 'm' : 'd');

/**
 * Tải một ảnh MỚI lên `folder/fileName`, kèm khung vừa chỉnh.
 *
 * Xoay trước (nếu có), rồi nén, đo, tải lên, sinh bản nén, ghi bản kê. Một mốc `v`
 * cho ảnh, bản nén và khung — lệch nhau là variantPaths/fitFor coi chúng là cũ.
 * Ném lỗi để trình chỉnh hiện "Tải lên chưa được" và giữ nguyên khung cho lần thử lại.
 *
 * `fileName`: chuỗi (ô cố định — đúng tên trang khách đọc), hoặc hàm `(file) => tên`
 * khi tên phụ thuộc đuôi file sau khi nén (nén có thể đổi .png thành .jpg).
 * `captions`: bảng chú thích của carousel (state của trang) — có thì là bản đúng.
 * `extra(next, v, name)` cho người gọi sửa thêm bản kê trong cùng lượt ghi (dọn file cũ…).
 */
export async function uploadFramed({ folder, fileName, picked, result, report, captions, extra }) {
  const rotated = await rotateFile(picked, result.rotate || 0);
  const file = await compressImage(rotated);
  report?.(20);
  const name = typeof fileName === 'function' ? fileName(file) : fileName;
  const { w, h } = await measure(file);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(`${folder}/${name}`, file, { upsert: true, cacheControl: CACHE_SECONDS });
  if (error) throw new Error(error.message || 'không tải được file lên kho');
  report?.(55);
  const opt = await uploadVariants(folder, name, file);
  report?.(90);
  const v = nowVersion();
  try {
    const next = await applyToManifest(async (m) => {
      let seeded = await seedFolderFromStorage(m, folder, captions);
      if (extra) seeded = await extra(seeded, v, name);
      // Thay ảnh cùng tên thì giữ lời đề cũ: chọn lại ảnh không có nghĩa là xoá chú thích
      const old = listFolder(seeded, folder).find((e) => e.file === name);
      const caption = captions ? (captions[name] || '') : (old?.caption || '');
      return withEntry(seeded, folder, {
        id: entryId(folder, name),
        file: name,
        v, w, h,
        caption,
        ...(opt ? { opt: { ...opt, v } } : {}),
        fit: { ...result.fit, v },
      });
    });
    report?.(100);
    return { manifest: next, file, name };
  } catch (err) {
    console.error('Không ghi được bản kê media:', err);
    throw new Error('ảnh đã lên kho nhưng chưa ghi được bản kê · ' + manifestErrorHint(err));
  }
}

/** Lưu khung cho ảnh ĐÃ CÓ — chỉ ghi bản kê, không tải gì. */
export async function saveFit({ folder, fileName, fit, captions }) {
  try {
    return await applyToManifest(async (m) => {
      const seeded = await seedFolderFromStorage(m, folder, captions);
      const old = listFolder(seeded, folder).find((e) => e.file === fileName);
      if (!old) throw new Error('không thấy ảnh này trong kho nữa · bấm “Quét lại kho”');
      // v của khung = v của ảnh lúc này: ảnh bị thay sau đó thì khung tự hết hiệu lực
      return withEntry(seeded, folder, { ...old, fit: { ...fit, v: old.v } });
    });
  } catch (err) {
    console.error('Không lưu được khung:', err);
    throw new Error(err?.message?.startsWith('không thấy') ? err.message : manifestErrorHint(err));
  }
}

/**
 * Ô xem trước nhỏ trên trang Media: mang đúng tỉ lệ + hình của khung máy tính và
 * áp khung máy tính đã lưu. `kind`: arch | blobR | blobL | 45 (xem image-framer.css .if-thumb-*).
 */
export function FitThumb({ kind, src, fit, alt, onClick, children }) {
  return (
    <div className={`slot-preview if-thumb if-thumb-${kind}`} onClick={onClick} title="Bấm để chọn ảnh khác">
      <div className="if-thumb-pic">
        {src ? <FitImg src={src} fit={fit?.d} alt={alt} /> : children}
      </div>
    </div>
  );
}

export { FitImg, fitFor };

/**
 * Trạng thái của trình chỉnh trên một trang. `open({...})` mở nó; `element` đặt
 * vào cuối trang. `onSave(result, report)` trả Promise: resolve → đóng; reject → báo lỗi.
 */
export function useFramer() {
  const [ed, setEd] = useState(null);

  const close = () => {
    if (ed?.objectUrl) URL.revokeObjectURL(ed.objectUrl);
    setEd(null);
  };

  /** Ảnh đã có. */
  const openExisting = ({ slot, label, src, fit, w, h, onSave }) =>
    setEd({ slot, label, src, fit, w, h, isNew: false, onSave });

  /** Ảnh mới vừa chọn — chưa tải gì cho tới khi bấm "Tải lên". */
  const openNew = ({ slot, label, file, onSave, onPickAnother }) => {
    const objectUrl = URL.createObjectURL(file);
    setEd({ slot, label, src: objectUrl, objectUrl, fileName: file.name, fit: null, w: 0, h: 0, isNew: true, onSave, onPickAnother });
  };

  const element = ed && (
    <ImageFramer
      key={ed.slot + ed.src}
      slot={ed.slot}
      label={ed.label}
      src={ed.src}
      isNew={ed.isNew}
      fit={ed.fit}
      naturalW={ed.w}
      naturalH={ed.h}
      fileName={ed.fileName}
      initialProfile={initialProfile()}
      onSave={async (result, report) => {
        await ed.onSave(result, report);
        close();
      }}
      onCancel={close}
      onPickAnother={ed.onPickAnother ? () => { const pick = ed.onPickAnother; close(); pick(); } : undefined}
    />
  );

  return { openExisting, openNew, element, isOpen: !!ed };
}
