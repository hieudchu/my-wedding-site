import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { toE164VN } from '../../lib/phone';
import { useToast } from '../components/Toast';
import { downloadExcel, excelDateVN, datedName } from '../exportExcel';

const SIDE_LABEL = { groom: 'Nhà trai', bride: 'Nhà gái' };

// Bốn ô tổng hợp kiêm luôn bộ lọc theo bên
const SIDE_TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'groom', label: 'Nhà trai' },
  { key: 'bride', label: 'Nhà gái' },
  { key: 'unknown', label: 'Chưa chọn' },
];

const SORTS = [
  ['new', 'Mới nhất'],
  ['old', 'Cũ nhất'],
  ['name', 'Tên A → Z'],
  ['guests', 'Đông người nhất'],
];

/** "Trên 10 người" lưu guest_count = 10 kèm cờ guests_over_10 */
function guestText(r) {
  if (r.guests_over_10) return 'Trên 10 người';
  if (r.guest_count == null) return '—';
  return `${r.guest_count} người`;
}

/** Giờ Việt Nam, dạng dd/MM HH:mm — ngày trước giờ sau, cho dễ đọc */
function timeVN(iso) {
  if (!iso) return '—';
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    hour12: false, timeZone: 'Asia/Ho_Chi_Minh',
  }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.day}/${p.month} ${p.hour}:${p.minute}`;
}

// Không phân biệt hoa thường và dấu: "ngo thanh" ra "Ngô Thanh Tâm"
const fold = (t) => (t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

// Trùng: cùng số điện thoại chuẩn hoá, hoặc cùng tên khi không có số.
const dupKeyOf = (r) => r.phone_e164 || `name:${(r.name || '').trim().toLowerCase()}`;

// Tên gọi = chữ cuối của họ tên ("Nguyễn Ngọc Trang" → "Trang"), như danh sách in
const givenName = (n) => { const p = (n || '').trim().split(/\s+/); return p[p.length - 1] || ''; };

/** Tổng khách: có lượt "Trên 10 người" thì con số chỉ là tối thiểu → "≥ N" */
const atLeast = (n, over) => (over ? `≥ ${n}` : `${n}`);

export default function RSVPList() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [sideFilter, setSideFilter] = useState('all');
  const [q, setQ] = useState('');
  const [showHidden, setShowHidden] = useState(false);
  const [onlyDup, setOnlyDup] = useState(false);
  const [onlyNote, setOnlyNote] = useState(false);
  const [sort, setSort] = useState('new');
  const { toast, ToastEl } = useToast();

  const fetchAll = async () => {
    setRefreshing(true);
    let ok = false;
    try {
      const [{ data, error }, { data: sum, error: sumError }] = await Promise.all([
        supabase
          .from('rsvps')
          .select('id, created_at, name, side, guest_count, guests_over_10, phone, phone_e164, message, hidden')
          .eq('attending', true)
          .order('created_at', { ascending: false }),
        supabase.from('rsvp_summary').select('*'),
      ]);
      if (data) setRows(data);
      if (sum) setSummary(sum);
      ok = !error && !sumError;
    } catch (err) {
      console.error('[admin] tải khách xác nhận lỗi', err);
    }
    setLoadError(!ok);
    setLoading(false);
    setRefreshing(false);
    return ok;
  };

  useEffect(() => { fetchAll(); }, []);

  const reload = async () => {
    if (!(await fetchAll())) toast('Không tải lại được');
  };

  const toggleHidden = async (r) => {
    const { error } = await supabase.from('rsvps').update({ hidden: !r.hidden }).eq('id', r.id);
    if (error) { toast('Không lưu được'); return; }
    setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, hidden: !x.hidden } : x)));
    fetchAll();
    toast(r.hidden ? 'Đã hiện lại' : 'Đã ẩn');
  };

  const dupKeys = useMemo(() => {
    const count = {};
    rows.forEach((r) => {
      const k = dupKeyOf(r);
      count[k] = (count[k] || 0) + 1;
    });
    return new Set(Object.keys(count).filter((k) => count[k] > 1));
  }, [rows]);

  // Lọc theo bên + ô tìm + công tắc ẩn. Hai nút "Trùng" / "Có ghi chú" lọc tiếp từ đây.
  const base = useMemo(() => {
    const needle = fold(q.trim());
    const asPhone = toE164VN(q);
    const digits = q.replace(/\s/g, '');
    return rows.filter((r) => {
      if (!showHidden && r.hidden) return false;
      if (sideFilter === 'unknown' ? r.side : sideFilter !== 'all' && r.side !== sideFilter) return false;
      if (!needle) return true;
      if (fold(r.name).includes(needle)) return true;
      if (asPhone && r.phone_e164 === asPhone) return true;
      return (r.phone || '').replace(/\s/g, '').includes(digits);
    });
  }, [rows, q, sideFilter, showHidden]);

  const visible = useMemo(() => {
    const list = base.filter((r) => (!onlyDup || dupKeys.has(dupKeyOf(r)))
      && (!onlyNote || (r.message || '').trim()));
    const by = {
      new: (a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0),
      old: (a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0),
      name: (a, b) => givenName(a.name).localeCompare(givenName(b.name), 'vi', { sensitivity: 'base' })
        || (a.name || '').localeCompare(b.name || '', 'vi', { sensitivity: 'base' }),
      guests: (a, b) => (b.guest_count ?? -1) - (a.guest_count ?? -1) || Number(b.guests_over_10) - Number(a.guests_over_10),
    }[sort];
    return [...list].sort(by);
  }, [base, onlyDup, onlyNote, sort, dupKeys]);

  const dupCount = base.filter((r) => dupKeys.has(dupKeyOf(r))).length;
  const noteCount = base.filter((r) => (r.message || '').trim()).length;
  const hiddenCount = rows.filter((r) => r.hidden).length;
  const visGuests = visible.reduce((a, r) => a + (r.guest_count || 0), 0);
  const visOver = visible.some((r) => r.guests_over_10);

  // Số liệu theo bên lấy từ view rsvp_summary (chỉ tính dòng không ẩn)
  const stat = (key) => summary
    .filter((s) => key === 'all' || s.side === key)
    .reduce((a, s) => ({
      responses: a.responses + Number(s.responses),
      guests: a.guests + Number(s.guests),
      over: a.over + Number(s.over_10),
      none: a.none + Number(s.no_guests || 0),
    }), { responses: 0, guests: 0, over: 0, none: 0 });
  const total = stat('all');

  const filtered = Boolean(q.trim()) || sideFilter !== 'all' || onlyDup || onlyNote;
  const clearFilters = () => { setQ(''); setSideFilter('all'); setOnlyDup(false); setOnlyNote(false); };

  // Bấm nhãn "Trùng" → hiện cả nhóm (kể cả dòng đã ẩn) để chọn dòng nào giữ
  const showGroup = (r) => {
    setSideFilter('all'); setOnlyDup(false); setOnlyNote(false); setShowHidden(true);
    setQ(r.phone_e164 ? r.phone : (r.name || '').trim());
  };

  // Xuất đúng những dòng đang hiện (theo bên, ô tìm, các nút lọc, công tắc ẩn), đúng thứ tự đang xếp.
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

  const head = (
    <div className="rw-head">
      <div>
        <h1>Khách xác nhận</h1>
        <p className="page-desc">Danh sách khách đã bấm &ldquo;Đồng ý tham dự&rdquo;</p>
      </div>
      <div className="rw-head-act">
        <button className="admin-btn admin-btn-secondary" onClick={reload} disabled={refreshing}>
          {refreshing ? 'Đang tải…' : 'Tải lại'}
        </button>
        <button
          className="admin-btn admin-btn-primary"
          onClick={exportExcel}
          disabled={loading || !visible.length}
          title="Xuất đúng những dòng đang hiện"
        >
          Xuất Excel <span className="rw-btn-count">{visible.length}</span>
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="rw-page" aria-busy="true">
        {head}
        <div className="rw-sides">
          {SIDE_TABS.map((s) => <div key={s.key} className="rw-side rw-side-skel"><span className="rw-skel" style={{ width: '50%' }} /><span className="rw-skel rw-skel-lg" style={{ width: '70%' }} /></div>)}
        </div>
        <div className="rw-list">
          {[62, 48, 70, 55, 66].map((w, i) => (
            <div key={i} className="rw-skel-row"><span className="rw-skel" style={{ width: `${w}%` }} /><span className="rw-skel" style={{ width: `${w - 25}%` }} /></div>
          ))}
        </div>
      </div>
    );
  }

  if (loadError && !rows.length) {
    return (
      <div className="rw-page">
        {head}
        <div className="rw-empty">
          <h3>Không tải được danh sách</h3>
          <p>Kiểm tra kết nối mạng rồi thử lại.</p>
          <button className="admin-btn admin-btn-secondary" onClick={fetchAll}>Thử lại</button>
        </div>
        {ToastEl}
      </div>
    );
  }

  return (
    <div className="rw-page">
      {head}

      <div className="rw-sides" role="group" aria-label="Lọc theo bên">
        {SIDE_TABS.map((t) => {
          const s = stat(t.key);
          const on = sideFilter === t.key;
          return (
            <button key={t.key} type="button" className={`rw-side${on ? ' on' : ''}`} aria-pressed={on} onClick={() => setSideFilter(t.key)}>
              <span className="rw-side-label">{t.label}</span>
              <span className="rw-side-n">{atLeast(s.guests, s.over > 0)}<small> khách</small></span>
              <span className="rw-side-sub">{s.responses} lượt</span>
            </button>
          );
        })}
      </div>
      {(total.over > 0 || total.none > 0) && (
        <p className="rw-footnote">
          {total.over > 0 && <>&ldquo;≥&rdquo; là số tối thiểu: {total.over} lượt chọn &ldquo;Trên 10 người&rdquo; được tính là 10. </>}
          {total.none > 0 && <>{total.none} lượt chưa chọn số người, chưa tính vào tổng.</>}
        </p>
      )}

      {loadError && <div className="rw-banner">Không tải lại được — đang hiện dữ liệu lần trước.</div>}

      <div className="rw-toolbar">
        <div className="rw-search">
          <input
            placeholder="Tìm theo tên hoặc số điện thoại"
            aria-label="Tìm theo tên hoặc số điện thoại"
            enterKeyHint="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && <button type="button" className="rw-search-clear" aria-label="Xoá ô tìm" onClick={() => setQ('')}>×</button>}
        </div>
        <select className="rw-sort" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sắp xếp">
          {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <div className="rw-filters">
          <button type="button" className={`rw-chip${onlyDup ? ' on' : ''}`} aria-pressed={onlyDup} onClick={() => setOnlyDup(!onlyDup)}>
            Trùng <span className="n">{dupCount}</span>
          </button>
          <button type="button" className={`rw-chip${onlyNote ? ' on' : ''}`} aria-pressed={onlyNote} onClick={() => setOnlyNote(!onlyNote)}>
            Có ghi chú <span className="n">{noteCount}</span>
          </button>
          <label className={`rw-chip${showHidden ? ' on' : ''}`}>
            <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} />
            Hiện dòng đã ẩn <span className="n">{hiddenCount}</span>
          </label>
          <span className="rw-meta">{visible.length} dòng · {atLeast(visGuests, visOver)} khách</span>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rw-empty">
          {rows.length === 0 ? (
            <>
              <h3>Chưa có khách nào xác nhận</h3>
              <p>Khi khách bấm &ldquo;Đồng ý tham dự&rdquo; trên thiệp, tên sẽ hiện ở đây.</p>
            </>
          ) : filtered ? (
            <>
              <h3>Không có dòng nào khớp</h3>
              <p>Thử tìm từ khác, hoặc bỏ lọc để xem lại cả danh sách.</p>
              <button className="admin-btn admin-btn-secondary" onClick={clearFilters}>Bỏ lọc</button>
            </>
          ) : (
            <>
              <h3>Mọi dòng đều đang ẩn</h3>
              <button className="admin-btn admin-btn-secondary" onClick={() => setShowHidden(true)}>Hiện dòng đã ẩn</button>
            </>
          )}
        </div>
      ) : (
        <div className="rw-list">
          <div className="rw-list-head" aria-hidden="true">
            <span>Khách</span><span className="r">Số người</span><span>SĐT</span><span>Ghi chú</span><span />
          </div>
          {visible.map((r) => {
            const dup = dupKeys.has(dupKeyOf(r));
            const note = (r.message || '').trim();
            return (
              <article key={r.id} className={`rw-guest${r.hidden ? ' is-hidden' : ''}`}>
                <div className="rw-g-name">
                  <strong>{r.name}</strong>
                  {dup && (
                    <button
                      type="button"
                      className="rw-tag dup"
                      onClick={() => showGroup(r)}
                      title={r.phone_e164 ? 'Cùng số điện thoại với dòng khác — bấm để xem cả nhóm' : 'Cùng tên, không có SĐT — bấm để xem cả nhóm'}
                    >
                      Trùng
                    </button>
                  )}
                  {r.hidden && <span className="rw-tag off">Đã ẩn</span>}
                  <span className="rw-g-meta">
                    <span className={`rw-tag side-${r.side || 'none'}`}>{SIDE_LABEL[r.side] || 'Chưa chọn bên'}</span>
                    <span>{timeVN(r.created_at)}</span>
                  </span>
                </div>
                <div className={`rw-g-count${r.guest_count == null ? ' none' : ''}`} title={r.guest_count == null ? 'Khách không chọn số người' : undefined}>
                  {r.guest_count == null ? 'Chưa ghi' : guestText(r)}
                </div>
                <div className="rw-g-phone">
                  {r.phone
                    ? <a className="rw-tel" href={`tel:${r.phone_e164 || r.phone.replace(/\s/g, '')}`}><span className="rw-tel-verb">Gọi</span>{r.phone}</a>
                    : <span className="rw-dim">Không có SĐT</span>}
                </div>
                <div className={`rw-g-note${note ? '' : ' empty'}`}>{note ? r.message : <span className="rw-dim">—</span>}</div>
                <div className="rw-g-act">
                  {r.phone && (
                    // Chờ backend — BR-1 trong BACKEND-REQUESTS.md. Chưa lưu được nên để mờ.
                    <button type="button" className="rw-btn pending" disabled title="Chờ backend (BR-1): chưa lưu được “đã gọi”">Đã gọi</button>
                  )}
                  <button type="button" className="rw-btn" onClick={() => toggleHidden(r)}>{r.hidden ? 'Hiện lại' : 'Ẩn'}</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {visible.length > 0 && (
        <p className="rw-pending-note">Nút &ldquo;Đã gọi&rdquo; đang chờ backend (BR-1) nên chưa bấm được. Khách không bao giờ bị xoá — chỉ ẩn.</p>
      )}
      {ToastEl}
    </div>
  );
}
