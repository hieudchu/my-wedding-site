import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../components/Toast';
import './AdultShareImage.css';

/**
 * Ảnh xem trước khi gửi link thiệp bố mẹ qua Zalo / Messenger / WhatsApp (2026-11-18).
 * Ảnh tải lên kho `media` ở share/adult-<mã>.jpg (tên mới mỗi lần: Zalo giữ ảnh theo URL và bỏ qua
 * URL có ?v=), rồi ghi đường dẫn vào site_config `share_adult_image`. api/share-adult.js đọc khoá
 * này và ghép vào thẻ og:image khi bot tới. Trống = ảnh mặc định public/og-adult-4.jpg.
 * Ảnh luôn được đưa về 1200×630 JPEG < 120 KB (cắt giữa nếu sai tỉ lệ) ngay trong trình duyệt.
 */

const KEY = 'share_adult_image';
const W = 1200;
const H = 630;
// Zalo không hiện ảnh 149 KB (2026-11-18) dù ảnh ~115 KB thì hiện → giữ dưới 120 KB
const MAX_BYTES = 120 * 1024;
const DEFAULT_IMG = '/og-adult-4.jpg';
const SHARE_LINK = 'https://hieu-minh-wedding.vercel.app/thiep-moi';

const publicUrl = (p) => supabase.storage.from('media').getPublicUrl(p).data.publicUrl;

async function toShareJpeg(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, bad) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => bad(new Error('Không đọc được ảnh'));
      i.src = url;
    });
    const sw = img.naturalWidth;
    const sh = img.naturalHeight;
    // Cắt giữa theo tỉ lệ 1200:630 (giống object-fit: cover)
    const scale = Math.max(W / sw, H / sh);
    const cw = W / scale;
    const ch = H / scale;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, W, H);
    let blob = null;
    for (const q of [0.88, 0.82, 0.78, 0.72, 0.66, 0.6, 0.52]) {
      blob = await new Promise((ok) => canvas.toBlob(ok, 'image/jpeg', q));
      if (blob && blob.size <= MAX_BYTES) break;
    }
    const ratio = sw / sh;
    return {
      blob,
      cropped: Math.abs(ratio - W / H) / (W / H) > 0.02,
      small: sw < W || sh < H,
      size: `${sw}×${sh}`,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function AdultShareImage({ adminConfig }) {
  const { configs, getValue, saveConfig } = adminConfig;
  const { toast, ToastEl } = useToast();
  const current = getValue(KEY);
  const [draft, setDraft] = useState(null); // { blob, preview, cropped, small, size }
  const [busy, setBusy] = useState(false);

  useEffect(() => () => { if (draft?.preview) URL.revokeObjectURL(draft.preview); }, [draft]);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const r = await toShareJpeg(file);
      if (!r.blob) throw new Error('Trình duyệt không nén được ảnh');
      setDraft({ ...r, preview: URL.createObjectURL(r.blob) });
    } catch (err) {
      toast(err.message || 'Không đọc được ảnh');
    }
  };

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    const p = `share/adult-${Date.now().toString(36)}.jpg`;
    const { error } = await supabase.storage.from('media')
      .upload(p, draft.blob, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false });
    if (error) { setBusy(false); toast('Không tải ảnh lên được'); return; }
    const ok = await saveConfig(KEY, p);
    setBusy(false);
    if (!ok) { toast('Đã tải ảnh nhưng không lưu được lựa chọn'); return; }
    setDraft(null);
    toast('Đã đổi ảnh xem trước');
  };

  const useDefault = async () => {
    if (!window.confirm('Quay về ảnh xem trước mặc định?')) return;
    setBusy(true);
    const ok = await saveConfig(KEY, '');
    setBusy(false);
    toast(ok ? 'Đã dùng lại ảnh mặc định' : 'Không lưu được');
  };

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(SHARE_LINK); toast('Đã chép link'); } catch { toast(SHARE_LINK); }
  };

  const shown = draft?.preview || (current ? publicUrl(current) : DEFAULT_IMG);

  return (
    <div className="admin-card sh-card">
      <h3>Ảnh xem trước khi gửi link</h3>
      <p className="sh-note">
        Ảnh hiện trong Zalo, Messenger, WhatsApp khi gửi link thiệp bố mẹ. Nên dùng ảnh ngang
        <strong> 1200 × 630</strong>; ảnh khác tỉ lệ sẽ bị cắt phần giữa.
      </p>
      {!configs[KEY] && <p className="sh-warn">Thiếu dòng {KEY} trong cơ sở dữ liệu — chạy migration 20261118000300.</p>}

      <div className="sh-row">
        <div className="sh-bubble" aria-label="Xem thử như trong Zalo">
          <span className="sh-link">{SHARE_LINK.replace('https://', '')}</span>
          <img src={shown} alt="Ảnh xem trước" />
          <div className="sh-meta">
            <small>hieu-minh-wedding.vercel.app</small>
            <strong>Thiệp mời lễ thành hôn · Đăng Hiếu &amp; Thiện Minh</strong>
            <span>Trân trọng kính mời Quý khách tới dự lễ thành hôn của hai con chúng tôi…</span>
          </div>
        </div>

        <div className="sh-side">
          <p className="sh-state">
            {draft ? 'Ảnh mới — chưa lưu' : current ? 'Đang dùng ảnh đã tải lên' : 'Đang dùng ảnh mặc định'}
          </p>
          {draft && (
            <ul className="sh-checks">
              <li>Ảnh gốc {draft.size} → 1200 × 630, {Math.round(draft.blob.size / 1024)} KB</li>
              {draft.cropped && <li className="warn">Khác tỉ lệ 1200:630 — đã cắt phần giữa, xem lại bên trái</li>}
              {draft.small && <li className="warn">Ảnh nhỏ hơn 1200 × 630 — có thể hơi mờ</li>}
            </ul>
          )}
          <div className="sh-actions">
            <label className="admin-btn admin-btn-secondary sh-file">
              {draft ? 'Chọn ảnh khác' : 'Chọn ảnh mới'}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} hidden />
            </label>
            {draft && (
              <>
                <button type="button" className="admin-btn admin-btn-primary" onClick={save} disabled={busy}>
                  {busy ? 'Đang lưu…' : 'Lưu ảnh này'}
                </button>
                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setDraft(null)} disabled={busy}>Huỷ</button>
              </>
            )}
            {!draft && current && (
              <button type="button" className="admin-btn admin-btn-secondary" onClick={useDefault} disabled={busy}>Dùng ảnh mặc định</button>
            )}
          </div>
          <p className="sh-help">
            Link gửi khách: <button type="button" className="sh-copy" onClick={copyLink}>{SHARE_LINK.replace('https://', '')}</button>
            <br />
            Đổi ảnh xong khoảng 1 phút là bot đọc được ảnh mới. Tin nhắn đã gửi trước đó vẫn giữ ảnh cũ;
            Zalo có thể cần vài phút đến vài giờ cho tin nhắn mới.
          </p>
        </div>
      </div>
      {ToastEl}
    </div>
  );
}
