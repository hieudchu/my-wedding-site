/* Trang Media rút gọn — chỉ để mở ImageFramer từ mọi lối vào.
   Phần cần port là ImageFramer.jsx + frames.js + styles/image-framer.css và các lối vào
   ("Chỉnh khung", ô xem trước áp fit.d). Dữ liệu / tải lên ở đây là giả lập. */
const { useState, useRef, useEffect } = React;

const SEED = {
  fixed: [
    { slot: 'portraits/bride.jpg', label: 'Chân dung cô dâu', src: 'photos/bride.jpg', w: 1066, h: 1600, thumb: 'arch',
      fit: { d: { x: 50, y: 50, z: 1 }, m: { x: 56, y: 42, z: 1.45 } },
      where: 'Trang nhà gái, cạnh lời giới thiệu cô dâu.', look: 'Vòm cao 3:4. Trên điện thoại có viền vàng mảnh.', section: 'Nhà gái' },
    { slot: 'portraits/groom.jpg', label: 'Chân dung chú rể', src: 'photos/groom.jpg', w: 1066, h: 1600, thumb: 'arch', fit: null,
      where: 'Trang nhà trai, cạnh lời giới thiệu chú rể.', look: 'Vòm cao 3:4, giống ảnh cô dâu.', section: 'Nhà trai' },
    { slot: 'background/right.jpg', label: 'Ảnh nền thiệp — bên phải', src: 'photos/right.jpg', w: 1077, h: 1600, thumb: 'blob34', fit: null,
      where: 'Sau tấm thiệp ở đầu trang, tràn ra mép phải.', look: 'Mảng giọt nước 3:4. Ảnh scan có viền trắng hai bên — phóng chừng 1,1× là hết.', section: 'Thiệp mời' },
    { slot: 'background/left.jpg', label: 'Ảnh nền thiệp — bên trái', src: 'photos/left.jpg', w: 1077, h: 1600, thumb: 'blob45', fit: null,
      where: 'Sau tấm thiệp ở đầu trang, tràn ra mép trái.', look: 'Mảng giọt nước 4:5, cũng có viền trắng như ảnh bên phải.', section: 'Thiệp mời' },
    { slot: 'background/moment-2.jpg', label: 'Ảnh đếm ngược', src: 'photos/moment-2.jpg', w: 1077, h: 1600, thumb: 'wide', fit: null,
      where: 'Ngay trên đồng hồ đếm ngược.', look: 'Dải ngang 16:9, thẻ đếm ngược đè chân ảnh. Điện thoại dọc hiện trọn ảnh.', section: 'Đếm ngược' },
  ],
  album: [
    { slot: 'carousel/01.jpg', label: 'Album · ảnh 1', name: 'carousel-1.jpg', src: 'photos/carousel-1.jpg', w: 1066, h: 1600, fit: null },
    { slot: 'carousel/02.jpg', label: 'Album · ảnh 2', name: 'carousel-2.jpg', src: 'photos/carousel-2.jpg', w: 1077, h: 1600, fit: { d: { x: 50, y: 30, z: 1.2 }, m: null } },
    { slot: 'carousel/03.jpg', label: 'Album · ảnh 3', name: 'right.jpg', src: 'photos/right.jpg', w: 1077, h: 1600, fit: null },
  ],
  timeline: [
    { slot: 'timeline/le-vu-quy.jpg', label: '09:00 · Lễ vu quy', src: 'photos/left.jpg', w: 1077, h: 1600, fit: null, thumb: '43',
      where: 'Mốc giờ thứ nhất trong lịch trình.', look: 'Máy tính 4:3, điện thoại 3:2.' },
  ],
};

