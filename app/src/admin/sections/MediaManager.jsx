import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../components/Toast';

const BUCKET = 'media';

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
  {
    group: 'Nhạc nền · Background Music',
    slots: [
      {
        storagePath: 'music/bgm.mp3',
        label: 'Nhạc nền',
        desc: 'Bài nhạc phát khi khách mở thiệp',
        section: 'Nav (music toggle)',
        accept: 'audio/*',
      },
    ],
  },
];

/* ── Multi-file slots: upload multiple files, order by name ── */
const MULTI_SLOTS = [
  {
    folder: 'carousel',
    label: 'Album ảnh · Hero Slider',
    desc: 'Hiển thị trong slider ảnh toàn màn hình ở trang chủ (sau trang tiêu đề). Ảnh sẽ được sắp xếp theo tên file.',
    section: 'Hero',
    accept: 'image/*',
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

/* ── SlotUploader: single-file slot with preview ── */
function SlotUploader({ slot, onToast }) {
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

  useEffect(() => { checkExisting(); }, [slot.storagePath]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    // Keep the target extension for images, or use original for audio/video
    const ext = getFileExtension(file.name);
    const targetBase = fileName.replace(/\.[^.]+$/, '');
    const targetName = `${targetBase}.${ext}`;
    const targetPath = `${folder}/${targetName}`;

    // If extension differs from expected, remove old file first
    if (targetName !== fileName) {
      await supabase.storage.from(BUCKET).remove([slot.storagePath]);
    }

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(targetPath, file, { upsert: true });

    if (error) {
      onToast('Upload failed: ' + error.message);
    } else {
      onToast('Uploaded ' + slot.label);
      setUrl(getPublicUrl(targetPath) + '?t=' + Date.now());
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDelete = async () => {
    // Try removing with various extensions
    await supabase.storage.from(BUCKET).remove([slot.storagePath]);
    setUrl(null);
    onToast('Deleted ' + slot.label);
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
function MultiFileManager({ config, onToast }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [captions, setCaptions] = useState({});
  const [savingCaptions, setSavingCaptions] = useState(false);
  const inputRef = useRef(null);
  const hasCaptions = config.folder === 'carousel';

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

  const handleCaptionBlur = (fileName) => {
    const updated = { ...captions };
    if (!updated[fileName]) delete updated[fileName];
    saveCaptions(updated);
  };

  const fetchFiles = async () => {
    setLoading(true);
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(config.folder, { sortBy: { column: 'name', order: 'asc' } });
    if (!error && data) {
      setFiles(
        data
          .filter((f) => f.name !== '.emptyFolderPlaceholder')
          .map((f) => ({
            ...f,
            url: getPublicUrl(`${config.folder}/${f.name}`) + '?t=' + Date.now(),
          }))
      );
    }
    setLoading(false);
  };

  useEffect(() => { fetchFiles(); fetchCaptions(); }, [config.folder]);

  const handleUpload = async (e) => {
    const selected = Array.from(e.target.files);
    if (!selected.length) return;
    setUploading(true);
    let count = 0;

    for (const file of selected) {
      const path = `${config.folder}/${file.name}`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true });
      if (!error) count++;
    }

    onToast(`Uploaded ${count}/${selected.length} files`);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
    fetchFiles();
  };

  const handleDelete = async (fileName) => {
    const { error } = await supabase.storage.from(BUCKET).remove([`${config.folder}/${fileName}`]);
    if (!error) {
      setFiles((prev) => prev.filter((f) => f.name !== fileName));
      if (hasCaptions && captions[fileName]) {
        const updated = { ...captions };
        delete updated[fileName];
        setCaptions(updated);
        saveCaptions(updated);
      }
      onToast('Deleted');
    }
  };

  return (
    <div className="admin-card">
      <h3>{config.label}</h3>
      <p style={{ fontSize: 13, color: '#A89996', margin: '-12px 0 4px' }}>
        {config.desc}
      </p>
      <div className="slot-section" style={{ marginBottom: 16 }}>Used in: <strong>{config.section}</strong></div>

      {loading ? (
        <div style={{ padding: 20, textAlign: 'center', color: '#A89996' }}>Loading…</div>
      ) : files.length === 0 ? (
        <div style={{ padding: 20, textAlign: 'center', color: '#A89996' }}>
          Chưa có file nào · No files yet
        </div>
      ) : (
        <div className="media-grid">
          {files.map((f) => (
            <div key={f.name} className="media-item">
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
              <button className="delete-btn" onClick={() => handleDelete(f.name)} title="Delete">
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="upload-zone" onClick={() => inputRef.current?.click()}>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={config.accept}
          onChange={handleUpload}
        />
        {uploading ? 'Uploading…' : 'Click to upload · Bấm để tải lên'}
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

  return (
    <div>
      <h1>Media · Quản lý ảnh & nhạc</h1>
      <p className="page-desc">
        Upload ảnh/nhạc vào đúng vị trí — file sẽ tự động được đặt tên và hiển thị trên trang cưới.
        <br />
        <span style={{ fontSize: 12, color: '#c4b8b5' }}>
          Không cần đổi tên file trước khi upload · No need to rename files before uploading
        </span>
      </p>

      {SINGLE_SLOTS.map((group) => (
        <div key={group.group} className="admin-card">
          <h3>{group.group}</h3>
          <div className="slot-grid">
            {group.slots.map((slot) => (
              <SlotUploader key={slot.storagePath} slot={slot} onToast={toast} />
            ))}
          </div>
        </div>
      ))}

      {MULTI_SLOTS.map((config) => (
        <MultiFileManager key={config.folder} config={config} onToast={toast} />
      ))}

      {ToastEl}
    </div>
  );
}
