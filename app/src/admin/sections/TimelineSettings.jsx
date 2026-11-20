import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../components/Toast';

/*
 * Mốc giờ không còn ảnh (11/2026): bản desktop làm lại dùng minh hoạ nét vẽ như điện
 * thoại, nên ảnh của từng mốc không hiện ở đâu nữa và trang này bỏ ô tải/chỉnh khung.
 * Cột timeline_events.image_path vẫn còn trong DB; trang này giữ nguyên giá trị của nó.
 * Hai ảnh hai bên trục lịch trình nằm ở trang Media (background/timeline-left|right.jpg).
 */

export default function TimelineSettings() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast, ToastEl } = useToast();
  const fetchEvents = async () => {
    const { data } = await supabase
      .from('timeline_events')
      .select('*')
      .order('sort_order');
    if (data) setEvents(data);
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, []);

  const updateEvent = (id, field, value) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  // Sự kiện mới chỉ là bản nháp trong admin (khách chưa thấy) cho tới khi điền và bấm Lưu.
  // Trước 21/11 "+ Thêm" ghi ngay "00:00 Sự kiện mới" lên trang khách.
  const saveEvent = async (event) => {
    if (!event.time?.trim() || !event.label_vi?.trim()) { toast('Nhập giờ và tên sự kiện trước khi lưu'); return; }
    const fields = {
      time: event.time,
      label_vi: event.label_vi,
      label_en: event.label_en,
      image_path: event.image_path,
      sort_order: event.sort_order,
    };
    if (event.draft) {
      const { data, error } = await supabase.from('timeline_events').insert(fields).select().single();
      if (error || !data) { toast('Không lưu được'); return; }
      setEvents((prev) => prev.map((e) => (e.id === event.id ? data : e)));
      toast('Đã thêm');
      return;
    }
    const { error } = await supabase
      .from('timeline_events')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', event.id);
    toast(error ? 'Error saving' : 'Saved!');
  };

  const addEvent = () => {
    const maxOrder = events.reduce((max, e) => Math.max(max, e.sort_order), 0);
    setEvents((prev) => [...prev, {
      id: `draft-${Date.now()}`, draft: true, time: '', label_vi: '', label_en: '', image_path: '', sort_order: maxOrder + 1,
    }]);
  };

  const deleteEvent = async (id) => {
    const ev = events.find((x) => x.id === id);
    if (ev?.draft) { setEvents((prev) => prev.filter((x) => x.id !== id)); return; } // nháp: chỉ bỏ khỏi admin
    if (!window.confirm(`Xoá sự kiện "${ev?.label_vi || ev?.time || 'này'}" khỏi lịch trình? Không khôi phục được.`)) return;
    const { error } = await supabase.from('timeline_events').delete().eq('id', id);
    if (error) { toast('Không xoá được'); return; }
    {
      setEvents((prev) => prev.filter((e) => e.id !== id));
      toast('Deleted');
    }
  };

  if (loading) return <div>Loading…</div>;

  return (
    <div>
      <h1>Lịch trình · Timeline</h1>
      <p className="page-desc">Quản lý các sự kiện trong ngày cưới</p>

      <div className="admin-card">
        <h3>Danh sách sự kiện</h3>
        {events.map((ev) => (
          <div key={ev.id} style={{ padding: '18px 0', borderBottom: '1px solid #f0eded' }}>
            <div className="admin-row">
              <div className="admin-field">
                <label>Giờ · Time</label>
                <input
                  type="text"
                  value={ev.time}
                  onChange={(e) => updateEvent(ev.id, 'time', e.target.value)}
                  placeholder="17:00"
                />
              </div>
              <div className="admin-field">
                <label>Thứ tự · Order</label>
                <input
                  type="number"
                  value={ev.sort_order}
                  onChange={(e) => updateEvent(ev.id, 'sort_order', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="admin-row">
              <div className="admin-field">
                <label>Tên sự kiện (VI)</label>
                <input
                  type="text"
                  value={ev.label_vi}
                  onChange={(e) => updateEvent(ev.id, 'label_vi', e.target.value)}
                />
              </div>
              <div className="admin-field">
                <label>Tên sự kiện (EN)</label>
                <input
                  type="text"
                  value={ev.label_en}
                  onChange={(e) => updateEvent(ev.id, 'label_en', e.target.value)}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
              <button className="admin-btn admin-btn-secondary" onClick={() => saveEvent(ev)}>{ev.draft ? 'Lưu để hiện trên trang' : 'Lưu · Save'}</button>
              <button className="admin-btn admin-btn-danger" onClick={() => deleteEvent(ev.id)}>{ev.draft ? 'Bỏ' : 'Xoá · Delete'}</button>
              {ev.draft && <span style={{ fontSize: 12, color: '#A89996' }}>Chưa lưu — khách chưa thấy</span>}
            </div>
          </div>
        ))}
        <button className="admin-btn admin-btn-secondary" style={{ marginTop: 16 }} onClick={addEvent}>
          + Thêm sự kiện · Add event
        </button>
      </div>
      {ToastEl}
    </div>
  );
}