const isCenter = (f) => !f || (Math.abs(f.x - 50) < 0.05 && Math.abs(f.y - 50) < 0.05 && Math.abs(f.z - 1) < 0.005);
function fitState(fit) {
  const dSet = fit && !isCenter(fit.d);
  const mOwn = fit && fit.m;
  if (!dSet && !mOwn) return { set: false, text: 'Khung: giữa ảnh (chưa chỉnh)' };
  return { set: true, text: 'Khung đã chỉnh · điện thoại ' + (mOwn ? 'có khung riêng' : 'dùng chung') };
}

const NAV = ['Thông tin chung', 'Lịch trình', 'Media', 'Khách xác nhận', 'Lời chúc', 'Nhạc nền'];

function Thumb({ item, kind, onClick }) {
  return (
    <div className={`slot-preview if-thumb if-thumb-${kind}`} onClick={onClick} title="Bấm để chọn ảnh khác">
      <div className="if-thumb-pic"><FitImg src={item.src} fit={item.fit && item.fit.d} alt={item.label} /></div>
    </div>
  );
}

function App() {
  const params = new URLSearchParams(location.search);
  const [data, setData] = useState(SEED);
  const [editor, setEditor] = useState(null);
  const [toast, setToast] = useState(null);
  const [drawer, setDrawer] = useState(false);
  const [opts, setOpts] = useState({ fail: params.get('fail') === '1', slow: params.get('slow') === '1' });
  const fileRef = useRef(null);
  const pickTarget = useRef(null);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2800); return () => clearTimeout(t); }, [toast]);

  const find = (group, i) => data[group][i];
  const openExisting = (group, i) => {
    const it = find(group, i);
    setEditor({ group, i, isNew: false, src: it.src, w: it.w, h: it.h, slot: it.slot, label: it.label, fit: it.fit });
  };
  const pickFile = (group, i) => { pickTarget.current = { group, i }; fileRef.current.value = ''; fileRef.current.click(); };
  const openNew = (group, i, src, fileName, w, h) => {
    const it = i != null ? find(group, i) : null;
    const n = data.album.length + 1;
    setEditor({
      group, i, isNew: true, src, fileName, w: w || 0, h: h || 0,
      slot: it ? it.slot : `carousel/${String(n).padStart(2, '0')}.jpg`,
      label: it ? it.label : `Album · ảnh ${n}`, fit: null,
    });
  };
  const onFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const { group, i } = pickTarget.current;
    openNew(group, i, URL.createObjectURL(f), f.name);
  };

  // Giả lập lưu: ảnh đã có → ghi dữ liệu ngay; ảnh mới → "tải lên" vài giây
  const save = (result, report) => {
    const ed = editor;
    const finish = (patch) => {
      setData((d) => {
        const list = [...d[ed.group]];
        if (ed.i == null) list.push({ slot: ed.slot, label: ed.label, name: ed.fileName || 'ảnh mới.jpg', ...patch });
        else list[ed.i] = { ...list[ed.i], ...patch };
        return { ...d, [ed.group]: list };
      });
      setEditor(null);
      setToast(ed.isNew ? `Đã tải lên — ${ed.label}` : `Đã lưu khung — ${ed.label}`);
    };
    if (!ed.isNew) return new Promise((r) => setTimeout(r, 350)).then(() => finish({ fit: result.fit }));
  const dur = opts.slow ? 6000 : 2200, fail = opts.fail, t0 = performance.now();
    return new Promise((resolve, reject) => {
      const tick = () => {
        const p = Math.min(1, (performance.now() - t0) / dur);
        if (fail && p >= 0.62) { setOpts((o) => ({ ...o, fail: false })); return reject(new Error('mạng bị ngắt giữa chừng')); }
        report(Math.round(p * 100));
        if (p >= 1) return resolve();
        setTimeout(tick, 100);
      };
      tick();
    })
      .then(() => (result.rotate ? rotateImageURL(ed.src, result.rotate) : new Promise((res) => {
        const im = new Image(); im.onload = () => res({ url: ed.src, w: im.naturalWidth, h: im.naturalHeight }); im.src = ed.src;
      })))
      .then((r) => finish({ src: r.url, w: r.w, h: r.h, fit: result.fit }));
  };

  // Mở thẳng trình chỉnh từ URL (?open=bride|groom|right|left|moment|album0|timeline0|sideways|heic)
  useEffect(() => {
    const o = params.get('open');
    if (!o) return;
    const map = { bride: ['fixed', 0], groom: ['fixed', 1], right: ['fixed', 2], left: ['fixed', 3], moment: ['fixed', 4], album0: ['album', 0], album1: ['album', 1], timeline0: ['timeline', 0] };
    if (map[o]) openExisting(...map[o]);
    if (o === 'sideways') openNew('album', null, 'photos/sideways.jpg', 'sideways.jpg', 1600, 1077);
    if (o === 'heic') openNew('fixed', 0, 'photos/IMG_2041.HEIC', 'IMG_2041.HEIC');
  }, []);

  return (
    <div className="admin-layout">
      <div className="admin-topbar">
        <button className="admin-menu-btn" onClick={() => setDrawer(true)} aria-label="Mở menu"><span /><span /><span /></button>
        <span className="if-topbar-title">Media</span>
      </div>
      {drawer && <div className="admin-backdrop" onClick={() => setDrawer(false)} />}
      <aside className={'admin-sidebar' + (drawer ? ' open' : '')}>
        <div className="sidebar-header">
          <h2>Quản trị thiệp cưới</h2>
          <a className="site-link" href="#" onClick={(e) => e.preventDefault()}>Xem trang khách ↗</a>
        </div>
        <nav>
          {NAV.map((n) => (
            <a key={n} href="#" className={n === 'Media' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setDrawer(false); }}>{n}</a>
          ))}
        </nav>
        <div className="sidebar-footer"><button className="logout-btn">Đăng xuất</button></div>
      </aside>

      <main className="admin-main">
        <h1>Media</h1>
        <p className="page-desc">Ảnh trên trang cưới. Bấm «Chỉnh khung» để chọn phần ảnh được giữ lại — xem trước được cả trên máy tính lẫn điện thoại.</p>

        <div className="admin-card">
          <h3>Ảnh cố định</h3>
          <div className="slot-grid">
            {data.fixed.map((it, i) => {
              const st = fitState(it.fit);
              return (
                <div className="slot-card" key={it.slot}>
                  <Thumb item={it} kind={it.thumb} onClick={() => pickFile('fixed', i)} />
                  <div className="slot-info">
                    <div className="slot-label">{it.label}</div>
                    <div className="slot-where">{it.where}</div>
                    <div className="slot-look">{it.look}</div>
                    <div className={'slot-status' + (st.set ? ' filled' : '')}>{st.text}<span className="slot-path">{it.slot}</span></div>
                    <div className="if-slot-act">
                      <button className="rw-btn if-go" onClick={() => openExisting('fixed', i)}>Chỉnh khung</button>
                      <button className="rw-btn" onClick={() => pickFile('fixed', i)}>Đổi ảnh</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="admin-card">
          <h3>Album mở đầu</h3>
          <p className="card-where">Lật qua từng ảnh ngay khi khách mở thiệp.</p>
          <p className="card-look">Máy tính: thẻ 3:4 (ảnh ngang thì 3:2) trên nền chính ảnh đó làm mờ. Điện thoại: thẻ 2:3 gần trọn màn.</p>
          <div className="if-album">
            {data.album.map((it, i) => {
              const st = fitState(it.fit);
              return (
                <div className="media-item" key={it.slot + i}>
                  <div className="if-album-pic" style={{ aspectRatio: it.w > it.h ? '3 / 2' : '3 / 4' }}>
                    <FitImg src={it.src} fit={it.fit && it.fit.d} alt={it.label} />
                  </div>
                  <div className="if-album-foot">
                    <div className="file-name">{it.name}</div>
                    <div className={'if-fit-state' + (st.set ? ' set' : '')}>{st.set ? 'Đã chỉnh khung' : 'Giữa ảnh'}</div>
                    <button className="rw-btn if-go" onClick={() => openExisting('album', i)}>Chỉnh khung</button>
                  </div>
                </div>
              );
            })}
            <button className="if-album-add" onClick={() => pickFile('album', null)}><b>+</b>Thêm ảnh vào album</button>
          </div>
        </div>

        <div className="admin-card">
          <h3>Lịch trình</h3>
          <p className="card-where">Mỗi mốc giờ có thể kèm một ảnh.</p>
          <div className="slot-grid">
            {data.timeline.map((it, i) => {
              const st = fitState(it.fit);
              return (
                <div className="slot-card" key={it.slot}>
                  <Thumb item={it} kind="43" onClick={() => pickFile('timeline', i)} />
                  <div className="slot-info">
                    <div className="slot-label">{it.label}</div>
                    <div className="slot-where">{it.where}</div>
                    <div className="slot-look">{it.look}</div>
                    <div className={'slot-status' + (st.set ? ' filled' : '')}>{st.text}</div>
                    <div className="if-slot-act">
                      <button className="rw-btn if-go" onClick={() => openExisting('timeline', i)}>Chỉnh khung</button>
                      <button className="rw-btn" onClick={() => pickFile('timeline', i)}>Đổi ảnh</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="if-proto">
          <h3>Chỉ có trong prototype — thử các trạng thái</h3>
          <p>Không port phần này. Chọn file thật bằng «Đổi ảnh» / «Thêm ảnh» cũng được (ảnh HEIC trên Chrome sẽ báo không mở được).</p>
          <div className="if-proto-row">
            <button className="rw-btn" onClick={() => openNew('album', null, 'photos/sideways.jpg', 'sideways.jpg', 1600, 1077)}>Ảnh mới nằm nghiêng → album</button>
            <button className="rw-btn" onClick={() => openNew('fixed', 0, 'photos/IMG_2041.HEIC', 'IMG_2041.HEIC')}>Ảnh HEIC không mở được</button>
            <label><input type="checkbox" checked={opts.fail} onChange={(e) => setOpts({ ...opts, fail: e.target.checked })} />Lần tải lên tới bị lỗi</label>
            <label><input type="checkbox" checked={opts.slow} onChange={(e) => setOpts({ ...opts, slow: e.target.checked })} />Tải lên chậm (6 giây)</label>
          </div>
        </div>
      </main>

      <input ref={fileRef} type="file" accept="image/*,.heic,.heif" style={{ display: 'none' }} onChange={onFile} />

      {editor && (
        <ImageFramer
          key={editor.slot + editor.src}
          slot={editor.slot}
          label={editor.label}
          src={editor.src}
          isNew={editor.isNew}
          fit={editor.fit}
          naturalW={editor.w}
          naturalH={editor.h}
          fileName={editor.fileName}
          initialProfile={params.get('profile') === 'm' || window.innerWidth <= 768 ? 'm' : 'd'}
          onSave={save}
          onCancel={() => setEditor(null)}
          onPickAnother={() => { const { group, i } = editor; setEditor(null); pickFile(group, i); }}
        />
      )}
      {toast && <div className="admin-toast">{toast}</div>}
    </div>
  );
}

/* Khung chụp màn hình cố định: ?w=390&h=844 → dựng app trong hộp đúng cỡ đó.
   (transform tạo khối chứa mới, nên position: fixed của trình chỉnh bám theo hộp.) */
function Root() {
  const p = new URLSearchParams(location.search);
  const w = +p.get('w'), h = +p.get('h');
  if (!w || !h) return <App />;
  return (
    <div id="harness" style={{ position: 'fixed', left: 0, top: 0, width: w, height: h, overflow: 'hidden', transform: 'translateZ(0)', background: '#f8f6f5' }}>
      <style>{`#harness .admin-sidebar { height: ${h}px; } #harness .admin-layout { min-height: ${h}px; }`}</style>
      <App />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root />);
