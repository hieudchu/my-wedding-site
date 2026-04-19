import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../components/Toast';

export default function FamilySettings() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast, ToastEl } = useToast();

  const fetchMembers = async () => {
    const { data } = await supabase
      .from('family_members')
      .select('*')
      .order('side')
      .order('sort_order');
    if (data) setMembers(data);
    setLoading(false);
  };

  useEffect(() => { fetchMembers(); }, []);

  const updateMember = (id, field, value) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const saveMember = async (member) => {
    const { error } = await supabase
      .from('family_members')
      .update({
        role_label: member.role_label,
        name_vi: member.name_vi,
        name_en: member.name_en,
        sort_order: member.sort_order,
        updated_at: new Date().toISOString(),
      })
      .eq('id', member.id);
    toast(error ? 'Error saving' : 'Saved!');
  };

  const addMember = async (side) => {
    const maxOrder = members
      .filter((m) => m.side === side)
      .reduce((max, m) => Math.max(max, m.sort_order), 0);

    const { data, error } = await supabase
      .from('family_members')
      .insert({
        side,
        role_label: 'Vai trò · Role',
        name_vi: 'Họ và tên',
        name_en: 'Full name',
        sort_order: maxOrder + 1,
      })
      .select()
      .single();

    if (!error && data) {
      setMembers((prev) => [...prev, data]);
      toast('Added!');
    }
  };

  const deleteMember = async (id) => {
    const { error } = await supabase.from('family_members').delete().eq('id', id);
    if (!error) {
      setMembers((prev) => prev.filter((m) => m.id !== id));
      toast('Deleted');
    }
  };

  const groomMembers = members.filter((m) => m.side === 'groom');
  const brideMembers = members.filter((m) => m.side === 'bride');

  if (loading) return <div>Loading…</div>;

  return (
    <div>
      <h1>Gia đình · Family</h1>
      <p className="page-desc">Quản lý danh sách thành viên gia đình cô dâu & chú rể</p>

      {[
        { title: 'Nhà trai · Groom\'s Family', side: 'groom', list: groomMembers },
        { title: 'Nhà gái · Bride\'s Family', side: 'bride', list: brideMembers },
      ].map(({ title, side, list }) => (
        <div key={side} className="admin-card">
          <h3>{title}</h3>
          {list.map((m) => (
            <div key={m.id} style={{ padding: '14px 0', borderBottom: '1px solid #f0eded' }}>
              <div className="admin-row">
                <div className="admin-field">
                  <label>Vai trò · Role</label>
                  <input
                    type="text"
                    value={m.role_label}
                    onChange={(e) => updateMember(m.id, 'role_label', e.target.value)}
                  />
                </div>
                <div className="admin-field">
                  <label>Thứ tự · Order</label>
                  <input
                    type="number"
                    value={m.sort_order}
                    onChange={(e) => updateMember(m.id, 'sort_order', parseInt(e.target.value) || 0)}
                    style={{ width: 80 }}
                  />
                </div>
              </div>
              <div className="admin-row">
                <div className="admin-field">
                  <label>Tên tiếng Việt</label>
                  <input
                    type="text"
                    value={m.name_vi}
                    onChange={(e) => updateMember(m.id, 'name_vi', e.target.value)}
                  />
                </div>
                <div className="admin-field">
                  <label>Tên tiếng Anh</label>
                  <input
                    type="text"
                    value={m.name_en}
                    onChange={(e) => updateMember(m.id, 'name_en', e.target.value)}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="admin-btn admin-btn-secondary" onClick={() => saveMember(m)}>
                  Save
                </button>
                <button className="admin-btn admin-btn-danger" onClick={() => deleteMember(m.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
          <button
            className="admin-btn admin-btn-secondary"
            style={{ marginTop: 16 }}
            onClick={() => addMember(side)}
          >
            + Thêm thành viên · Add member
          </button>
        </div>
      ))}
      {ToastEl}
    </div>
  );
}
