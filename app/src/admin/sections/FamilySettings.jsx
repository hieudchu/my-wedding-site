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

  // Người mới chỉ là bản nháp trong admin (khách chưa thấy) cho tới khi điền tên và bấm Lưu.
  // Trước 21/11 "+ Thêm" ghi ngay một dòng mẫu "Họ và tên" lên trang khách.
  const saveMember = async (member) => {
    if (!member.name_vi?.trim()) { toast('Nhập họ tên trước khi lưu'); return; }
    const fields = {
      role_label: member.role_label,
      name_vi: member.name_vi,
      name_en: member.name_en,
      sort_order: member.sort_order,
    };
    if (member.draft) {
      const { data, error } = await supabase
        .from('family_members')
        .insert({ side: member.side, ...fields })
        .select()
        .single();
      if (error || !data) { toast('Không lưu được'); return; }
      setMembers((prev) => prev.map((m) => (m.id === member.id ? data : m)));
      toast('Đã thêm');
      return;
    }
    const { error } = await supabase
      .from('family_members')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', member.id);
    toast(error ? 'Error saving' : 'Saved!');
  };

  const addMember = (side) => {
    const maxOrder = members
      .filter((m) => m.side === side)
      .reduce((max, m) => Math.max(max, m.sort_order), 0);
    setMembers((prev) => [...prev, {
      id: `draft-${Date.now()}`, draft: true, side, role_label: '', name_vi: '', name_en: '', sort_order: maxOrder + 1,
    }]);
  };

  const deleteMember = async (id) => {
    const m = members.find((x) => x.id === id);
    if (m?.draft) { setMembers((prev) => prev.filter((x) => x.id !== id)); return; } // nháp: chỉ bỏ khỏi admin
    if (!window.confirm(`Xoá "${m?.name_vi || 'người này'}" khỏi danh sách gia đình? Không khôi phục được.`)) return;
    const { error } = await supabase.from('family_members').delete().eq('id', id);
    if (error) { toast('Không xoá được'); return; }
    {
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
      <p className="page-desc">
        Thiệp bố mẹ (/adult) hiện tên theo đúng thứ tự này, hai bên chia đôi dưới nhãn &ldquo;Nhà trai&rdquo; /
        &ldquo;Nhà gái&rdquo; (không hiện chức danh). Tên dài hơn 24 ký tự sẽ xuống hai dòng trên điện thoại.
      </p>

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
                  <label>Họ tên · Name</label>
                  <input
                    type="text"
                    value={m.name_vi}
                    onChange={(e) => updateMember(m.id, 'name_vi', e.target.value)}
                  />
                </div>
                {/* Bỏ ô "Tên tiếng Anh" (11/2026): trang khách chỉ hiện name_vi. Cột name_en vẫn
                    còn trong DB và được lưu lại nguyên giá trị cũ. */}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                <button className="admin-btn admin-btn-secondary" onClick={() => saveMember(m)}>
                  {m.draft ? 'Lưu để hiện trên trang' : 'Save'}
                </button>
                <button className="admin-btn admin-btn-danger" onClick={() => deleteMember(m.id)}>
                  {m.draft ? 'Bỏ' : 'Delete'}
                </button>
                {m.draft && <span style={{ fontSize: 12, color: '#A89996' }}>Chưa lưu — khách chưa thấy</span>}
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
