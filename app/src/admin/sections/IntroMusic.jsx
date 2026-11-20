import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

/**
 * Nhạc của video mở đầu — tách riêng khỏi danh sách nhạc nền (thư mục `music`).
 * site_config:
 *   intro_music       đường dẫn trong kho `media` (intro/music-xxx.mp3); trống = nhạc mặc định
 *   intro_music_name  tên file gốc, chỉ để hiện cho admin
 *   intro_music_start phát từ giây thứ mấy của file (số, mặc định 0)
 * Mặc định: public/assets/intro/intro-music.m4a — "Một đời" bản không lời, đã cắt sẵn từ giây 6
 * cho khớp nhịp video. Trang khách đọc các khoá này trong IntroVideo.jsx.
 */
export const INTRO_MUSIC_DEFAULT = '/assets/intro/intro-music.m4a?v=20261120';
const MAX_MB = 15;
const publicUrl = (p) => supabase.storage.from('media').getPublicUrl(p).data.publicUrl;

async function upsertKey(key, value, label) {
  const { error } = await supabase.from('site_config').upsert(
    { key, value, section: 'general', label, updated_at: new Date().toISOString() },
    { onConflict: 'key' },
  );
  return !error;
}

export default function IntroMusic({ adminConfig, toast }) {
  const { getValue, refetch } = adminConfig;
  const path = getValue('intro_music');
  const name = getValue('intro_music_name');
  const savedStart = getValue('intro_music_start');
  const [start, setStart] = useState('');
  const [busy, setBusy] = useState(false);
  const audioRef = useRef(null);
  const stopRef = useRef(null);

  useEffect(() => { setStart(savedStart || '0'); }, [savedStart]);

  const src = path ? publicUrl(path) : INTRO_MUSIC_DEFAULT;
  const startNum = Math.max(0, Number.parseFloat(String(start).replace(',', '.')) || 0);

  const preview = () => {
    const a = audioRef.current;
    if (!a) return;
    clearTimeout(stopRef.current);
    a.currentTime = startNum;
    a.play().catch(() => toast('Trình duyệt không phát được file này'));
    stopRef.current = setTimeout(() => a.pause(), 20000); // dài bằng cổng thiệp + video đầy đủ
  };

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('audio/')) { toast('Hãy chọn một file nhạc (mp3, m4a…)'); return; }
    if (file.size > MAX_MB * 1024 * 1024) { toast(`File quá lớn (tối đa ${MAX_MB} MB)`); return; }
    setBusy(true);
    const ext = (file.name.split('.').pop() || 'mp3').toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp3';
    const p = `intro/music-${Date.now().toString(36)}.${ext}`;
    const { error } = await supabase.storage.from('media')
      .upload(p, file, { contentType: file.type, cacheControl: '31536000', upsert: false });
    if (error) { setBusy(false); toast('Không tải nhạc lên được'); return; }
    const ok = (await upsertKey('intro_music', p, 'Nhạc video mở đầu (đường dẫn kho media)'))
      && (await upsertKey('intro_music_name', file.name, 'Tên file nhạc video mở đầu'))
      && (await upsertKey('intro_music_start', '0', 'Nhạc video mở đầu: phát từ giây'));
    await refetch();
    setBusy(false);
    toast(ok ? 'Đã đổi nhạc mở đầu — chỉnh "Phát từ giây" nếu cần' : 'Đã tải lên nhưng không lưu được lựa chọn');
  };

  const saveStart = async () => {
    setBusy(true);
    const ok = await upsertKey('intro_music_start', String(startNum), 'Nhạc video mở đầu: phát từ giây');
    await refetch();
    setBusy(false);
    toast(ok ? 'Đã lưu điểm bắt đầu' : 'Không lưu được');
  };

  const useDefault = async () => {
    if (!window.confirm('Quay về nhạc mở đầu mặc định ("Một đời" bản không lời)?')) return;
    setBusy(true);
    const ok = (await upsertKey('intro_music', '', 'Nhạc video mở đầu (đường dẫn kho media)'))
      && (await upsertKey('intro_music_name', '', 'Tên file nhạc video mở đầu'))
      && (await upsertKey('intro_music_start', '0', 'Nhạc video mở đầu: phát từ giây'));
    await refetch();
    setBusy(false);
    toast(ok ? 'Đã dùng lại nhạc mặc định' : 'Không lưu được');
  };

  return (
    <div className="im-block">
      <h4>Nhạc mở đầu</h4>
      <p>
        Bắt đầu đúng lúc khách chạm mở thiệp, riêng với danh sách nhạc nền. Vào nhỏ rồi to dần tới
        mức vừa; hết video thì lắng xuống và nhạc nền của trang bắt đầu. “Phát từ giây” tính từ lúc
        chạm mở thiệp (video chạy sau đó khoảng 1,5 giây).
      </p>
      <div className="im-now">
        <span className="im-label">Đang dùng</span>
        <strong>{path ? (name || path.split('/').pop()) : 'Mặc định — “Một đời” (không lời), đã cắt khớp video'}</strong>
      </div>
      <audio ref={audioRef} src={src} preload="none" controls className="im-audio" />
      <div className="im-row">
        <label className="im-start">
          Phát từ giây
          <input
            type="number"
            min="0"
            step="0.1"
            inputMode="decimal"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <button type="button" className="admin-btn" onClick={preview} disabled={busy}>Nghe thử 20 giây</button>
        <button
          type="button"
          className="admin-btn"
          onClick={saveStart}
          disabled={busy || String(startNum) === String(Number.parseFloat(savedStart || '0') || 0)}
        >
          Lưu điểm bắt đầu
        </button>
      </div>
      <div className="im-row">
        <label className={`admin-btn admin-btn-primary im-upload ${busy ? 'is-busy' : ''}`}>
          {busy ? 'Đang lưu…' : 'Tải nhạc khác lên'}
          <input type="file" accept="audio/*" onChange={pick} disabled={busy} hidden />
        </label>
        {path && (
          <button type="button" className="admin-btn" onClick={useDefault} disabled={busy}>
            Dùng lại nhạc mặc định
          </button>
        )}
      </div>
    </div>
  );
}
