import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../components/Toast';
import { useConfigForm } from '../components/useAdminConfig';
import './AdultRSVPList.css';

/**
 * Khách của trang /adult (thiệp bố mẹ hai bên gửi đồng nghiệp, cấp trên) — mục riêng,
 * tách khỏi "Khách xác nhận" của trang chính (2026-11-18, ADMIN.md của bản thiết kế /adult).
 *
 * Dòng `rsvps` có audience = 'adult': chỉ họ tên + tham dự / không + lời nhắn. Trang ghi cả lời
 * từ chối. Sửa lại trên cùng máy thì CẬP NHẬT dòng cũ (`updated_at`); gửi từ máy khác thì thêm một dòng →
 * gộp theo tên chuẩn hoá, hiện câu trả lời mới nhất (theo lúc gửi HOẶC lúc sửa), xem được lịch sử.
 * Bên dưới là bốn khoá chữ riêng của thiệp (site_config `adult_…`).
 */

const SITE_URL = 'https://hieu-minh-wedding.vercel.app/adult';

const STATUS_TABS = [
  { key: 'all', label: 'Tổng hồi âm' },
  { key: 'yes', label: 'Tham dự' },
  { key: 'no', label: 'Không đến' },
];

/** Lúc khách trả lời lần cuối (gửi hoặc sửa), ms */
const lastAt = (r) => Date.parse(r.updated_at || r.created_at) || 0;

