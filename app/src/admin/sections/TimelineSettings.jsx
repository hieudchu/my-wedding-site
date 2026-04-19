import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../components/Toast';

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

  const saveEvent = async (event) => {
    const { error } = await supabase
      .from('timeline_events')
      .update({
        time: event.time,
        label_vi: event.label_vi,
        label_en: event.label_en,
        image_path: event.image_path,
        sort_order: event.sort_order,
        updated_at: new Date().toISOString(),
      })
      .eq('id', event.id);
    toast(error ? 'Error saving' : 'Saved!');
  };

  const addEvent = async () => {
    const maxOrder = events.reduce((max, e) => Math.max(max, e.sort_order), 0);
    const { data, error } = await supabase
      .from('timeline_events')
      .insert({
        time: '00:00',
        label_vi: 'Sự kiện mới',
        label_en: 'New event',
        image_path: '',
        sort_order: maxOrder + 1,
      })
      .select()
      .single();

    if (!error && data) {
      setEvents((prev) => [...prev, data]);
      toast('Added!');
    }
  };

  const deleteEvent = async (id) => {
    const { error } = await supabase.from('timeline_events').delete().eq('id', id);
    if (!error) {
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
          <div key={ev.id} style={{ padding: '14px 0', borderBottom: '1px solid #f0eded' }}>
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
                <label>Event name (EN)</label>
                <input
                  type="text"
                  value={ev.label_en}
                  onChange={(e) => updateEvent(ev.id, 'label_en', e.target.value)}
                />
              </div>
            </div>
            <div className="admin-field">
              <label>Storage image path</label>
              <input
                type="text"
                value={ev.image_path}
                onChange={(e) => updateEvent(ev.id, 'image_path', e.target.value)}
                placeholder="timeline/ceremony.jpg"
              />
              <div className="hint">Path trong Supabase Storage bucket "media"</div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="admin-btn admin-btn-secondary" onClick={() => saveEvent(ev)}>Save</button>
              <button className="admin-btn admin-btn-danger" onClick={() => deleteEvent(ev.id)}>Delete</button>
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
