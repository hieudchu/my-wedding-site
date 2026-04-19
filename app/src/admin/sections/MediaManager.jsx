import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../components/Toast';

const FOLDERS = [
  { path: 'icons', label: 'Icons · Logo', hint: 'medallion-gold.png, medallion-ink.png' },
  { path: 'portraits', label: 'Chân dung · Portraits', hint: 'groom.jpg, bride.jpg' },
  { path: 'carousel', label: 'Carousel · Album ảnh', hint: 'Đặt tên 01-xxx, 02-xxx… để sắp xếp thứ tự' },
  { path: 'timeline', label: 'Timeline · Lịch trình', hint: 'photo.jpg, welcome.jpg, ceremony.jpg, vows.jpg, reception.jpg' },
  { path: 'background', label: 'Background · Ảnh nền', hint: 'left.jpg, right.jpg, moment-1.jpg, moment-2.jpg' },
  { path: 'music', label: 'Nhạc nền · Music', hint: 'bgm.mp3' },
];

const BUCKET = 'media';

function isImage(name) {
  return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name);
}
function isAudio(name) {
  return /\.(mp3|wav|ogg|m4a)$/i.test(name);
}
function isVideo(name) {
  return /\.(mp4|webm|mov)$/i.test(name);
}

export default function MediaManager() {
  const [activeFolder, setActiveFolder] = useState('icons');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const { toast, ToastEl } = useToast();

  const fetchFiles = async (folder) => {
    setLoading(true);
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(folder, { sortBy: { column: 'name', order: 'asc' } });

    if (!error && data) {
      setFiles(
        data
          .filter((f) => f.name !== '.emptyFolderPlaceholder')
          .map((f) => ({
            ...f,
            url: supabase.storage.from(BUCKET).getPublicUrl(`${folder}/${f.name}`).data.publicUrl,
          }))
      );
    } else {
      setFiles([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchFiles(activeFolder); }, [activeFolder]);

  const handleUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (!selectedFiles.length) return;

    setUploading(true);
    let count = 0;

    for (const file of selectedFiles) {
      const path = `${activeFolder}/${file.name}`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true });

      if (!error) count++;
    }

    toast(`Uploaded ${count}/${selectedFiles.length} files`);
    setUploading(false);
    fileInputRef.current.value = '';
    fetchFiles(activeFolder);
  };

  const handleDelete = async (fileName) => {
    const path = `${activeFolder}/${fileName}`;
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (!error) {
      setFiles((prev) => prev.filter((f) => f.name !== fileName));
      toast('Deleted');
    }
  };

  const folderInfo = FOLDERS.find((f) => f.path === activeFolder);

  return (
    <div>
      <h1>Media · Quản lý ảnh & nhạc</h1>
      <p className="page-desc">Upload, thay thế hoặc xóa ảnh/nhạc. Thay đổi hiển thị ngay trên trang cưới.</p>

      <div className="admin-card" style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {FOLDERS.map((f) => (
            <button
              key={f.path}
              className={`admin-btn ${activeFolder === f.path ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
              onClick={() => setActiveFolder(f.path)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-card">
        <h3>{folderInfo?.label}</h3>
        {folderInfo?.hint && (
          <p style={{ fontSize: 13, color: '#A89996', margin: '-12px 0 16px' }}>
            {folderInfo.hint}
          </p>
        )}

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
                <button className="delete-btn" onClick={() => handleDelete(f.name)} title="Delete">
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,audio/*,video/*"
            onChange={handleUpload}
          />
          {uploading ? 'Uploading…' : 'Click to upload · Bấm để tải lên'}
          <div style={{ fontSize: 12, marginTop: 4, color: '#c4b8b5' }}>
            Tải cùng tên file để thay thế · Upload same filename to replace
          </div>
        </div>
      </div>
      {ToastEl}
    </div>
  );
}