/** Giờ Việt Nam, dd/MM HH:mm */
function timeVN(iso) {
  if (!iso) return '—';
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    hour12: false, timeZone: 'Asia/Ho_Chi_Minh',
  }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.day}/${p.month} ${p.hour}:${p.minute}`;
}

// Không phân biệt hoa thường và dấu, gộp khoảng trắng: "  nguyen  van AN" = "Nguyễn Văn An"
const fold = (t) => (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/\s+/g, ' ').trim();

// ── Bốn khoá chữ riêng của thiệp. Trống → trang dùng khoá chung (hoặc ẩn dòng) ──
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const TEXT_FIELDS = [
  { key: 'adult_venue_title', label: 'Nơi tổ chức (thiệp bố mẹ)', max: 80, fallback: 'venue_name' },
  { key: 'adult_venue_hall', label: 'Phòng tiệc', max: 80, fallback: null },
  { key: 'adult_venue_address', label: 'Địa chỉ nơi tổ chức (thiệp bố mẹ)', max: 160, fallback: 'venue_address', area: true },
  {
    key: 'adult_party_time', label: 'Giờ trên thiệp bố mẹ (HH:MM, 24 giờ)', max: 5, fallback: 'wedding_time', time: true,
  },
];

function AdultTextCard({ adminConfig, toast }) {
  const { configs, saveMultiple, saving } = adminConfig;
  const [values, setValues] = useConfigForm(adminConfig, TEXT_FIELDS.map((f) => f.key));

  const errors = {};
  TEXT_FIELDS.forEach((f) => {
    const v = (values[f.key] || '').trim();
    if (f.time && v && !TIME_RE.test(v)) errors[f.key] = 'Ghi dạng 18:30 (giờ 00–23, phút 00–59)';
    else if (v.length > f.max) errors[f.key] = `Tối đa ${f.max} ký tự`;
  });
  const bad = Object.keys(errors).length > 0;
  const missingRow = TEXT_FIELDS.some((f) => !configs[f.key]);

  const save = async () => {
    if (bad) return;
    const trimmed = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.trim()]));
    toast((await saveMultiple(trimmed)) ? 'Đã lưu' : 'Không lưu được');
  };

  const welcome = getValue('wedding_time');
  return (
    <div className="admin-card ra-text">
      <h3>Chữ trên thiệp bố mẹ</h3>
      <p className="ra-text-note">
        Ô để trống thì thiệp dùng thông tin chung (tab Thông tin chung). Tên cô dâu chú rể, ngày cưới, bản đồ,
        câu trích dẫn và tên bố mẹ (tab Gia đình) dùng chung cho cả trang chính và thiệp bố mẹ.
      </p>
      {missingRow && <p className="ra-text-warn">Thiếu dòng trong cơ sở dữ liệu — chạy migration 20261118000000 trước.</p>}
      {TEXT_FIELDS.map((f) => {
        const fb = f.fallback ? getValue(f.fallback) : '';
        const ph = f.fallback ? (fb ? `Đang dùng: ${fb}` : '') : 'Để trống thì ẩn dòng này';
        const set = (e) => setValues({ ...values, [f.key]: e.target.value });
        return (
          <div key={f.key} className="admin-field">
            <label htmlFor={`ra-${f.key}`}>{f.label}</label>
            {f.area ? (
              <textarea id={`ra-${f.key}`} rows={2} value={values[f.key] || ''} onChange={set} placeholder={ph} />
            ) : (
              <input
                id={`ra-${f.key}`}
                type="text"
                inputMode={f.time ? 'numeric' : undefined}
                value={values[f.key] || ''}
                onChange={set}
                placeholder={ph}
              />
            )}
            {errors[f.key] && <p className="ra-field-err">{errors[f.key]}</p>}
            {f.time && (
              <p className="ra-field-help">
                Thiệp ghi giờ này ở thẻ đỏ, tờ lịch và thẻ cảm ơn. &ldquo;Đón khách&rdquo; lấy từ Giờ cưới
                {welcome ? ` (hiện ${welcome})` : ''} và chỉ hiện khi khác giờ này.
              </p>
            )}
          </div>
        );
      })}
      <div className="admin-actions">
        <button type="button" className="admin-btn admin-btn-primary" onClick={save} disabled={saving || bad}>
          {saving ? 'Đang lưu…' : 'Lưu chữ thiệp'}
        </button>
      </div>
    </div>
  );
}

export default function AdultRSVPList({ adminConfig }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [showHidden, setShowHidden] = useState(false);
  const [everySend, setEverySend] = useState(false);
  const [open, setOpen] = useState(() => new Set()); // id dòng đang mở lời nhắn / lịch sử
  const { toast, ToastEl } = useToast();

  const fetchAll = async () => {
    setRefreshing(true);
    let ok = false;
    try {
      const { data, error } = await supabase
        .from('rsvps')
        .select('id, created_at, updated_at, name, attending, message, hidden')
        .eq('audience', 'adult')
        .order('created_at', { ascending: false });
      if (data) setRows(data);
      ok = !error;
    } catch (err) {
      console.error('[admin] tải khách bố mẹ mời lỗi', err);
    }
    setLoadError(!ok);
    setLoading(false);
    setRefreshing(false);
    return ok;
  };
  useEffect(() => { fetchAll(); }, []);
  const reload = async () => { if (!(await fetchAll())) toast('Không tải lại được'); };

  const toggleHidden = async (r) => {
    const { error } = await supabase.from('rsvps').update({ hidden: !r.hidden }).eq('id', r.id);
    if (error) { toast('Không lưu được'); return; }
    setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, hidden: !x.hidden } : x)));
    toast(r.hidden ? 'Đã hiện lại' : 'Đã ẩn');
  };
  // .select() để biết có thật sự xoá được: RLS chặn thì Supabase không báo lỗi
  const remove = async (r) => {
    if (!window.confirm(`Xoá hẳn lần gửi của "${r.name}" lúc ${timeVN(r.created_at)}? Không khôi phục được.`)) return;
    const { data, error } = await supabase.from('rsvps').delete().eq('id', r.id).select('id');
    if (error || !data?.length) { toast('Không xoá được'); return; }
    setRows((prev) => prev.filter((x) => x.id !== r.id));
    toast('Đã xoá');
  };
  const toggleOpen = (id) => setOpen((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  // Câu trả lời mới nhất = lần gửi HOẶC lần sửa gần nhất (sửa ở máy 1 sau khi gửi ở máy 2 thì lấy bản sửa)
  const latestFirst = useMemo(() => [...rows].sort((a, b) => lastAt(b) - lastAt(a)), [rows]);
  // Gộp theo tên: mỗi khách một dòng (câu trả lời mới nhất), kèm các lần trước
  const pool = useMemo(() => latestFirst.filter((r) => showHidden || !r.hidden), [latestFirst, showHidden]);
  const guests = useMemo(() => {
    const by = new Map();
    pool.forEach((r) => { // đã xếp mới → cũ
      const k = fold(r.name);
      if (by.has(k)) by.get(k).history.push(r);
      else by.set(k, { ...r, history: [] });
    });
    return [...by.values()];
  }, [pool]);

  // Bộ đếm luôn theo khách đã gộp, không tính dòng đã ẩn
  const counts = useMemo(() => {
    const seen = new Map();
    latestFirst.forEach((r) => { if (!r.hidden && !seen.has(fold(r.name))) seen.set(fold(r.name), r); });
    const list = [...seen.values()];
    return { all: list.length, yes: list.filter((r) => r.attending).length, no: list.filter((r) => !r.attending).length };
  }, [latestFirst]);

  const needle = fold(q);
  const visible = (everySend ? pool.map((r) => ({ ...r, history: [] })) : guests).filter((r) => {
    if (status === 'yes' && !r.attending) return false;
    if (status === 'no' && r.attending) return false;
    return !needle || fold(r.name).includes(needle);
  });
  const hiddenCount = rows.filter((r) => r.hidden).length;
  const filtered = Boolean(q.trim()) || status !== 'all';

  // CSV UTF-8 có BOM để Excel đọc đúng dấu
  const exportCsv = () => {
    // Ô bắt đầu bằng = + - @ (hoặc tab / xuống dòng) thì Excel chạy như công thức, kể cả trong
    // ngoặc kép: khách gõ tên =HYPERLINK(...) là thành link độc trong file. Thêm ' phía trước.
    const cell = (v) => {
      let s = String(v ?? '');
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      return `"${s.replace(/"/g, '""')}"`;
    };
    const lines = [['ho_ten', 'trang_thai', 'loi_nhan', 'gui_luc', 'sua_luc'].join(',')]
      .concat(visible.map((r) => [r.name, r.attending ? 'Tham dự' : 'Không đến', r.message || '', timeVN(r.created_at), r.updated_at ? timeVN(r.updated_at) : ''].map(cell).join(',')));
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `khach-bo-me-moi-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(SITE_URL); toast('Đã chép link thiệp bố mẹ'); } catch { toast(SITE_URL); }
  };

  const row = (r, isPast = false) => {
    const note = (r.message || '').trim();
    const isOpen = open.has(r.id);
    return (
      <article key={r.id} className={`ra-row${r.hidden ? ' is-hidden' : ''}${isPast ? ' is-past' : ''}`}>
        <div className="ra-name">
          <strong>{r.name}</strong>
          {r.hidden && <span className="rw-tag off">Đã ẩn</span>}
          {r.history.length > 0 && (
            <button type="button" className="ra-edits" aria-expanded={isOpen} onClick={() => toggleOpen(r.id)}>
              đã sửa {r.history.length} lần {isOpen ? '▴' : '▾'}
            </button>
          )}
        </div>
        <div className="ra-status">
          <span className={`ra-badge ${r.attending ? 'yes' : 'no'}`}>{r.attending ? 'Tham dự' : 'Không đến'}</span>
        </div>
        <button
          type="button"
          className={`ra-note${note ? '' : ' empty'}${isOpen ? ' open' : ''}`}
          onClick={() => note && toggleOpen(r.id)}
          disabled={!note}
          title={note && !isOpen ? 'Bấm để đọc hết' : undefined}
        >
          {note || '—'}
        </button>
        <div className="ra-time">
          {timeVN(r.created_at)}
          {r.updated_at && <span className="rw-edited">Sửa {timeVN(r.updated_at)}</span>}
        </div>
        <div className="rw-g-act">
          <button type="button" className="rw-btn" onClick={() => toggleHidden(r)}>{r.hidden ? 'Hiện lại' : 'Ẩn'}</button>
          <button type="button" className="rw-btn danger" onClick={() => remove(r)}>Xoá</button>
        </div>
      </article>
    );
  };

  return (
    <div>
      <div className="rw-head">
        <div>
          <h1>Khách bố mẹ mời</h1>
          <p className="page-desc">Hồi âm từ thiệp bố mẹ gửi đồng nghiệp, cấp trên (/adult) — có cả lời từ chối</p>
        </div>
        <div className="rw-head-act">
          <a className="admin-btn admin-btn-secondary" href="/adult" target="_blank" rel="noreferrer">Mở thiệp bố mẹ ↗</a>
          <button type="button" className="admin-btn admin-btn-secondary" onClick={copyLink}>Sao chép link gửi Zalo</button>
          <button type="button" className="admin-btn admin-btn-secondary" onClick={reload} disabled={refreshing}>
            {refreshing ? 'Đang tải…' : 'Tải lại'}
          </button>
          <button type="button" className="admin-btn admin-btn-primary" onClick={exportCsv} disabled={!visible.length}>
            Xuất CSV <span className="rw-btn-count">{visible.length}</span>
          </button>
        </div>
      </div>

      <div className="rw-sides ra-sides">
        {STATUS_TABS.map((t) => {
          const on = status === t.key;
          return (
            <button key={t.key} type="button" className={`rw-side${on ? ' on' : ''}`} aria-pressed={on} onClick={() => setStatus(t.key)}>
              <span className="rw-side-label">{t.label}</span>
              <span className="rw-side-n">{loading ? '…' : counts[t.key]}<small> khách</small></span>
            </button>
          );
        })}
      </div>

      {loadError && <div className="rw-banner">Không tải lại được — đang hiện dữ liệu lần trước.</div>}

      <div className="rw-toolbar">
        <div className="rw-search">
          <input
            placeholder="Tìm theo tên"
            aria-label="Tìm theo tên"
            enterKeyHint="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && <button type="button" className="rw-search-clear" aria-label="Xoá ô tìm" onClick={() => setQ('')}>×</button>}
        </div>
        <div className="rw-filters">
          <label className={`rw-chip${everySend ? ' on' : ''}`}>
            <input type="checkbox" checked={everySend} onChange={(e) => setEverySend(e.target.checked)} />
            Hiện mọi lần gửi
          </label>
          <label className={`rw-chip${showHidden ? ' on' : ''}`}>
            <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} />
            Hiện dòng đã ẩn <span className="n">{hiddenCount}</span>
          </label>
          <span className="rw-meta">{visible.length} dòng</span>
        </div>
      </div>

      {loading ? null : visible.length === 0 ? (
        <div className="rw-empty">
          {rows.length === 0 ? (
            <>
              <h3>Chưa có hồi âm nào</h3>
              <p>Khi khách gửi xác nhận trên thiệp bố mẹ (/adult), tên sẽ hiện ở đây.</p>
            </>
          ) : filtered ? (
            <>
              <h3>Không có dòng nào khớp</h3>
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => { setQ(''); setStatus('all'); }}>Bỏ lọc</button>
            </>
          ) : (
            <>
              <h3>Mọi dòng đều đang ẩn</h3>
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setShowHidden(true)}>Hiện dòng đã ẩn</button>
            </>
          )}
        </div>
      ) : (
        <div className="rw-list">
          <div className="ra-row ra-head" aria-hidden="true">
            <span>Họ tên</span><span>Trạng thái</span><span>Lời nhắn</span><span>Gửi lúc</span><span />
          </div>
          {visible.map((r) => (
            <div key={r.id} className="ra-group">
              {row(r)}
              {open.has(r.id) && r.history.map((h) => row({ ...h, history: [] }, true))}
            </div>
          ))}
        </div>
      )}
      {visible.length > 0 && (
        <p className="rw-pending-note">
          Khách sửa lại trên cùng máy thì dòng cũ được cập nhật (&ldquo;Sửa …&rdquo;); gửi từ máy khác thì thêm một lần gửi — danh sách gộp theo tên và lấy lần mới nhất.
          Ẩn thì còn hiện lại được · Xoá là mất hẳn.
        </p>
      )}

      <AdultTextCard adminConfig={adminConfig} toast={toast} />
      {ToastEl}
    </div>
  );
}
