import { useState, useEffect, useRef } from 'react';
import { compressImage, describeSaving } from '../../lib/compressImage';
import { runQueue } from '../../lib/uploadQueue';
import {
  parseManifest, serializeManifest, withEntry, withoutEntry, withOrder, listFolder,
  buildFromListing, MEDIA_FOLDERS,
} from '../../lib/mediaManifest';
import { supabase } from '../../lib/supabase';
import { useToast } from '../components/Toast';

const BUCKET = 'media';

// Thư mục duy nhất có ô chú thích. Caption nằm ở hai chỗ nên chỗ nào cũng phải
// gọi đúng tên thư mục này.
const CAPTION_FOLDER = 'carousel';

/* ── Single-file slots: upload any file → auto-renamed to the expected name ── */
const SINGLE_SLOTS = [
  {
    group: 'Trang chủ · Gate',
    slots: [
      {
        storagePath: 'icons/medallion-gold.png',
        label: 'Logo vàng',
        desc: 'Hiển thị giữa trang chủ khi mở cổng',
        section: 'Gate Hero',
        accept: 'image/*',
      },
    ],
  },
  {
    group: 'Thanh điều hướng & Thiệp mời · Nav & Info',
    slots: [
      {
        storagePath: 'icons/medallion-ink.png',
        label: 'Logo mực',
        desc: 'Hiển thị trên thanh menu & trong thiệp mời',
        section: 'Nav + Wedding Info',
        accept: 'image/*',
      },
    ],
  },
  {
    group: 'Gia đình · Family Portraits',
    slots: [
      {
        storagePath: 'portraits/groom.jpg',
        label: 'Ảnh chú rể',
        desc: 'Ảnh chân dung chú rể trong mục Gia đình Nhà trai',
        section: 'Family (Groom)',
        accept: 'image/*',
      },
      {
        storagePath: 'portraits/bride.jpg',
        label: 'Ảnh cô dâu',
        desc: 'Ảnh chân dung cô dâu trong mục Gia đình Nhà gái',
        section: 'Family (Bride)',
        accept: 'image/*',
      },
    ],
  },
  {
    group: 'Ảnh nền thiệp mời · Invitation Backgrounds',
    slots: [
      {
        storagePath: 'background/left.jpg',
        label: 'Ảnh nền trái',
        desc: 'Ảnh blob bên trái thiệp mời',
        section: 'Wedding Info',
        accept: 'image/*',
      },
      {
        storagePath: 'background/right.jpg',
        label: 'Ảnh nền phải',
        desc: 'Ảnh blob bên phải thiệp mời',
        section: 'Wedding Info',
        accept: 'image/*',
      },
      {
        storagePath: 'background/moment-1.jpg',
        label: 'Khoảnh khắc 1',
        desc: 'Ảnh khoảnh khắc phụ',
        section: 'Wedding Info',
        accept: 'image/*',
      },
      {
        storagePath: 'background/moment-2.jpg',
        label: 'Khoảnh khắc 2',
        desc: 'Ảnh khoảnh khắc phụ',
        section: 'Wedding Info',
        accept: 'image/*',
      },
    ],
  },
];

/* ── Multi-file slots: upload multiple files, order by name ── */
const MULTI_SLOTS = [
  {
    folder: 'carousel',
    label: 'Album ảnh · Hero Slider',
    desc: 'Hiển thị trong slider ảnh toàn màn hình ở trang chủ (sau trang tiêu đề). Kéo thả ảnh để đổi thứ tự.',
    section: 'Hero',
    accept: 'image/*',
  },
  {
    folder: 'music',
    label: 'Nhạc nền · Danh sách phát',
    desc: 'Các bài phát khi khách mở thiệp. Tải lên nhiều bài đều được — khách bấm ⏮ ⏭ để chuyển bài. Kéo thả để đổi thứ tự phát.',
    section: 'Nav (trình phát nhạc)',
    accept: 'audio/*',
  },
  {
    folder: 'timeline',
    label: 'Ảnh lịch trình · Timeline Photos',
    desc: 'Ảnh minh hoạ cho từng sự kiện trong Lịch trình. Đặt tên trùng với image_path ở mục Timeline hoặc tải lên rồi chọn từ đó.',
    section: 'Timeline',
    accept: 'image/*',
  },
];

function isImage(name) {
  return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name);
}
function isAudio(name) {
  return /\.(mp3|wav|ogg|m4a)$/i.test(name);
}
function isVideo(name) {
  return /\.(mp4|webm|mov)$/i.test(name);
}

function getFileExtension(name) {
  const m = name.match(/\.([^.]+)$/);
  return m ? m[1].toLowerCase() : '';
}

