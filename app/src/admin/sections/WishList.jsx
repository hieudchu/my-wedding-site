import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../components/Toast';
import { downloadExcel, excelDateVN, datedName } from '../exportExcel';

function timeVN(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    hour12: false, timeZone: 'Asia/Ho_Chi_Minh',
  }).replace(',', '');
}

export default function WishList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHidden, setShowHidden] = useState(false);
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

  const visible = rows.filter((w) => showHidden || !w.hidden);
  const preset = rows.filter((w) => w.is_preset).length;

  const exportExcel = async () => {
    try {
      await downloadExcel(datedName('loi-chuc'), 'Lời chúc', [
        { header: 'Thời gian', width: 17 },
        { header: 'Tên', width: 20 },
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
        Lời chúc từ khách không thể tham dự. Form không có ô tên nên lời chúc là ẩn danh.
      </p>

      <div className="rsvp-stats">
        <div className="rsvp-stat"><div className="n">{rows.length}</div><div className="l">Tổng</div></div>
        <div className="rsvp-stat"><div className="n">{rows.length - preset}</div><div className="l">Tự viết</div></div>
        <div className="rsvp-stat"><div className="n">{preset}</div><div className="l">Soạn sẵn</div></div>
      </div>

      <div className="admin-card" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6B5E5B' }}>
          <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} />
          Hiện lời chúc đã ẩn
        </label>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: '#A89996' }}>{visible.length} lời chúc</span>
      </div>

      {visible.length === 0 ? (
        <div className="admin-card" style={{ textAlign: 'center', padding: 40, color: '#A89996' }}>
          Chưa có lời chúc nào
        </div>
      ) : (
        visible.map((w) => (
          <div className="admin-card" key={w.id} style={w.hidden ? { opacity: 0.45 } : undefined}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: '#A89996' }}>{timeVN(w.created_at)}</span>
              {w.name && <strong style={{ fontSize: 13 }}>{w.name}</strong>}
              {w.is_preset && <span className="rsvp-badge yes">Lời chúc soạn sẵn</span>}
              <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <button
                  className="admin-btn admin-btn-secondary"
                  style={{ padding: '4px 10px', fontSize: 11 }}
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
              </span>
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.7, color: '#6B5E5B', whiteSpace: 'pre-wrap' }}>
              {w.message}
            </div>
          </div>
        ))
      )}

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
