import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../components/Toast';

export default function RSVPList() {
  const [rsvps, setRsvps] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast, ToastEl } = useToast();

  const fetchRsvps = async () => {
    const { data } = await supabase
      .from('rsvps')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setRsvps(data);
    setLoading(false);
  };

  useEffect(() => { fetchRsvps(); }, []);

  const deleteRsvp = async (id) => {
    const { error } = await supabase.from('rsvps').delete().eq('id', id);
    if (!error) {
      setRsvps((prev) => prev.filter((r) => r.id !== id));
      toast('Deleted');
    }
  };

  const attending = rsvps.filter((r) => r.attending);
  const notAttending = rsvps.filter((r) => !r.attending);
  const totalGuests = attending.reduce((sum, r) => sum + (r.guest_count || 1), 0);

  if (loading) return <div>Loading…</div>;

  return (
    <div>
      <h1>RSVP · Danh sách khách</h1>
      <p className="page-desc">Xem và quản lý danh sách xác nhận tham dự</p>

      <div className="rsvp-stats">
        <div className="rsvp-stat">
          <div className="n">{rsvps.length}</div>
          <div className="l">Tổng phản hồi</div>
        </div>
        <div className="rsvp-stat">
          <div className="n">{totalGuests}</div>
          <div className="l">Khách tham dự</div>
        </div>
        <div className="rsvp-stat">
          <div className="n">{notAttending.length}</div>
          <div className="l">Gửi lời chúc</div>
        </div>
      </div>

      <div className="admin-card" style={{ overflow: 'auto' }}>
        {rsvps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#A89996' }}>
            Chưa có phản hồi nào · No responses yet
          </div>
        ) : (
          <table className="rsvp-table">
            <thead>
              <tr>
                <th>Tên</th>
                <th>Tham dự</th>
                <th>Số khách</th>
                <th>Bên</th>
                <th>Phone</th>
                <th>Lời nhắn</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rsvps.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.name}</strong>
                    {r.email && <div style={{ fontSize: 11, color: '#A89996' }}>{r.email}</div>}
                  </td>
                  <td>
                    <span className={`rsvp-badge ${r.attending ? 'yes' : 'no'}`}>
                      {r.attending ? 'Tham dự' : 'Gửi lời chúc'}
                    </span>
                  </td>
                  <td>{r.attending ? r.guest_count : '—'}</td>
                  <td style={{ textTransform: 'capitalize' }}>{r.side}</td>
                  <td>{r.phone || '—'}</td>
                  <td style={{ maxWidth: 200, fontSize: 12 }}>
                    {r.message || '—'}
                  </td>
                  <td>
                    <button
                      className="admin-btn admin-btn-danger"
                      style={{ padding: '4px 10px', fontSize: 11 }}
                      onClick={() => deleteRsvp(r.id)}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="admin-actions">
        <button className="admin-btn admin-btn-secondary" onClick={fetchRsvps}>
          Refresh
        </button>
      </div>
      {ToastEl}
    </div>
  );
}
