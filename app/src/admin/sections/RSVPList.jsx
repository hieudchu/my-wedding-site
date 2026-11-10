import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { toE164VN } from '../../lib/phone';
import { useToast } from '../components/Toast';
import { downloadExcel, excelDateVN, datedName } from '../exportExcel';

const SIDE_LABEL = { groom: 'Nhà trai', bride: 'Nhà gái' };

/** "Trên 10 người" lưu guest_count = 10 kèm cờ guests_over_10 */
function guestText(r) {
  if (r.guests_over_10) return 'Trên 10 người';
  if (r.guest_count == null) return '—';
  return `${r.guest_count} người`;
}

/** Giờ Việt Nam, dạng dd/MM HH:mm */
function timeVN(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    hour12: false, timeZone: 'Asia/Ho_Chi_Minh',
  }).replace(',', '');
}

export default function RSVPList() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sideFilter, setSideFilter] = useState('all');
  const [q, setQ] = useState('');
  const [showHidden, setShowHidden] = useState(false);
  const { toast, ToastEl } = useToast();

  const fetchAll = async () => {
    const [{ data }, { data: sum }] = await Promise.all([
      supabase
        .from('rsvps')
        .select('id, created_at, name, side, guest_count, guests_over_10, phone, phone_e164, message, hidden')
        .eq('attending', true)
        .order('created_at', { ascending: false }),
      supabase.from('rsvp_summary').select('*'),
    ]);
    if (data) setRows(data);
    if (sum) setSummary(sum);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const toggleHidden = async (r) => {
    const { error } = await supabase.from('rsvps').update({ hidden: !r.hidden }).eq('id', r.id);
    if (error) { toast('Không lưu được'); return; }
    setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, hidden: !x.hidden } : x)));
    fetchAll();
    toast(r.hidden ? 'Đã hiện lại' : 'Đã ẩn');
  };

  // Trùng: cùng số điện thoại chuẩn hoá, hoặc cùng tên khi không có số.
  const dupKeys = useMemo(() => {
    const count = {};
    rows.forEach((r) => {
      const k = r.phone_e164 || `name:${(r.name || '').trim().toLowerCase()}`;
      count[k] = (count[k] || 0) + 1;
    });
    return new Set(Object.keys(count).filter((k) => count[k] > 1));
  }, [rows]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const asPhone = toE164VN(q);
    return rows.filter((r) => {
      if (!showHidden && r.hidden) return false;
      if (sideFilter === 'unknown' ? r.side : sideFilter !== 'all' && r.side !== sideFilter) return false;
      if (!needle) return true;
      if ((r.name || '').toLowerCase().includes(needle)) return true;
      if (asPhone && r.phone_e164 === asPhone) return true;
      return (r.phone || '').replace(/\s/g, '').includes(q.replace(/\s/g, ''));
    });
  }, [rows, q, sideFilter, showHidden]);

  const card = (key, label) => {
    const s = summary.find((x) => x.side === key);
    const n = s ? Number(s.guests) : 0;
    return (
      <div className="rsvp-stat" key={key}>
        <div className="n">{s ? s.responses : 0}</div>
        <div className="l">{label}</div>
        <div className="l" style={{ marginTop: 4, color: '#B58285' }}>
          {s && s.over_10 > 0 ? `≥ ${n}` : n} khách
        </div>
      </div>
    );
  };

  const totalResponses = summary.reduce((a, s) => a + Number(s.responses), 0);
  const totalGuests = summary.reduce((a, s) => a + Number(s.guests), 0);
  const anyOver10 = summary.some((s) => Number(s.over_10) > 0);

  // Xuất đúng những dòng đang hiện (theo bộ lọc, ô tìm kiếm, công tắc "Hiện dòng đã ẩn").
  // Số người là SỐ để cộng tổng được trong Excel. Khách chọn "Trên 10 người" vẫn là số 10,
  // chỉ đổi cách hiện thành "Trên 10" bằng định dạng số — một cột như trong app, SUM vẫn đúng.
  const exportExcel = async () => {
    try {
      await downloadExcel(datedName('khach-xac-nhan'), 'Khách xác nhận', [
        { header: 'Thời gian', width: 17 },
        { header: 'Họ tên', width: 26 },
        { header: 'Bên', width: 10 },
        { header: 'Số người', width: 10 },
        { header: 'SĐT', width: 16 },
        { header: 'Ghi chú', width: 40, wrap: true },
      ], visible.map((r) => [
        excelDateVN(r.created_at), r.name, SIDE_LABEL[r.side] || '',
        r.guests_over_10 ? { value: 10, format: '"Trên "0' } : (r.guest_count ?? null),
        r.phone || '', r.message || '',
      ]));
      toast('Đã tải file Excel');
    } catch (err) {
      console.error('[admin] xuất Excel lỗi', err);
      toast('Không xuất được file Excel');
    }
  };

  if (loading) return <div>Loading…</div>;

  return (
    <div>
      <h1>Khách xác nhận</h1>
      <p className="page-desc">Danh sách khách đã bấm &ldquo;Đồng ý tham dự&rdquo;</p>

      <div className="rsvp-stats">
        {card('groom', 'Nhà trai')}
        {card('bride', 'Nhà gái')}
        {card('unknown', 'Chưa chọn')}
        <div className="rsvp-stat">
          <div className="n">{totalResponses}</div>
          <div className="l">Tổng cộng</div>
          <div className="l" style={{ marginTop: 4, color: '#B58285' }}>
            {anyOver10 ? `≥ ${totalGuests}` : totalGuests} khách
          </div>
        </div>
      </div>

      <div className="admin-card" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="admin-field" style={{ width: 150 }}>
          <select value={sideFilter} onChange={(e) => setSideFilter(e.target.value)}>
            <option value="all">Tất cả</option>
            <option value="groom">Nhà trai</option>
            <option value="bride">Nhà gái</option>
            <option value="unknown">Chưa chọn</option>
          </select>
        </div>
        <div className="admin-field" style={{ width: 260 }}>
          <input
            placeholder="Tìm theo tên hoặc số điện thoại"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6B5E5B' }}>
          <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} />
          Hiện dòng đã ẩn
        </label>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: '#A89996' }}>{visible.length} dòng</span>
      </div>

      <div className="admin-card" style={{ overflow: 'auto' }}>
        {visible.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#A89996' }}>
            Chưa có xác nhận nào
          </div>
        ) : (
          <table className="rsvp-table">
            <thead>
              <tr>
                <th>Thời gian</th><th>Họ tên</th><th>Bên</th><th>Số người</th>
                <th>SĐT</th><th>Ghi chú</th><th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const dup = dupKeys.has(r.phone_e164 || `name:${(r.name || '').trim().toLowerCase()}`);
                return (
                  <tr key={r.id} style={r.hidden ? { opacity: 0.45 } : undefined}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{timeVN(r.created_at)}</td>
                    <td>
                      <strong>{r.name}</strong>
                      {dup && <span className="rsvp-badge no" style={{ marginLeft: 6 }}>Trùng</span>}
                    </td>
                    <td>
                      <span className={`rsvp-badge ${r.side === 'groom' ? 'yes' : r.side === 'bride' ? 'no' : ''}`}>
                        {SIDE_LABEL[r.side] || '—'}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{guestText(r)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {r.phone ? <a href={`tel:${r.phone_e164 || r.phone.replace(/\s/g, '')}`}>{r.phone}</a> : '—'}
                    </td>
                    <td style={{ maxWidth: 220, fontSize: 12 }}>{r.message || '—'}</td>
                    <td>
                      <button
                        className="admin-btn admin-btn-secondary"
                        style={{ padding: '4px 10px', fontSize: 11 }}
                        onClick={() => toggleHidden(r)}
                      >
                        {r.hidden ? 'Hiện' : 'Ẩn'}
                      </button>
                    </td>
                  </tr>
                );
              })}
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