function getPublicUrl(path) {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

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
const LIST_PAGE_SIZE = 100;
const MAX_LIST_PAGES = 100;   // 10.000 file/thư mục; quá ngần ấy là có chuyện khác

async function listAllInFolder(folder) {
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

// Ảnh hỏng có thể không bắn cả onload lẫn onerror. Không có mốc dừng thì luồng
// treo, khối finally không chạy, và bảng upload kẹt ở "Đang tải lên…" với ô chọn
// file bị khoá cho tới khi tải lại trang — trang này chỉ có một người dùng và
// không có lối vào thứ hai, nên treo là hỏng hẳn.
const MEASURE_TIMEOUT_MS = 5000;

// Đọc kích thước từ chính file đã nén, để bản kê biết ảnh dọc hay ngang.
// File nhạc thì trả 0 — bản kê chấp nhận 0 và trang khách tự xoay xở.
const measure = (file) =>
  new Promise((resolve) => {
    if (!file.type.startsWith('image/')) return resolve({ w: 0, h: 0 });
    const url = URL.createObjectURL(file);
    const img = new Image();
    let timer;
    let settled = false;
    const done = (dims) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      resolve(dims);
    };
    timer = setTimeout(() => done({ w: 0, h: 0 }), MEASURE_TIMEOUT_MS);
    img.onload = () => done({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => done({ w: 0, h: 0 });
    img.src = url;
  });

/**
 * Cả sáu thư mục media ghi vào cùng một hàng site_config. Hai thư mục đọc–sửa–ghi
 * chồng lên nhau thì bản ghi sau đè mất phần của bản ghi trước, mà chẳng có lỗi
 * nào báo. Xếp hàng lại: mỗi lượt đọc–sửa–ghi chạy trọn vẹn rồi mới đến lượt kế.
 */
let manifestChain = Promise.resolve();
function queueManifestWrite(task) {
  const run = manifestChain.then(task, task);
  // Nuốt lỗi ở bản lưu hàng đợi, nếu không một lượt hỏng sẽ chặn mọi lượt sau
  manifestChain = run.then(() => {}, () => {});
  return run;
}

/** Đọc bản kê media. Ném lỗi khi đọc hỏng — người gọi phải biết để đừng ghi đè. */
async function loadManifest() {
  const { data, error } = await supabase
    .from('site_config').select('value').eq('key', 'media_manifest').maybeSingle();
  // Supabase trả lỗi trong kết quả chứ không ném. Nuốt lỗi ở đây là coi bản kê
  // rỗng, rồi ghi đè mất sạch những gì đã ghi trước đó.
  if (error) throw error;
  return parseManifest(data?.value);
}

/** Ghi bản kê media. Ném lỗi khi ghi hỏng. */
async function saveManifest(m) {
  const { error } = await supabase.from('site_config').upsert(
    {
      key: 'media_manifest',
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
function applyToManifest(mutate) {
  return queueManifestWrite(async () => {
    const manifest = await loadManifest();
    await saveManifest(await mutate(manifest));
  });
}

// Một id bền: thư mục + tên file. Cùng công thức với buildFromListing, nên nút
// dựng lại kho sau này không làm đổi id của thứ gì đang có.
const entryId = (folder, file) => `${folder}-${file}`;

/** Mốc sửa đổi của file trong kho, đổi ra giây — dùng làm `v` trong bản kê */
function storageVersion(file) {
  const stamp = file?.updated_at || file?.created_at;
  const ms = stamp ? Date.parse(stamp) : NaN;
  return Number.isNaN(ms) ? 0 : Math.floor(ms / 1000);
}

/**
 * Lần đầu ghi bản kê cho một thư mục thì phải chép luôn những file đã nằm sẵn
 * trong kho vào đó.
 *
 * listMedia() chuyển hẳn sang đọc bản kê ngay khi thư mục có dù chỉ một mục.
 * Thành ra nếu chỉ ghi mấy file vừa tải lên, thư mục đang có ba ảnh mà tải thêm
 * hai sẽ còn đúng hai — ba ảnh cũ biến mất khỏi trang khách, và ở thời điểm này
 * chưa có nút dựng lại kho để chữa.
 */
async function seedFolderFromStorage(m, folder, captionsByFile) {
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

/**
 * Đọc hàng caption của carousel. Hỏng thì trả {} chứ không ném: caption trong
 * bản kê vẫn là nguồn chính, mất phần vá thêm còn hơn huỷ cả lượt quét.
 */
async function loadStoredCaptions() {
  const { data, error } = await supabase
    .from('site_config').select('value').eq('key', 'carousel_captions').maybeSingle();
  if (error) {
    console.error('Không đọc được carousel_captions:', error);
    return {};
  }
  try {
    const parsed = JSON.parse(data?.value || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Vá caption cho những mục vừa dựng lại mà đang trống.
 *
 * buildFromListing chỉ giữ được caption của file mà bản kê CŨ từng biết. Nhưng
 * cảnh hay phải quét lại nhất lại là cảnh bản kê ghi hỏng giữa chừng: file nằm
 * trong kho mà bản kê không có, caption của nó chỉ còn ở hàng carousel_captions.
 * Không lấy lại từ đó thì nút này chữa được ảnh nhưng vẫn xoá trắng lời đề.
 *
 * Chỉ đắp vào chỗ đang trống, không đè lên caption bản kê đang giữ — người dùng
 * xoá trắng một caption thì hàng carousel_captions cũng đã xoá hẳn khoá đó, nên
 * hai bên không cãi nhau.
 */
function withStoredCaptions(m, captionsByFile) {
  let next = m;
  for (const entry of listFolder(m, CAPTION_FOLDER)) {
    if (entry.caption) continue;
    const stored = captionsByFile?.[entry.file];
    if (!stored) continue;
    // withEntry thay tại chỗ theo tên file, nên thứ tự vừa dựng không xê dịch
    next = withEntry(next, CAPTION_FOLDER, { ...entry, caption: stored });
  }
  return next;
}

/**
 * Dựng lại bản kê từ kho — đường chữa cho mọi kiểu lệch: ghi hỏng giữa chừng,
 * file bị xoá thẳng trên Supabase Dashboard, file tải lên ngoài trang này.
 *
 * Ba điều phải giữ đúng:
 *
 * 1. Đi qua applyToManifest. Bản kê cũ mà hàm nhận được chính là bản đọc trong
 *    hàng đợi, nên lượt quét không đè lên một lượt ghi đang dở, và cũng không bị
 *    lượt ghi nào chen vào giữa lúc đọc và lúc ghi.
 *
 * 2. Liệt kê kho BÊN TRONG hàng đợi, sau khi đã đọc bản kê. Kho bao giờ cũng có
 *    file trước khi bản kê có (upload đẩy file lên rồi mới ghi bản kê), nên đọc
 *    bản kê trước rồi mới liệt kê thì danh sách kho luôn phủ hết bản kê — không
 *    có file nào vừa nằm trong bản kê cũ vừa lọt khỏi danh sách mới.
 *
 * 3. Gom đủ cả sáu thư mục rồi mới dựng. buildFromListing dựng từ con số không:
 *    thư mục nào vắng mặt trong listing là mất sạch khỏi bản kê. Một thư mục đọc
 *    hỏng thì ném ra ngay tại đây, applyToManifest không gọi tới saveManifest, và
 *    bản kê cũ còn nguyên — ghi ba thư mục rồi bỏ rơi ba thư mục còn tệ hơn nhiều.
 */
async function rebuildManifestFromStorage() {
  return applyToManifest(async (previous) => {
    const listing = {};
    for (const folder of MEDIA_FOLDERS) {
      listing[folder] = await listAllInFolder(folder);
    }
    // previous là bản kê cũ: nhờ nó mà caption, thứ tự, id và kích thước của
    // những file vẫn còn trong kho sống sót qua lượt dựng lại. Thiếu tham số này
    // là nút chữa bản kê biến thành nút xoá trắng caption.
    const rebuilt = buildFromListing(listing, previous);
    return withStoredCaptions(rebuilt, await loadStoredCaptions());
  });
}

/* ── SlotUploader: single-file slot with preview ── */
function SlotUploader({ slot, onToast, reloadKey }) {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const folder = slot.storagePath.split('/')[0];
  const fileName = slot.storagePath.split('/').slice(1).join('/');

  const checkExisting = async () => {
    setLoading(true);
    const { data } = await supabase.storage
      .from(BUCKET)
      .list(folder, { search: fileName });
    if (data?.some((f) => f.name === fileName)) {
      setUrl(getPublicUrl(slot.storagePath) + '?t=' + Date.now());
    } else {
      setUrl(null);
    }
    setLoading(false);
  };

  // reloadKey đổi sau mỗi lượt quét lại kho: ảnh vừa bị xoá tay trên Dashboard
  // phải biến khỏi ô xem trước, nếu không người dùng tưởng quét hụt.
  useEffect(() => { checkExisting(); }, [slot.storagePath, reloadKey]);

  const handleUpload = async (e) => {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setUploading(true);

    // Nén trước khi tải lên để kho ảnh không bao giờ chứa file 24 megapixel
    const file = await compressImage(picked);
    const saved = describeSaving(picked, file);

    // Keep the target extension for images, or use original for audio/video
    const ext = getFileExtension(file.name);
    const targetBase = fileName.replace(/\.[^.]+$/, '');
    const targetName = `${targetBase}.${ext}`;
    const targetPath = `${folder}/${targetName}`;

    // If extension differs from expected, remove old file first
    if (targetName !== fileName) {
      await supabase.storage.from(BUCKET).remove([slot.storagePath]);
    }

    // Đo trước khi tải lên, để bản kê biết ảnh dọc hay ngang
    const { w, h } = await measure(file);

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(targetPath, file, { upsert: true });

    if (error) {
      onToast('Upload failed: ' + error.message);
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    onToast('Đã tải lên ' + slot.label + (saved ? ` · nén ${saved}` : ''));
    setUrl(getPublicUrl(targetPath) + '?t=' + Date.now());

    // portraits/background/icons cũng phải có mặt trong bản kê, nếu không ba
    // thư mục này ở lại đường liệt kê cũ mãi mãi và số lượt gọi không giảm nổi.
    // Đi chung applyToManifest với các bảng thư mục để không giẫm chân nhau.
    try {
      await applyToManifest(async (m) => {
        let next = await seedFolderFromStorage(m, folder);
        // Đổi đuôi file thì bản cũ đã bị xoá khỏi kho, gỡ luôn khỏi bản kê
        if (targetName !== fileName) next = withoutEntry(next, folder, fileName);
        return withEntry(next, folder, {
          id: entryId(folder, targetName),
          file: targetName,
          v: Math.floor(Date.now() / 1000),
          w,
          h,
          caption: '',
        });
      });
    } catch (err) {
      console.error('Không ghi được bản kê media:', err);
      onToast('Đã tải file lên kho nhưng chưa ghi được bản kê · thử lại hoặc quét lại kho');
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDelete = async () => {
    // Try removing with various extensions
    await supabase.storage.from(BUCKET).remove([slot.storagePath]);
    setUrl(null);
    try {
      await applyToManifest((m) => withoutEntry(m, folder, fileName));
      onToast('Deleted ' + slot.label);
    } catch (err) {
      console.error('Không ghi được bản kê media:', err);
      onToast('Đã xoá file nhưng chưa cập nhật được bản kê · thử lại');
    }
  };

  return (
    <div className="slot-card">
      <div className="slot-preview" onClick={() => inputRef.current?.click()}>
        {loading ? (
          <div className="slot-empty">...</div>
        ) : url && isImage(slot.storagePath) ? (
          <img src={url} alt={slot.label} />
        ) : url && isAudio(slot.storagePath) ? (
          <div className="slot-audio">
            <div style={{ fontSize: 24 }}>&#9835;</div>
            <audio controls src={url} style={{ width: '100%', marginTop: 8 }} onClick={(e) => e.stopPropagation()} />
          </div>
        ) : url ? (
          <div className="slot-empty" style={{ color: '#5e7d6f' }}>Uploaded</div>
        ) : (
          <div className="slot-empty">
            {uploading ? 'Uploading…' : '+ Upload'}
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={slot.accept}
          onChange={handleUpload}
          style={{ display: 'none' }}
        />
      </div>
      <div className="slot-info">
        <div className="slot-label">{slot.label}</div>
        <div className="slot-desc">{slot.desc}</div>
        <div className="slot-section">Used in: <strong>{slot.section}</strong></div>
        {url && (
          <button className="admin-btn admin-btn-danger" style={{ marginTop: 8, padding: '5px 12px', fontSize: 11 }} onClick={handleDelete}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

/* ── MultiFileManager: folder with multiple files ── */
function MultiFileManager({ config, onToast, reloadKey }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(null);   // { done, total } | null
  const [pending, setPending] = useState([]);       // thumbnail tạm, dựng từ file cục bộ
  const [captions, setCaptions] = useState({});
  const [savingCaptions, setSavingCaptions] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [overIndex, setOverIndex] = useState(null);   // thẻ đang được nhắm thả vào
  const inputRef = useRef(null);
  const dragFrom = useRef(null);                      // { index, name } của thẻ đang nhấc
  const dragBlocked = useRef(false);
  const hasCaptions = config.folder === CAPTION_FOLDER;

  // Đang ghi thứ tự thì khoá mọi thứ khác động vào `files`: lỡ ghi hỏng còn trả
  // lưới về đúng bản trước đó được.
  const busy = uploading || reordering;

  const fetchCaptions = async () => {
    if (!hasCaptions) return;
    const { data } = await supabase
      .from('site_config')
      .select('value')
      .eq('key', 'carousel_captions')
      .single();
    if (data?.value) {
      try { setCaptions(JSON.parse(data.value)); } catch { setCaptions({}); }
    }
  };

  const saveCaptions = async (updated) => {
    setSavingCaptions(true);
    const { error } = await supabase
      .from('site_config')
      .upsert({ key: 'carousel_captions', value: JSON.stringify(updated), updated_at: new Date().toISOString() }, { onConflict: 'key' });
    setSavingCaptions(false);
    if (!error) {
      onToast('Captions saved');
    } else {
      onToast('Error saving captions');
    }
  };

  const handleCaptionChange = (fileName, value) => {
    setCaptions((prev) => ({ ...prev, [fileName]: value }));
  };

  const handleCaptionBlur = async (fileName) => {
    const updated = { ...captions };
    if (!updated[fileName]) delete updated[fileName];
    await saveCaptions(updated);

    // Bản kê giữ một bản sao của caption. Không cập nhật ở đây thì trang khách
    // đọc bản kê sẽ mãi hiện caption của lúc tải lên, còn mọi lần sửa sau đều
    // vô hình — kể cả lần xoá trắng.
    try {
      await applyToManifest(async (m) => {
        const seeded = await seedFolderFromStorage(m, config.folder, updated);
        const old = listFolder(seeded, config.folder).find((en) => en.file === fileName);
        if (!old) return seeded;
        return withEntry(seeded, config.folder, { ...old, caption: updated[fileName] || '' });
      });
    } catch (err) {
      console.error('Không ghi được caption vào bản kê media:', err);
      onToast('Đã lưu caption nhưng chưa ghi được vào bản kê · thử lại');
    }
  };

  const fetchFiles = async () => {
    setLoading(true);
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(config.folder, { sortBy: { column: 'name', order: 'asc' } });
    if (!error && data) {
      const listed = data.filter((f) => f.name !== '.emptyFolderPlaceholder');

      // Trang khách xếp ảnh theo bản kê, nên lưới ở đây cũng phải theo bản kê —
      // nếu không, kéo xong tải lại trang là thấy thứ tự cũ và tưởng mất công vô ích.
      // Đọc bản kê hỏng thì lùi về thứ tự tên file, vẫn hơn là không hiện gì.
      let order = [];
      try {
        order = listFolder(await loadManifest(), config.folder).map((e) => e.file);
      } catch (err) {
        console.error('Không đọc được bản kê media:', err);
      }
      const rank = new Map(order.map((file, i) => [file, i]));
      // File có trong kho mà chưa có trong bản kê thì dồn về cuối, giữ thứ tự tên.
      const sorted = listed
        .map((f, i) => ({ f, key: rank.has(f.name) ? rank.get(f.name) : order.length + i }))
        .sort((a, b) => a.key - b.key)
        .map(({ f }) => f);

      setFiles(
        sorted.map((f) => ({
          ...f,
          url: getPublicUrl(`${config.folder}/${f.name}`) + '?t=' + Date.now(),
        }))
      );
    }
    setLoading(false);
  };

  /**
   * Kéo thả chỉ ghi lại thứ tự trong bản kê — KHÔNG đổi tên file và KHÔNG tải lại
   * gì cả, vì đổi tên là phá cache ảnh của khách và làm caption mồ côi.
   */
  const handleReorder = async (source, to) => {
    const from = source?.index;
    if (from == null || to == null || from === to) return;
    const before = files;
    if (from < 0 || from >= before.length || to < 0 || to >= before.length) return;
    // Lưới có thể đã đổi giữa lúc nhấc và lúc thả. Chỉ số cũ khi đó trỏ sang ảnh
    // khác, thả theo là sắp nhầm ảnh mà không ai biết.
    if (before[from].name !== source.name) {
      onToast('Danh sách vừa thay đổi · thử kéo lại');
      return;
    }

    const next = [...before];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setFiles(next);
    setReordering(true);

    try {
      await applyToManifest(async (m) => {
        // Thư mục chưa có bản kê thì chép cả kho vào trước: withOrder không tạo
        // được mục mới, nên không chép thì thứ tự này chẳng lưu vào đâu cả — mà
        // chép thiếu thì trang khách mất ảnh.
        const seeded = await seedFolderFromStorage(m, config.folder, captions);
        const list = listFolder(seeded, config.folder);
        // Lấy id thật trong bản kê chứ không tự dựng lại: mục cũ có thể mang id
        // đời trước. Mục không có trong lưới thì withOrder giữ nguyên, dồn về cuối.
        const ids = next
          .map((f) => list.find((en) => en.file === f.name)?.id)
          .filter(Boolean);
        return withOrder(seeded, config.folder, ids);
      });
      onToast('Đã lưu thứ tự');
    } catch (err) {
      console.error('Không ghi được thứ tự vào bản kê media:', err);
      // Lỗi ở đây KHÔNG có nghĩa là bản kê còn nguyên: mất mạng sau khi lệnh ghi
      // đã tới máy chủ cũng ném đúng lỗi này. Trả lưới về bản cũ cho đỡ trống mắt,
      // rồi đọc lại từ bản kê để lưới hiện đúng thứ tự đang thực sự được lưu,
      // ngả nào cũng vậy — đoán thay vì đọc là lại rơi vào cảnh màn hình một
      // đằng dữ liệu một nẻo.
      setFiles(before);
      await fetchFiles();
      onToast('Lưu thứ tự không xong · đã đọc lại danh sách');
    } finally {
      setReordering(false);
    }
  };

  // Quét lại kho ghi đè bản kê, mà lưới này xếp theo bản kê — đọc lại cả hai
  // sau mỗi lượt quét, nếu không màn hình một đằng dữ liệu một nẻo.
  useEffect(() => { fetchFiles(); fetchCaptions(); }, [config.folder, reloadKey]);

  const handleUpload = async (e) => {
    const selected = Array.from(e.target.files);
    if (!selected.length) return;
    setUploading(true);
    setProgress({ done: 0, total: selected.length });

    // Hiện thumbnail ngay từ file cục bộ, không đợi mạng
    const previews = selected.map((f) => ({
      name: f.name,
      isImage: f.type.startsWith('image/'),
      url: URL.createObjectURL(f),
    }));
    setPending(previews);

    let savedBytes = 0;

    try {
      const results = await runQueue(
        selected,
        async (picked) => {
          const file = await compressImage(picked);
          savedBytes += Math.max(0, picked.size - file.size);
          const { w, h } = await measure(file);
          const path = `${config.folder}/${file.name}`;
          const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
          if (error) throw error;
          return { file: file.name, w, h };
        },
        {
          concurrency: 3,
          // onProgress báo việc *vừa xong*, không phải việc đang chạy. Ba luồng
          // cùng bay thì hai thứ đó khác nhau — nên chỉ đếm số việc đã xong,
          // đừng đọc thành "đang tải ảnh thứ n" kẻo con số nhảy loạn.
          onProgress: ({ done, total }) => setProgress({ done, total }),
        }
      );

      const ok = results.filter((r) => r.ok).length;
      const savedMb = (savedBytes / 1048576).toFixed(1);
      onToast(`Đã tải lên ${ok}/${selected.length} file` + (savedBytes > 0 ? ` · tiết kiệm ${savedMb} MB` : ''));

      if (ok > 0) {
        // Đọc bản kê ngay trước lúc ghi chứ không đọc từ đầu mẻ: mẻ 30 ảnh chạy
        // vài phút, giữ bản đọc cũ suốt ngần ấy thời gian là mời người khác đè lên.
        const stamp = Math.floor(Date.now() / 1000);
        await applyToManifest(async (m) => {
          // Thư mục chưa có trong bản kê thì chép cả kho vào trước, rồi mới đặt
          // mấy file vừa tải lên đè lên trên. Thiếu bước này, lần tải đầu tiên
          // vào một thư mục sẽ làm mọi ảnh cũ biến mất khỏi trang khách.
          let next = await seedFolderFromStorage(m, config.folder, captions);
          for (const r of results) {
            if (!r.ok) continue;   // file lỗi thì không được có mặt trong bản kê
            const old = listFolder(next, config.folder).find((en) => en.file === r.value.file);
            next = withEntry(next, config.folder, {
              id: entryId(config.folder, r.value.file),
              file: r.value.file,
              v: stamp,
              w: r.value.w,
              h: r.value.h,
              // Thư mục có ô caption thì state `captions` là bản đúng: xoá trắng
              // là xoá hẳn khoá, nên không được lấy caption cũ ra đắp lại.
              caption: hasCaptions ? (captions[r.value.file] || '') : (old?.caption || ''),
            });
          }
          return next;
        });
      }
    } catch (err) {
      // File đã nằm trong kho rồi, chỉ bản kê là chưa kịp ghi. Nói rõ để còn quét lại,
      // chứ im lặng thì trang khách thiếu ảnh mà không ai hiểu vì sao.
      console.error('Không ghi được bản kê media:', err);
      onToast('Đã tải file lên kho nhưng chưa ghi được bản kê · thử lại hoặc quét lại kho');
    } finally {
      setPending([]);
      setProgress(null);
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
      // Thu hồi sau khi React đã gỡ mấy thẻ <img> xuống. Thu hồi ngay tại đây là
      // thu trước lúc vẽ lại, nên có một nhịp ảnh đang hiện trỏ vào URL đã huỷ.
      setTimeout(() => previews.forEach((p) => URL.revokeObjectURL(p.url)), 0);
      fetchFiles();
    }
  };

  const handleDelete = async (fileName) => {
    const { error } = await supabase.storage.from(BUCKET).remove([`${config.folder}/${fileName}`]);
    if (error) {
      onToast('Không xoá được file · ' + error.message);
      return;
    }
    setFiles((prev) => prev.filter((f) => f.name !== fileName));
    if (hasCaptions && captions[fileName]) {
      const updated = { ...captions };
      delete updated[fileName];
      setCaptions(updated);
      saveCaptions(updated);
    }
    try {
      await applyToManifest((m) => withoutEntry(m, config.folder, fileName));
      onToast('Đã xoá');
    } catch (err) {
      console.error('Không ghi được bản kê media:', err);
      onToast('Đã xoá file nhưng chưa cập nhật được bản kê · thử lại');
    }
  };

  return (
    <div className="admin-card">
      <h3>{config.label}</h3>
      <p style={{ fontSize: 13, color: '#A89996', margin: '-12px 0 4px' }}>
        {config.desc}
      </p>
      <div className="slot-section" style={{ marginBottom: 16 }}>Used in: <strong>{config.section}</strong></div>

      {progress && (
        <div className="upload-progress">
          Đang tải lên {progress.done}/{progress.total}…
        </div>
      )}
      {pending.length > 0 && (
        <div className="media-grid file-grid">
          {pending.map((p) => (
            <div key={p.url} className="media-item file-card pending">
              {p.isImage ? (
                <img src={p.url} alt="" />
              ) : (
                <div className="audio-placeholder"><div style={{ fontSize: 16 }}>&#9835;</div></div>
              )}
              <div className="file-name">{p.name}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 20, textAlign: 'center', color: '#A89996' }}>Loading…</div>
      ) : files.length === 0 && pending.length === 0 ? (
        <div style={{ padding: 20, textAlign: 'center', color: '#A89996' }}>
          Chưa có file nào · No files yet
        </div>
      ) : (
        <div className="media-grid">
          {files.map((f, index) => (
            <div
              key={f.name}
              className={'media-item' + (overIndex === index ? ' drag-over' : '')}
              draggable={!busy}
              // Bấm vào ô caption, nút xoá hay thanh nhạc thì không được kéo cả
              // thẻ: Firefox bắt đầu kéo thẻ cha ngay cả khi nhấn trong ô nhập,
              // và ở đó dragstart báo thẻ cha nên chỉ xem e.target là không đủ.
              onPointerDown={(e) => {
                dragBlocked.current = !!e.target?.closest?.('input, textarea, button, audio, a');
              }}
              onDragStart={(e) => {
                if (dragBlocked.current) { e.preventDefault(); return; }
                dragFrom.current = { index, name: f.name };
                e.dataTransfer.effectAllowed = 'move';
                // Vài trình duyệt không khởi động kéo nếu dataTransfer rỗng
                try { e.dataTransfer.setData('text/plain', f.name); } catch { /* không sao */ }
              }}
              onDragEnd={() => { dragFrom.current = null; setOverIndex(null); }}
              onDragOver={(e) => {
                // Không phải kéo thẻ trong lưới (kéo file từ máy vào) thì mặc kệ
                if (!dragFrom.current) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (overIndex !== index) setOverIndex(index);
              }}
              onDragLeave={(e) => {
                // Đi từ ảnh sang tên file vẫn là đang ở trong thẻ, đừng tắt viền
                if (e.currentTarget.contains(e.relatedTarget)) return;
                setOverIndex((cur) => (cur === index ? null : cur));
              }}
              onDrop={(e) => {
                e.preventDefault();
                const source = dragFrom.current;
                dragFrom.current = null;
                setOverIndex(null);
                handleReorder(source, index);
              }}
            >
              {isImage(f.name) && <img src={f.url} alt={f.name} />}
              {isVideo(f.name) && <video src={f.url} />}
              {isAudio(f.name) && (
                <div className="audio-placeholder">
                  <div>
                    <div style={{ fontSize: 16, marginTop: 8 }}>&#9835;</div>
                    <audio controls src={f.url} style={{ width: '100%', marginTop: 8 }} />
                  </div>
                </div>
              )}
              {!isImage(f.name) && !isVideo(f.name) && !isAudio(f.name) && (
                <div className="audio-placeholder">?</div>
              )}
              <div className="file-name">{f.name}</div>
              {hasCaptions && (
                <input
                  type="text"
                  className="caption-input"
                  placeholder="Chú thích · Caption"
                  value={captions[f.name] || ''}
                  onChange={(e) => handleCaptionChange(f.name, e.target.value)}
                  onBlur={() => handleCaptionBlur(f.name)}
                />
              )}
              {/* Khoá lúc đang ghi thứ tự: xoá giữa chừng thì không còn lưới cũ để trả về */}
              <button
                className="delete-btn"
                onClick={() => handleDelete(f.name)}
                disabled={reordering}
                title="Delete"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="upload-zone" onClick={() => { if (!busy) inputRef.current?.click(); }}>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={config.accept}
          disabled={busy}
          onChange={handleUpload}
        />
        {/* Khoá lúc đang tải: chọn thêm mẻ nữa giữa chừng là hai lượt ghi bản kê đè nhau.
            Khoá cả lúc đang ghi thứ tự, vì tải xong là đọc lại danh sách, đè mất
            thứ tự vừa kéo. */}
        {uploading ? 'Đang tải lên…' : reordering ? 'Đang lưu thứ tự…' : 'Click to upload · Bấm để tải lên'}
        <div style={{ fontSize: 12, marginTop: 4, color: '#c4b8b5' }}>
          Tải nhiều file cùng lúc · Upload multiple files at once
        </div>
      </div>
    </div>
  );
}

/* ── Main MediaManager ── */
export default function MediaManager() {
  const { toast, ToastEl } = useToast();
  const [rescanning, setRescanning] = useState(false);
  const [rescanError, setRescanError] = useState(null);
  // Tăng sau mỗi lượt quét xong, để các bảng con đọc lại kho và bản kê
  const [reloadKey, setReloadKey] = useState(0);

  const handleRescan = async () => {
    // Bấm hai lần thì lượt sau xếp hàng sau lượt trước và quét lại y hệt — vô
    // hại, nhưng nút vẫn khoá cho khỏi tưởng lần đầu hụt.
    if (rescanning) return;
    setRescanning(true);
    setRescanError(null);
    try {
      await rebuildManifestFromStorage();
      toast('Đã dựng lại bản kê từ kho');
    } catch (err) {
      // Lỗi ở đây KHÔNG chắc là bản kê còn nguyên: hỏng lúc liệt kê kho thì
      // chưa ghi gì thật, nhưng mất mạng sau khi lệnh ghi đã tới máy chủ cũng
      // ném đúng lỗi này. Nên đừng hứa hẹn gì về bản kê — chỉ mời bấm lại, mà
      // bấm lại thì an toàn: quét lại kho chạy mấy lần cũng ra đúng một kết quả.
      console.error('Quét lại kho không xong:', err);
      setRescanError(err?.message || String(err));
      toast('Quét lại kho không xong · bấm quét lại lần nữa');
    } finally {
      // Đọc lại ngả nào cũng vậy, kể cả khi hỏng: không biết bản kê đã đổi hay
      // chưa thì phải đi đọc, chứ đoán là lại rơi vào cảnh màn hình một đằng
      // dữ liệu một nẻo.
      setReloadKey((n) => n + 1);
      // finally chứ không phải cuối khối try: ném lỗi mà nút kẹt ở "Đang quét…"
      // là hết đường bấm lại, phải tải lại trang mới chữa được.
      setRescanning(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <h1>Media · Quản lý ảnh & nhạc</h1>
        <button
          className="admin-btn admin-btn-secondary"
          onClick={handleRescan}
          disabled={rescanning}
          style={rescanning ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
          title="Đọc lại toàn bộ kho và dựng lại bản kê · giữ nguyên chú thích và thứ tự"
        >
          {rescanning ? 'Đang quét…' : 'Quét lại kho'}
        </button>
      </div>
      <p className="page-desc">
        Upload ảnh/nhạc vào đúng vị trí — file sẽ tự động được đặt tên và hiển thị trên trang cưới.
        <br />
        <span style={{ fontSize: 12, color: '#c4b8b5' }}>
          Không cần đổi tên file trước khi upload · No need to rename files before uploading
          <br />
          Trang khách hiện sai so với kho (thiếu ảnh, thừa ô hỏng)? Bấm <strong>Quét lại kho</strong> —
          chú thích và thứ tự của những file còn trong kho được giữ nguyên.
        </span>
      </p>

      {rescanError && (
        <div className="admin-card" style={{ borderColor: '#c0392b', color: '#c0392b', padding: 16, fontSize: 13 }}>
          Quét lại kho không xong. Danh sách bên dưới vừa được đọc lại, nên nó đang hiện đúng
          tình hình thật. <strong>Bấm “Quét lại kho” lần nữa là an toàn</strong> — quét bao nhiêu
          lần cũng ra cùng một kết quả.
          <div style={{ fontSize: 12, marginTop: 6, color: '#A89996' }}>{rescanError}</div>
        </div>
      )}

      {SINGLE_SLOTS.map((group) => (
        <div key={group.group} className="admin-card">
          <h3>{group.group}</h3>
          <div className="slot-grid">
            {group.slots.map((slot) => (
              <SlotUploader key={slot.storagePath} slot={slot} onToast={toast} reloadKey={reloadKey} />
            ))}
          </div>
        </div>
      ))}

      {MULTI_SLOTS.map((config) => (
        <MultiFileManager key={config.folder} config={config} onToast={toast} reloadKey={reloadKey} />
      ))}

      {ToastEl}
    </div>
  );
}
