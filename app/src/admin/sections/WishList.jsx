import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../components/Toast';
import { downloadExcel, excelDateVN, datedName } from '../exportExcel';

/** Giờ Việt Nam, dạng dd/MM HH:mm — ngày trước giờ sau, cho dễ đọc */
function timeVN(iso) {
  if (!iso) return '—';
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    hour12: false, timeZone: 'Asia/Ho_Chi_Minh',
  }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.day}/${p.month} ${p.hour}:${p.minute}`;
}

export default function WishList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHidden, setShowHidden] = useState(false);
  const [q, setQ] = useState('');
  const { toast, ToastEl } = useToast();

  const fetchAll = async () => {
    const { data } = await supabase
      .from('wishes')
      .select('id, created_at, name, message, is_preset, hidden')
      .order('created_at', { ascending: false });
    if (data) setRows(data);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const toggleHidden = async (w) => {
    const { error } = await supabase.from('wishes').update({ hidden: !w.hidden }).eq('id', w.id);
    if (error) { toast('Không lưu được'); return; }
    setRows((prev) => prev.map((x) => (x.id === w.id ? { ...x, hidden: !x.hidden } : x)));
    toast(w.hidden ? 'Đã hiện lại' : 'Đã ẩn');
  };

  const remove = async (w) => {
    if (!window.confirm('Xoá hẳn lời chúc này? Không khôi phục được.')) return;
    const { error } = await supabase.from('wishes').delete().eq('id', w.id);
    if (error) { toast('Không xoá được'); return; }
    setRows((prev) => prev.filter((x) => x.id !== w.id));
    toast('Đã xoá');
  };

  // Tìm theo tên hoặc nội dung, không phân biệt hoa thường và dấu ("hung" tìm ra "Hùng")
  const fold = (t) => (t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  const needle = fold(q.trim());
  const visible = rows.filter((w) => (showHidden || !w.hidden)
    && (!needle || fold(w.name).includes(needle) || fold(w.message).includes(needle)));
  const preset = rows.filter((w) => w.is_preset).length;

  const exportExcel = async () => {
    try {
      await downloadExcel(datedName('loi-chuc'), 'Lời chúc', [
        { header: 'Thời gian', width: 17 },
        { header: 'Họ tên', width: 26 },
        { header: 'Lời chúc', width: 70, wrap: true },
        { header: 'Soạn sẵn', width: 10 },
      ], visible.map((w) => [excelDateVN(w.created_at), w.name || '', w.message, w.is_preset ? 'Có' : '']));
      toast('Đã tải file Excel');
    } catch (err) {
      console.error('[admin] xuất Excel lỗi', err);
      toast('Không xuất được file Excel');
    }
  };

  if (loading) return <div>Loading…</div>;

  return (
    <div>
      <h1>Lời chúc</h1>
      <p className="page-desc">
        Lời chúc từ khách không thể tham dự.
      </p>

      <div className="rsvp-stats">
        <div className="rsvp-stat"><div className="n">{rows.length}</div><div className="l">Tổng</div></div>
        <div className="rsvp-stat"><div className="n">{rows.length - preset}</div><div className="l">Tự viết</div></div>
        <div className="rsvp-stat"><div className="n">{preset}</div><div className="l">Soạn sẵn</div></div>
      </div>

      <div className="admin-card" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="admin-field" style={{ width: 300 }}>
          <input
            placeholder="Tìm theo tên hoặc nội dung lời chúc"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6B5E5B' }}>
          <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} />
          Hiện lời chúc đã ẩn
        </label>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: '#A89996' }}>{visible.length} lời chúc</span>
      </div>

      <div className="admin-card" style={{ overflow: 'auto' }}>
        {visible.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#A89996' }}>
            {rows.length ? 'Không có lời chúc nào khớp' : 'Chưa có lời chúc nào'}
          </div>
        ) : (
          <table className="rsvp-table">
            <thead>
              <tr>
                <th style={{ whiteSpace: 'nowrap' }}>Thời gian</th><th>Họ tên</th><th>Lời chúc</th><th>Loại</th><th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((w) => (
                <tr key={w.id} style={{ verticalAlign: 'top', ...(w.hidden ? { opacity: 0.45 } : {}) }}>
                  <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{timeVN(w.created_at)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}><strong>{w.name || '—'}</strong></td>
                  <td style={{ minWidth: 280, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{w.message}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {w.is_preset
                      ? <span className="rsvp-badge yes">Soạn sẵn</span>
                      : <span style={{ fontSize: 12, color: '#A89996' }}>Tự viết</span>}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button
                      className="admin-btn admin-btn-secondary"
                      style={{ padding: '4px 10px', fontSize: 11, marginRight: 6 }}
                      onClick={() => toggleHidden(w)}
                    >
                      {w.hidden ? 'Hiện' : 'Ẩn'}
                    </button>
                    <button
                      className="admin-btn admin-btn-danger"
                      style={{ padding: '4px 10px', fontSize: 11 }}
                      onClick={() => remove(w)}
                    >
                      Xoá
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="admin-actions">
        <button className="admin-btn admin-btn-secondary" onClick={fetchAll}>Tải lại</button>
        <button className="admin-btn admin-btn-primary" onClick={exportExcel} disabled={!visible.length}>
          Xuất Excel
        </button>
      </div>
      {ToastEl}
    </div>
  );
}
