import { useState, useEffect } from 'react';
import { useToast } from '../components/Toast';

export default function GeneralSettings({ adminConfig }) {
  const { getValue, saveMultiple, saving } = adminConfig;
  const { toast, ToastEl } = useToast();

  const fields = [
    { key: 'groom_name', label: 'Tên chú rể · Groom full name' },
    { key: 'groom_short', label: 'Tên ngắn chú rể · Groom short name' },
    { key: 'bride_name', label: 'Tên cô dâu · Bride full name' },
    { key: 'bride_short', label: 'Tên ngắn cô dâu · Bride short name' },
    { key: 'wedding_date', label: 'Ngày cưới · Wedding date', type: 'date' },
    { key: 'wedding_time', label: 'Giờ cưới · Wedding time', type: 'time' },
    { key: 'venue_name', label: 'Tên địa điểm · Venue name' },
    { key: 'venue_address', label: 'Địa chỉ · Venue address' },
    { key: 'phone', label: 'Số điện thoại · Phone' },
    { key: 'map_url', label: 'Link bản đồ · Map URL' },
  ];

  const [values, setValues] = useState({});

  useEffect(() => {
    const v = {};
    fields.forEach((f) => { v[f.key] = getValue(f.key); });
    setValues(v);
  }, [adminConfig.configs]);

  const handleSave = async () => {
    const ok = await saveMultiple(values);
    toast(ok ? 'Saved!' : 'Error saving');
  };

  return (
    <div>
      <h1>Thông tin chung · General</h1>
      <p className="page-desc">Thông tin cơ bản hiển thị trên toàn bộ trang cưới</p>

      <div className="admin-card">
        <h3>Tên cô dâu & chú rể</h3>
        <div className="admin-row">
          {fields.slice(0, 2).map((f) => (
            <div key={f.key} className="admin-field">
              <label>{f.label}</label>
              <input
                type="text"
                value={values[f.key] || ''}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              />
            </div>
          ))}
        </div>
        <div className="admin-row">
          {fields.slice(2, 4).map((f) => (
            <div key={f.key} className="admin-field">
              <label>{f.label}</label>
              <input
                type="text"
                value={values[f.key] || ''}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="admin-card">
        <h3>Ngày giờ & Địa điểm</h3>
        <div className="admin-row">
          {fields.slice(4, 6).map((f) => (
            <div key={f.key} className="admin-field">
              <label>{f.label}</label>
              <input
                type={f.type || 'text'}
                value={values[f.key] || ''}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              />
            </div>
          ))}
        </div>
        {fields.slice(6, 10).map((f) => (
          <div key={f.key} className="admin-field">
            <label>{f.label}</label>
            <input
              type="text"
              value={values[f.key] || ''}
              onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
            />
          </div>
        ))}
      </div>

      <div className="admin-actions">
        <button className="admin-btn admin-btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Lưu thay đổi · Save'}
        </button>
      </div>
      {ToastEl}
    </div>
  );
}
