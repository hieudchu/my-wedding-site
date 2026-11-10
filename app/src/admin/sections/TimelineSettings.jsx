import { useState, useEffect } from 'react';
import { withoutEntry, findEntry, fitFor } from '../../lib/mediaManifest';
import { applyToManifest, loadManifest, manifestErrorHint } from '../../lib/manifestStore';
import { useFramer, uploadFramed, saveFit, entrySrc, fitStatus, FitThumb, variantStoragePaths } from '../framing';
import { supabase } from '../../lib/supabase';
import { useToast } from '../components/Toast';

// Ảnh lịch trình nằm chung kho với mọi ảnh khác, nên cũng phải có mặt trong bản kê.
const TIMELINE_FOLDER = 'timeline';

export default function TimelineSettings() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast, ToastEl } = useToast();
  const framer = useFramer();
  // Bản kê — để biết khung đã lưu của từng ảnh. Hỏng thì null: ảnh hiện như chưa chỉnh.
  const [manifest, setManifest] = useState(null);
  useEffect(() => {
    loadManifest().then(setManifest, (err) => console.error('Không đọc được bản kê media:', err));
  }, []);

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

  /**
   * Trang này ghi thẳng vào kho ảnh, nên nó cũng phải ghi bản kê.
   *
   * Bản kê là chỗ trang khách tra `?v=` của từng ảnh. Bỏ qua nó thì:
   *   - thay ảnh: `v` cũ nằm nguyên nên URL không đổi, khách vẫn thấy tấm cũ
   *     nằm trong cache CDN — có khi tới tận ngày cưới;
   *   - xoá ảnh: bản kê còn lại một mục trỏ vào file không còn nữa.
   *
   * Cả hai chỉ xảy ra khi thư mục timeline đã có mục trong bản kê — sau một lượt
   * tải lên ở trang Media hoặc một lần bấm "Quét lại kho" — nên hôm nay im lặng
   * không có nghĩa là mai vẫn im lặng.
   *
   * Dùng chung applyToManifest với trang Media: chung một hàng đợi thì hai trang
   * không đè lên lượt ghi của nhau.
   */
  const writeManifest = async (mutate) => {
    try {
      await applyToManifest(mutate);
      return null;
    } catch (err) {
      console.error('Không ghi được bản kê media:', err);
      return manifestErrorHint(err);
    }
  };

  const fileNameIn = (path) =>
    (path || '').startsWith(`${TIMELINE_FOLDER}/`) ? path.slice(TIMELINE_FOLDER.length + 1) : null;

  /**
   * Chọn ảnh cho một mốc giờ: mở trình chỉnh khung trước, chưa tải gì. Bấm "Tải lên"
   * thì xoay/nén/tải/sinh bản nén/ghi bản kê kèm khung (framing.uploadFramed), rồi
   * mới nối đường dẫn vào mốc giờ.
   */
  const uploadImage = (ev, picked) => {
    const eventId = ev.id;
    framer.openNew({
      slot: `${TIMELINE_FOLDER}/${eventId}.jpg`,
      label: `${ev.time} · ${ev.label_vi || 'Sự kiện'}`,
      file: picked,
      onPickAnother: () => document.getElementById(`tl-upload-${eventId}`)?.click(),
      onSave: async (result, report) => {
        // Ảnh cũ của sự kiện này có thể mang đuôi khác, tức là một file khác hẳn chứ
        // không phải file vừa bị đè lên. Không dọn thì nó nằm lại trong kho mãi và
        // bản kê vẫn kể tên nó.
        const stale = fileNameIn(events.find((e) => e.id === eventId)?.image_path);
        const staleOpt = stale ? variantStoragePaths(TIMELINE_FOLDER, findEntry(manifest, `${TIMELINE_FOLDER}/${stale}`)) : [];
        const { manifest: next, name } = await uploadFramed({
          folder: TIMELINE_FOLDER,
          fileName: (file) => `${eventId}.${file.name.split('.').pop()}`,
          picked,
          result,
          report,
          extra: (m, v, fileName) => (stale && stale !== fileName ? withoutEntry(m, TIMELINE_FOLDER, stale) : m),
        });
        setManifest(next);
        if (stale && stale !== name) {
          await supabase.storage.from('media').remove([`${TIMELINE_FOLDER}/${stale}`, ...staleOpt]);
        }
        const path = `${TIMELINE_FOLDER}/${name}`;
        updateEvent(eventId, 'image_path', path);
        const { error } = await supabase
          .from('timeline_events')
          .update({ image_path: path, updated_at: new Date().toISOString() })
          .eq('id', eventId);
        toast(error ? 'Ảnh đã lên kho nhưng chưa nối được vào mốc giờ · bấm Lưu' : 'Đã tải lên — ' + ev.label_vi);
      },
    });
  };

  const editFrame = (ev) => {
    const name = fileNameIn(ev.image_path);
    const entry = findEntry(manifest, ev.image_path);
    framer.openExisting({
      slot: ev.image_path,
      label: `${ev.time} · ${ev.label_vi || 'Sự kiện'}`,
      src: entry ? entrySrc(TIMELINE_FOLDER, entry) : getPublicUrl(ev.image_path),
      fit: fitFor(entry),
      w: entry?.w || 0,
      h: entry?.h || 0,
      onSave: async (r) => {
        setManifest(await saveFit({ folder: TIMELINE_FOLDER, fileName: name, fit: r.fit }));
        toast('Đã lưu khung — ' + ev.label_vi);
      },
    });
  };

  const removeImage = async (eventId, imagePath) => {
    if (imagePath) {
      // Xoá cùng các bản nén trong _opt/, nếu không chúng nằm lại trong kho mãi
      const opt = variantStoragePaths(TIMELINE_FOLDER, findEntry(manifest, imagePath));
      await supabase.storage.from('media').remove([imagePath, ...opt]);
    }
    updateEvent(eventId, 'image_path', '');
    await supabase
      .from('timeline_events')
      .update({ image_path: '', updated_at: new Date().toISOString() })
      .eq('id', eventId);

    // Không chép sẵn kho ở đây: thư mục chưa có mục nào trong bản kê thì cũng
    // chẳng có mục nào để gỡ.
    const name = fileNameIn(imagePath);
    const hint = name ? await writeManifest((m) => withoutEntry(m, TIMELINE_FOLDER, name)) : null;
    if (!hint) loadManifest().then(setManifest, () => {});
    toast(hint ? 'Đã xoá file nhưng chưa cập nhật được bản kê · ' + hint : 'Đã xoá ảnh');
  };

  const getPublicUrl = (path) => {
    if (!path) return null;
    const { data } = supabase.storage.from('media').getPublicUrl(path);
    return data?.publicUrl || null;
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
          <div key={ev.id} style={{ padding: '18px 0', borderBottom: '1px solid #f0eded' }}>
            <div className="slot-card">
              {/* Ô xem trước đúng khung máy tính 4:3, áp khung đã lưu */}
              <FitThumb
                kind="43"
                src={ev.image_path ? getPublicUrl(ev.image_path) + `?v=${findEntry(manifest, ev.image_path)?.v || ''}` : null}
                fit={fitFor(findEntry(manifest, ev.image_path))}
                alt={ev.label_vi}
                onClick={() => document.getElementById(`tl-upload-${ev.id}`)?.click()}
              >
                <div className="slot-empty">+ Upload</div>
              </FitThumb>
              <input
                id={`tl-upload-${ev.id}`}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadImage(ev, file);
                  e.target.value = '';
                }}
              />
              <div className="slot-info">
                <div className="slot-label">{ev.label_vi || 'Sự kiện mới'}</div>
                <div className="slot-desc">{ev.image_path || 'Chưa có ảnh · No image yet'}</div>
                {ev.image_path && (
                  <div className={'slot-status' + (fitStatus(fitFor(findEntry(manifest, ev.image_path))).set ? ' filled' : '')}>
                    {fitStatus(fitFor(findEntry(manifest, ev.image_path))).text}
                  </div>
                )}
                {ev.image_path && (
                  <div className="if-slot-act">
                    <button type="button" className="rw-btn if-go" onClick={() => editFrame(ev)}>Chỉnh khung</button>
                    <button type="button" className="rw-btn" onClick={() => document.getElementById(`tl-upload-${ev.id}`)?.click()}>Đổi ảnh</button>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  {ev.image_path && (
                    <button className="admin-btn admin-btn-danger" style={{ padding: '5px 12px', fontSize: 11 }} onClick={() => removeImage(ev.id, ev.image_path)}>
                      Xoá ảnh · Delete
                    </button>
                  )}
                  {!ev.image_path && (
                    <button className="admin-btn admin-btn-secondary" style={{ padding: '5px 12px', fontSize: 11 }} onClick={() => document.getElementById(`tl-upload-${ev.id}`)?.click()}>
                      Chọn ảnh · Upload
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="admin-row" style={{ marginTop: 12 }}>
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
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="admin-btn admin-btn-secondary" onClick={() => saveEvent(ev)}>Lưu · Save</button>
              <button className="admin-btn admin-btn-danger" onClick={() => deleteEvent(ev.id)}>Xoá · Delete</button>
            </div>
          </div>
        ))}
        <button className="admin-btn admin-btn-secondary" style={{ marginTop: 16 }} onClick={addEvent}>
          + Thêm sự kiện · Add event
        </button>
      </div>
      {framer.element}
      {ToastEl}
    </div>
  );
}
