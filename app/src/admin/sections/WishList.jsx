import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../components/Toast';
import { downloadExcel, excelDateVN, datedName } from '../exportExcel';

const TZ = 'Asia/Ho_Chi_Minh';
const PAGE = 100;   // phân trang ngay trên trình duyệt — dữ liệu vẫn tải một lần

const TYPES = [
  ['all', 'Tất cả'],
  ['own', 'Tự viết'],
  ['preset', 'Soạn sẵn'],
];

const SORTS = [
  ['new', 'Mới nhất'],
  ['old', 'Cũ nhất'],
  ['name', 'Tên A → Z'],
];

/** Giờ Việt Nam, dạng dd/MM HH:mm — ngày trước giờ sau, cho dễ đọc */
function timeVN(iso) {
  if (!iso) return '—';
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    hour12: false, timeZone: TZ,
  }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.day}/${p.month} ${p.hour}:${p.minute}`;
}

/** Khoá ngày theo giờ Việt Nam: 2026-11-12 */
const dayKeyVN = (iso) => new Date(iso).toLocaleDateString('sv-SE', { timeZone: TZ });

/** "Thứ Năm, 12/11" */
function dayLabelVN(iso) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long', day: '2-digit', month: '2-digit', timeZone: TZ,
  }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  const wd = (p.weekday || '').replace(/^./, (c) => c.toUpperCase());
  return `${wd}, ${p.day}/${p.month}`;
}

// Tìm theo tên hoặc nội dung, không phân biệt hoa thường và dấu ("hung" tìm ra "Hùng")
const fold = (t) => (t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

// Tên gọi = chữ cuối của họ tên ("Nguyễn Thu Bình" → "Bình")
const givenName = (n) => { const p = (n || '').trim().split(/\s+/); return p[p.length - 1] || ''; };

// Lời chúc dài hơn 2 dòng trong bảng → có nút "Xem hết"
const isLong = (m) => (m || '').length > 120 || (m || '').includes('\n');

export default function WishList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [from, setFrom] = useState('');   // 'YYYY-MM-DD' theo giờ Việt Nam, '' = không giới hạn
  const [to, setTo] = useState('');
  const [onlyNoName, setOnlyNoName] = useState(false);
  const [sort, setSort] = useState('new');
  const [open, setOpen] = useState(() => new Set());
  const [limit, setLimit] = useState(PAGE);
  const { toast, ToastEl } = useToast();

  const fetchAll = async () => {
    setRefreshing(true);
    let ok = false;
    try {
      const { data, error } = await supabase
        .from('wishes')
        .select('id, created_at, name, message, is_preset, hidden')
        .order('created_at', { ascending: false });
      if (data) setRows(data);
      ok = !error;
    } catch (err) {
      console.error('[admin] tải lời chúc lỗi', err);
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

  const toggleOpen = (id) => setOpen((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  // Bấm vào dòng để mở/thu — trừ khi đang bôi đen chữ để chép
  const onRowClick = (w) => {
    if (window.getSelection && String(window.getSelection())) return;
    toggleOpen(w.id);
  };

  // Lọc theo công tắc ẩn + ô tìm. Các bộ lọc khác đếm số từ đây.
  const needle = fold(q.trim());
  const base = useMemo(() => rows.filter((w) => (showHidden || !w.hidden)
    && (!needle || fold(w.name).includes(needle) || fold(w.message).includes(needle))), [rows, showHidden, needle]);

  const matchType = (w) => type === 'all' || (type === 'preset') === Boolean(w.is_preset);
  // Khoảng thời gian tính theo NGÀY giờ Việt Nam, gồm cả hai đầu. Chọn ngược thì tự đảo.
  const [lo, hi] = from && to && from > to ? [to, from] : [from, to];
  const matchDay = (w) => {
    if (!lo && !hi) return true;
    const k = dayKeyVN(w.created_at);
    return (!lo || k >= lo) && (!hi || k <= hi);
  };
  const matchName = (w) => !onlyNoName || !(w.name || '').trim();

  const counts = {
    all: base.filter((w) => matchDay(w) && matchName(w)).length,
    own: base.filter((w) => !w.is_preset && matchDay(w) && matchName(w)).length,
    preset: base.filter((w) => w.is_preset && matchDay(w) && matchName(w)).length,
  };
  const noNameCount = base.filter((w) => matchType(w) && matchDay(w) && !(w.name || '').trim()).length;

  // Giới hạn ô chọn ngày theo khoảng có dữ liệu
  const minDay = rows.length ? dayKeyVN(rows[rows.length - 1].created_at) : '';
  const today = dayKeyVN(new Date().toISOString());
  const maxDay = rows.length ? [dayKeyVN(rows[0].created_at), today].sort()[1] : today;
  const daysAgo = (n) => dayKeyVN(new Date(Date.now() - n * 86400000).toISOString());
  const PRESETS = [
    ['today', 'Hôm nay', today, today],
    ['7', '7 ngày', daysAgo(6), today],
    ['30', '30 ngày', daysAgo(29), today],
  ];
  const preset = PRESETS.find((p) => p[2] === from && p[3] === to);
  const setRange = (f, t) => { setFrom(f); setTo(t); };

  const visible = useMemo(() => {
    const list = base.filter((w) => matchType(w) && matchDay(w) && matchName(w));
    if (sort === 'old') return [...list].reverse();   // dữ liệu về đã xếp mới nhất trước
    if (sort === 'name') {
      return [...list].sort((a, b) => givenName(a.name).localeCompare(givenName(b.name), 'vi', { sensitivity: 'base' })
        || (a.name || '').localeCompare(b.name || '', 'vi', { sensitivity: 'base' }));
    }
    return list;
  }, [base, type, lo, hi, onlyNoName, sort]);

  // Đổi bộ lọc → về trang đầu
  useEffect(() => { setLimit(PAGE); }, [needle, type, lo, hi, onlyNoName, showHidden, sort]);
  const shown = visible.slice(0, limit);
  const hiddenCount = rows.filter((w) => w.hidden).length;

  const ranged = Boolean(from || to);
  const filtered = Boolean(needle) || type !== 'all' || ranged || onlyNoName;
  const clearFilters = () => { setQ(''); setType('all'); setRange('', ''); setOnlyNoName(false); };

  // Xuất MỌI lời chúc khớp bộ lọc (cả những dòng chưa bấm "Hiện thêm"), đúng thứ tự đang xếp.
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

  const sortHead = (key, label) => {
    const on = key === 'time' ? sort === 'new' || sort === 'old' : sort === key;
    const arrow = key === 'time' ? (sort === 'old' ? '↑' : '↓') : '↓';
    const next = key === 'time' ? (sort === 'new' ? 'old' : 'new') : 'name';
    return (
      <button type="button" className={`rw-th-sort${on ? ' on' : ''}`} onClick={() => setSort(next)}>
        {label}{on && <span aria-hidden="true">{arrow}</span>}
      </button>
    );
  };

  const head = (
    <div className="rw-head">
      <div>
        <h1>Lời chúc</h1>
        <p className="page-desc">Lời chúc từ khách không thể tham dự.</p>
      </div>
      <div className="rw-head-act">
        <button className="admin-btn admin-btn-secondary" onClick={reload} disabled={refreshing}>
          {refreshing ? 'Đang tải…' : 'Tải lại'}
        </button>
        <button
          className="admin-btn admin-btn-primary"
          onClick={exportExcel}
          disabled={loading || !visible.length}
          title="Xuất mọi lời chúc khớp bộ lọc"
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
        <div className="rw-wtable">
          {[80, 55, 90, 64, 72].map((w, i) => (
            <div key={i} className="rw-skel-row"><span className="rw-skel" style={{ width: '30%' }} /><span className="rw-skel" style={{ width: `${w}%` }} /></div>
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
          <h3>Không tải được lời chúc</h3>
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

      {loadError && <div className="rw-banner">Không tải lại được — đang hiện dữ liệu lần trước.</div>}

      <div className="rw-toolbar">
        <div className="rw-search">
          <input
            placeholder="Tìm theo tên hoặc nội dung lời chúc"
            aria-label="Tìm theo tên hoặc nội dung lời chúc"
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
          <div className="rw-seg" role="group" aria-label="Loại lời chúc">
            {TYPES.map(([k, l]) => (
              <button key={k} type="button" className={type === k ? 'on' : ''} aria-pressed={type === k} onClick={() => setType(k)}>
                {l} <span className="n">{counts[k]}</span>
              </button>
            ))}
          </div>
          <div className={`rw-range${ranged ? ' on' : ''}`} role="group" aria-label="Khoảng thời gian gửi">
            <label className="rw-range-field">
              <span>Từ</span>
              <input type="date" value={from} min={minDay} max={maxDay} onChange={(e) => setFrom(e.target.value)} aria-label="Từ ngày" />
            </label>
            <label className="rw-range-field">
              <span>Đến</span>
              <input type="date" value={to} min={minDay} max={maxDay} onChange={(e) => setTo(e.target.value)} aria-label="Đến ngày" />
            </label>
            <div className="rw-range-presets">
              {PRESETS.map(([k, l, f, t]) => (
                <button key={k} type="button" className={preset && preset[0] === k ? 'on' : ''} aria-pressed={Boolean(preset && preset[0] === k)} onClick={() => (preset && preset[0] === k ? setRange('', '') : setRange(f, t))}>{l}</button>
              ))}
              {ranged && <button type="button" className="rw-range-clear" aria-label="Bỏ lọc thời gian" onClick={() => setRange('', '')}>×</button>}
            </div>
          </div>
          {(noNameCount > 0 || onlyNoName) && (
            <button type="button" className={`rw-chip${onlyNoName ? ' on' : ''}`} aria-pressed={onlyNoName} onClick={() => setOnlyNoName(!onlyNoName)}>
              Không ghi tên <span className="n">{noNameCount}</span>
            </button>
          )}
          <label className={`rw-chip${showHidden ? ' on' : ''}`}>
            <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} />
            Hiện lời chúc đã ẩn <span className="n">{hiddenCount}</span>
          </label>
          {filtered && <button type="button" className="rw-link" onClick={clearFilters}>Bỏ lọc</button>}
          <span className="rw-meta">{visible.length} lời chúc</span>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rw-empty">
          {rows.length === 0 ? (
            <>
              <h3>Chưa có lời chúc nào</h3>
              <p>Lời chúc khách gửi từ thiệp sẽ hiện ở đây.</p>
            </>
          ) : filtered ? (
            <>
              <h3>Không có lời chúc nào khớp</h3>
              <button className="admin-btn admin-btn-secondary" onClick={clearFilters}>Bỏ lọc</button>
            </>
          ) : (
            <>
              <h3>Mọi lời chúc đều đang ẩn</h3>
              <button className="admin-btn admin-btn-secondary" onClick={() => setShowHidden(true)}>Hiện lời chúc đã ẩn</button>
            </>
          )}
        </div>
      ) : (
        <div className="rw-wtable">
          <div className="rw-wt-head">
            {sortHead('time', 'Thời gian')}
            {sortHead('name', 'Họ tên')}
            <span>Lời chúc</span>
            <span>Loại</span>
            <span />
          </div>
          {shown.map((w) => {
            const isOpen = open.has(w.id);
            const long = isLong(w.message);
            return (
              <article
                key={w.id}
                className={`rw-wt-row${isOpen ? ' open' : ''}${w.hidden ? ' is-hidden' : ''}${w.is_preset ? ' preset' : ' own'}`}
                onClick={() => onRowClick(w)}
              >
                <div className="rw-wt-time">{timeVN(w.created_at)}</div>
                <div className="rw-wt-name">{w.name ? w.name : <span className="rw-dim">Không ghi tên</span>}</div>
                <div className="rw-wt-msg">
                  <p className="rw-wt-text">{w.message}</p>
                  {long && (
                    <button
                      type="button"
                      className="rw-link"
                      aria-expanded={isOpen}
                      onClick={(e) => { e.stopPropagation(); toggleOpen(w.id); }}
                    >
                      {isOpen ? 'Thu gọn' : 'Xem hết'}
                    </button>
                  )}
                </div>
                <div className="rw-wt-type">
                  {w.is_preset ? <span className="rw-tag preset">Soạn sẵn</span> : <span className="rw-wt-own">Tự viết</span>}
                  {w.hidden && <span className="rw-tag off">Đã ẩn</span>}
                </div>
                <div className="rw-wt-act" onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="rw-btn" onClick={() => toggleHidden(w)}>{w.hidden ? 'Hiện lại' : 'Ẩn'}</button>
                  <button type="button" className="rw-btn danger" onClick={() => remove(w)}>Xoá</button>
                </div>
              </article>
            );
          })}
          {visible.length > shown.length && (
            <div className="rw-more">
              <span>Đang hiện {shown.length} / {visible.length}</span>
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setLimit(limit + PAGE)}>
                Hiện thêm {Math.min(PAGE, visible.length - shown.length)}
              </button>
              <button type="button" className="rw-link" onClick={() => setLimit(visible.length)}>Hiện tất cả</button>
            </div>
          )}
        </div>
      )}
      {ToastEl}
    </div>
  );
}
