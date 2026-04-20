import { useState, useEffect } from 'react';
import { useToast } from '../components/Toast';

const SECTIONS = [
  {
    title: 'Gate · Trang mở',
    keys: ['gate_tagline', 'gate_prompt', 'gate_prompt_sub'],
  },
  {
    title: 'Details · Chuyện tình',
    keys: ['details_heading', 'details_paragraph'],
  },
  {
    title: 'Family · Gia đình',
    keys: ['groom_bio', 'groom_hometown', 'bride_bio', 'bride_hometown'],
  },
  {
    title: 'Info · Thiệp mời',
    keys: ['info_announce', 'info_announce_en', 'info_venue_prefix', 'info_time_label', 'info_map_button'],
  },
  {
    title: 'RSVP · Xác nhận',
    keys: ['rsvp_heading', 'rsvp_paragraph', 'rsvp_dress_code', 'rsvp_dress_code_en'],
  },
  {
    title: 'Footer',
    keys: ['footer_text'],
  },
];

export default function TextSettings({ adminConfig }) {
  const { configs, getValue, saveMultiple, saving } = adminConfig;
  const { toast, ToastEl } = useToast();
  const [values, setValues] = useState({});

  useEffect(() => {
    const v = {};
    SECTIONS.forEach((s) => s.keys.forEach((k) => { v[k] = getValue(k); }));
    setValues(v);
  }, [configs]);

  const handleSave = async () => {
    const ok = await saveMultiple(values);
    toast(ok ? 'Saved!' : 'Error saving');
  };

  const isTextarea = (key) =>
    key.includes('paragraph') || key.includes('bio') || key.includes('dress_code') || key.includes('tagline');

  return (
    <div>
      <h1>Nội dung · Text Content</h1>
      <p className="page-desc">Chỉnh sửa các đoạn văn bản trên trang cưới theo từng section</p>

      {SECTIONS.map((section) => (
        <div key={section.title} className="admin-card">
          <h3>{section.title}</h3>
          {section.keys.map((key) => (
            <div key={key} className="admin-field">
              <label>{configs[key]?.label || key}</label>
              {isTextarea(key) ? (
                <textarea
                  value={values[key] || ''}
                  onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                  rows={3}
                />
              ) : (
                <input
                  type="text"
                  value={values[key] || ''}
                  onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                />
              )}
            </div>
          ))}
        </div>
      ))}

      <div className="admin-actions">
        <button className="admin-btn admin-btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Lưu thay đổi · Save'}
        </button>
      </div>
      {ToastEl}
    </div>
  );
}
