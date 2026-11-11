import { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import { framesFor, FRAMER_BLOB } from './framerFrames';
import './image-framer.css';

/* ImageFramer — trình chỉnh khung ảnh: tiêu điểm + phóng, hai hồ sơ Máy tính / Điện thoại.
   Thiết kế: Claude Design, bộ handoff design_handoff_image_framer (11/2026).
   Khung xem trước: framerFrames.js. Style: image-framer.css (admin.css giữ nguyên byte).

   Props (§2):  slot, label, src, isNew, fit, naturalW, naturalH
   Props thêm (chỉ giao diện, không đụng backend):
     fileName        tên file gốc — để nhận ra HEIC khi ảnh không mở được
     initialProfile  'd' | 'm' — mở sẵn hồ sơ nào (vd. admin đang ở điện thoại)
     onSave(result, reportProgress) → Promise   result đúng §1; reject(Error) = lỗi tải lên
     onCancel()
     onPickAnother() tuỳ chọn — hiện nút "Chọn ảnh khác" khi ảnh không mở được */

const IF_CENTER = Object.freeze({ x: 50, y: 50, z: 1 });
const ifClamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ifRound = (f) => ({ x: Math.round(f.x * 10) / 10, y: Math.round(f.y * 10) / 10, z: Math.round(f.z * 100) / 100 });
const ifSame = (a, b) => Math.abs(a.x - b.x) < 0.05 && Math.abs(a.y - b.y) < 0.05 && Math.abs(a.z - b.z) < 0.005;
const ifFmtZ = (z) => String(+z.toFixed(2)).replace('.', ',') + '×';

/* Biến CSS cho quy tắc img.has-fit (§1). Dùng y nguyên ở trang khách. */
export function fitVars(fit) {
  const f = fit || IF_CENTER;
  return { '--fx': f.x + '%', '--fy': f.y + '%', '--fz': f.z };
}
export function FitImg({ src, fit, alt }) {
  return <img className="has-fit" src={src} alt={alt || ''} draggable={false} style={fitVars(fit)} />;
}

/* Hình học của img.has-fit trong khung W×H, ảnh gốc w×h:
   - slackX/Y: số px ảnh dư ra theo mỗi chiều (≤ 0 → chiều đó vừa khít, kéo không có tác dụng)
   - left/top/width/height: hình chữ nhật ảnh sau khi phóng — để vẽ phần bị cắt mờ mờ quanh khung.
   Kéo ảnh dx px ⇔ x giảm dx / slackX × 100 → ảnh bám đúng ngón tay. */
function coverGeom(W, H, w, h, f) {
  const s = Math.max(W / w, H / h), z = f.z, fx = f.x / 100, fy = f.y / 100;
  const iw = w * s, ih = h * s, px = W * fx, py = H * fy;
  const ox = (W - iw) * fx, oy = (H - ih) * fy;
  return { slackX: iw * z - W, slackY: ih * z - H, left: px + (ox - px) * z, top: py + (oy - py) * z, width: iw * z, height: ih * z };
}

function shapeStyle(frame, W) {
  if (frame.shape === 'arch') {
    // Trang khách: border-radius 280px 280px 8px 8px. Ô < 560px rộng → đỉnh thành bán nguyệt.
    const b = Math.max(2, Math.round((W * 8) / 340));
    return { borderRadius: `${W / 2}px ${W / 2}px ${b}px ${b}px` };
  }
  if (frame.shape === 'blob') return { borderRadius: frame.blob || FRAMER_BLOB };
  return { borderRadius: (frame.radius || 0) + 'px' };
}

/* Xoay ảnh mới bằng canvas để xem trước. File thật được xoay lúc tải lên (lib/rotateImage.js). */
export function rotateImageURL(src, deg) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, 2400 / Math.max(im.naturalWidth, im.naturalHeight));
      const w = Math.round(im.naturalWidth * k), h = Math.round(im.naturalHeight * k);
      const q = deg % 180 !== 0;
      const c = document.createElement('canvas');
      c.width = q ? h : w; c.height = q ? w : h;
      const x = c.getContext('2d');
      x.translate(c.width / 2, c.height / 2);
      x.rotate((deg * Math.PI) / 180);
      x.drawImage(im, -w / 2, -h / 2, w, h);
      resolve({ url: c.toDataURL('image/jpeg', 0.9), w: c.width, h: c.height });
    };
    im.onerror = () => reject(new Error('decode'));
    im.src = src;
  });
}

/* Theo dõi kích thước một phần tử. Trả [ref, size]; ref là callback nên đổi phần tử (đổi bố cục) vẫn đo đúng. */
function useElementSize() {
  const [node, setNode] = useState(null);
  const [size, setSize] = useState(null);
  useLayoutEffect(() => {
    if (!node) return;
    const put = (width, height) => setSize((p) => (p && p.w === width && p.h === height ? p : { w: width, h: height }));
    put(node.clientWidth, node.clientHeight); // đo ngay, khỏi chờ khung hình đầu
    const ro = new ResizeObserver(() => put(node.clientWidth, node.clientHeight));
    ro.observe(node);
    return () => ro.disconnect();
  }, [node]);
  // Đo lại sau mỗi lần vẽ (bố cục xung quanh đổi) — setSize bỏ qua nếu không khác
  useLayoutEffect(() => {
    if (node) setSize((p) => (p && p.w === node.clientWidth && p.h === node.clientHeight ? p : { w: node.clientWidth, h: node.clientHeight }));
  });
  return [setNode, size, node];
}

function layoutMode(w, h) {
  if (w >= 900 && h >= 560) return 'desk';
  if (w > h && h < 560) return 'land';
  return 'phone';
}

/* Thẻ đếm ngược đè lên chân ảnh (moment-2) */
function CountdownChip({ W, H, overlap }) {
  const ch = Math.max(16, H * 0.24);
  return (
    <span className="if-cd" style={{ top: H * (1 - overlap), width: W * 0.56, left: W * 0.22, height: ch, fontSize: Math.max(8, ch * 0.34) }}>
      <b>Còn 23 ngày</b>
    </span>
  );
}

/* Một ô xem trước. h = chiều cao vùng hình (không tính chữ). */
function FramePreview({ frame, h, img, fit, selected, onSelect }) {
  let bw, bh, fw, fh, fl = 0, ft = 0, bg = null;
  if (frame.natural) {
    fh = h; fw = h * (img.w / img.h); bw = fw; bh = fh;
  } else if (frame.decor === 'blurbg') {
    bh = h; bw = h * 1.6; fh = h * 0.84; fw = fh * frame.ratio;
    if (fw > bw * 0.9) { fw = bw * 0.9; fh = fw / frame.ratio; }
    fl = (bw - fw) / 2; ft = (bh - fh) / 2; bg = 'blur';
  } else if (frame.decor === 'maroon') {
    bh = h; bw = h * 0.5; fw = bw * 0.86; fh = fw / frame.ratio;
    fl = (bw - fw) / 2; ft = (bh - fh) / 2; bg = 'maroon';
  } else {
    fh = h; fw = h * frame.ratio;
    if (fw > h * 1.9) { fw = h * 1.9; fh = fw / frame.ratio; }
    bw = fw; bh = fh;
    if (frame.decor === 'countdown') bh = fh * (1 - frame.overlap) + Math.max(16, fh * 0.24);
  }
  const shape = frame.natural ? { borderRadius: 3 } : shapeStyle(frame, fw);
  const box = (
    <span className={'if-pv-box' + (bg ? ' bg-' + bg : '')} style={{ width: bw, height: bh }}>
      {bg === 'blur' && <img className="if-pv-blur" src={img.src} alt="" draggable={false} />}
      <span className="if-pv-frame" style={{ left: fl, top: ft, width: fw, height: fh, ...shape }}>
        {frame.natural
          ? <img className="if-pv-natural" src={img.src} alt="" draggable={false} style={frame.hidden ? { opacity: 0.3 } : undefined} />
          : <FitImg src={img.src} fit={fit} />}
      </span>
      {frame.decor === 'gold' && <span className="if-gold" style={{ left: fl, top: ft, width: fw, height: fh, ...shape }} />}
      {frame.decor === 'countdown' && <span className="if-cd-wrap" style={{ left: fl, top: ft }}><CountdownChip W={fw} H={fh} overlap={frame.overlap} /></span>}
      {frame.natural && <span className="if-pv-na">{frame.hidden ? 'Không hiện' : 'Không cắt'}</span>}
    </span>
  );
  const cap = <span className="if-pv-cap"><span className="if-pv-t">{frame.short}</span></span>;
  if (frame.natural) return <div className="if-pv static" title={frame.sub}>{box}{cap}</div>;
  return (
    <button type="button" className={'if-pv' + (selected ? ' sel' : '')} onClick={onSelect} aria-pressed={selected}
      title={frame.title + ' — ' + frame.sub}>
      {box}{cap}
    </button>
  );
}

function IfIcon({ name }) {
  const p = {
    rotate: 'M15.5 4.5A7.5 7.5 0 1 0 19 11M19 4v5h-5',
    minus: 'M6 12h12',
    plus: 'M12 6v12M6 12h12',
    close: 'M6 6l12 12M18 6L6 18',
    center: 'M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3',
  }[name];
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={p} />
      {name === 'center' && <><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /></>}
    </svg>
  );
}

export default function ImageFramer(props) {
  const { slot, label, src, isNew, fit, naturalW, naturalH, fileName, initialProfile, onSave, onCancel, onPickAnother } = props;

  const [rootRef, rootSize, rootEl] = useElementSize();
  const [stageRef, stageSize, stageEl] = useElementSize();
  const mode = rootSize ? layoutMode(rootSize.w, rootSize.h) : layoutMode(window.innerWidth, window.innerHeight);

  const [rotate, setRotate] = useState(0);
  const [img, setImg] = useState({ status: 'loading', src: null, w: naturalW || 1, h: naturalH || 1 });

  const init = useRef({ d: (fit && fit.d) || IF_CENTER, m: (fit && fit.m) || null });
  const [fd, setFd] = useState(init.current.d);
  const [fm, setFm] = useState(init.current.m);
  const [shared, setShared] = useState(!init.current.m);
  const mBackup = useRef(init.current.m);
  const [profile, setProfile] = useState(initialProfile || 'd');
  const [activeId, setActiveId] = useState(null);

  const [phase, setPhase] = useState('edit'); // edit | saving | error
  const [progress, setProgress] = useState(null);
  const [errMsg, setErrMsg] = useState('');
  const [dragging, setDragging] = useState(false);
  const busy = phase === 'saving';

  // Mở ảnh (và xoay, nếu có)
  useEffect(() => {
    let alive = true;
    setImg((p) => ({ ...p, status: 'loading' }));
    const fail = () => alive && setImg((p) => ({ ...p, status: 'error' }));
    if (rotate) {
      rotateImageURL(src, rotate).then((r) => {
        if (alive) setImg({ status: 'ready', src: r.url, w: r.w, h: r.h });
      }, fail);
    } else {
      const im = new Image();
      im.onload = () => alive && setImg({ status: 'ready', src, w: im.naturalWidth, h: im.naturalHeight });
      im.onerror = fail;
      im.src = src;
    }
    return () => { alive = false; };
  }, [src, rotate]);

  // Khoá cuộn trang phía sau + Esc để huỷ
  useEffect(() => {
    const html = document.documentElement, prev = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => { html.style.overflow = prev; };
  }, []);
  const cancelRef = useRef(onCancel);
  cancelRef.current = busy ? null : onCancel;
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape' && cancelRef.current) cancelRef.current(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);
  useEffect(() => { if (rootEl) rootEl.focus(); }, [rootEl]);

  const frames = useMemo(() => framesFor(slot, img.w, img.h), [slot, img.w, img.h]);
  // Ảnh đếm ngược: điện thoại hiện trọn ảnh nên không có khung điện thoại để chỉnh —
  // khoá ở hồ sơ máy tính, ẩn nút chuyển và công tắc dùng chung.
  const hasM = frames.some((f) => f.profile === 'm' && !f.natural);
  if (!hasM && profile === 'm') setProfile('d');
  const editable = frames.filter((f) => f.profile === (hasM ? profile : 'd') && !f.natural);
  const active = editable.find((f) => f.id === activeId) || editable[0];

  const editsM = profile === 'm' && !shared;
  const cur = editsM ? fm : fd;
  const setCur = (fn) => (editsM ? setFm : setFd)((p) => fn(p));
  const fitOf = (fr) => (fr.profile === 'm' && !shared ? fm : fd);

  // Kích thước khung chính trên vùng kéo
  const pad = mode === 'desk' ? 48 : mode === 'land' ? 18 : 22;
  let W = 0, H = 0;
  if (stageSize && active) {
    const aw = Math.max(40, stageSize.w - pad * 2), ah = Math.max(40, stageSize.h - pad * 2);
    W = Math.min(aw, ah * active.ratio); H = W / active.ratio;
  }
  const ready = img.status === 'ready' && W > 0;
  const g = ready ? coverGeom(W, H, img.w, img.h, cur) : null;
  const locked = g && g.slackX <= 0.5 && g.slackY <= 0.5;

  const panBy = (dx, dy) => {
    if (!W) return;
    setCur((p) => {
      const q = coverGeom(W, H, img.w, img.h, p);
      let { x, y } = p;
      if (q.slackX > 0.5) x = ifClamp(x - (dx / q.slackX) * 100, 0, 100);
      if (q.slackY > 0.5) y = ifClamp(y - (dy / q.slackY) * 100, 0, 100);
      return { ...p, x, y };
    });
  };
  const zoomTo = (fn) => setCur((p) => ({ ...p, z: ifClamp(fn(p.z), 1, 3) }));

  // Kéo / chụm hai ngón — pointer events, không thư viện
  const ptrs = useRef(new Map());
  const pinch = useRef(null);
  const onPointerDown = (e) => {
    if (busy || !ready || (e.pointerType === 'mouse' && e.button !== 0)) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) { /* con trỏ giả lập */ }
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()];
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: cur.z, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
    }
    setDragging(true);
  };
  const onPointerMove = (e) => {
    const m = ptrs.current;
    if (!m.has(e.pointerId)) return;
    const prev = m.get(e.pointerId);
    m.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (m.size === 1) panBy(e.clientX - prev.x, e.clientY - prev.y);
    else if (m.size === 2 && pinch.current) {
      const [a, b] = [...m.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const z0 = pinch.current.z;
      zoomTo(() => (z0 * d) / pinch.current.d);
      panBy(mx - pinch.current.mx, my - pinch.current.my);
      pinch.current.mx = mx; pinch.current.my = my;
    }
  };
  const onPointerUp = (e) => {
    ptrs.current.delete(e.pointerId);
    if (ptrs.current.size < 2) pinch.current = null;
    if (ptrs.current.size === 0) setDragging(false);
  };
  const wheelRef = useRef(null);
  wheelRef.current = (e) => { e.preventDefault(); if (!busy && ready) zoomTo((z) => z * Math.exp(-e.deltaY * 0.0015)); };
  useEffect(() => {
    const el = stageEl;
    if (!el) return;
    const h = (e) => wheelRef.current(e);
    el.addEventListener('wheel', h, { passive: false });
    return () => el.removeEventListener('wheel', h);
  }, [stageEl]);
  const onKeyDown = (e) => {
    if (busy || !ready) return;
    const st = e.shiftKey ? 40 : 8;
    const map = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] };
    if (map[e.key]) { e.preventDefault(); panBy(...map[e.key]); }
    else if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomTo((z) => z + 0.1); }
    else if (e.key === '-') { e.preventDefault(); zoomTo((z) => z - 0.1); }
    else if (e.key === '0') resetCur();
  };

  const resetCur = () => setCur(() => IF_CENTER);
  const doRotate = () => {
    setRotate((r) => (r + 90) % 360);
    setFd(IF_CENTER);
    setFm(shared ? null : IF_CENTER);
  };
  const toggleShared = (on) => {
    if (on) { mBackup.current = fm; setFm(null); setShared(true); }
    else { setFm(mBackup.current || fd); setShared(false); }
  };
  const selectFrame = (f) => { setProfile(f.profile); setActiveId(f.id); };
  const switchProfile = (p) => { setProfile(p); setActiveId(null); };

  const save = () => {
    const result = { fit: { d: ifRound(fd), m: shared || !hasM ? null : ifRound(fm) } };
    if (isNew) result.rotate = rotate;
    setPhase('saving'); setProgress(isNew ? 0 : null); setErrMsg('');
    Promise.resolve()
      .then(() => onSave(result, (p) => setProgress(p)))
      .catch((err) => { setPhase('error'); setErrMsg((err && err.message) || ''); });
  };

  const isHeic = /\.(heic|heif)$/i.test(fileName || src || '');
  const changed = !ifSame(fd, init.current.d) || shared !== !init.current.m || (!shared && fm && (!init.current.m || !ifSame(fm, init.current.m))) || rotate !== 0;
  const primaryLabel = phase === 'saving'
    ? (isNew ? `Đang tải lên…${progress != null ? ' ' + progress + '%' : ''}` : 'Đang lưu…')
    : phase === 'error' ? (isNew ? 'Thử tải lên lại' : 'Thử lưu lại') : isNew ? 'Tải lên' : 'Lưu khung';
  const compact = mode !== 'desk';

  /* ── Các mảnh giao diện ── */
  const header = (
    <div className="if-head">
      <div className="if-head-t">
        <span className="if-eyebrow">{isNew ? 'Ảnh mới · chỉnh khung trước khi tải lên' : 'Chỉnh khung'}</span>
        <h2 id="if-title">{label}</h2>
      </div>
      {mode === 'desk' && (
        <button type="button" className="if-x" onClick={onCancel} disabled={busy} aria-label="Đóng, không lưu"><IfIcon name="close" /></button>
      )}
    </div>
  );

  const profileSwitch = (
    <div className="if-seg" role="tablist" aria-label="Chỉnh cho màn hình nào">
      {[['d', 'Máy tính'], ['m', 'Điện thoại']].map(([p, t]) => (
        <button key={p} type="button" role="tab" aria-selected={profile === p} className={profile === p ? 'on' : ''} onClick={() => switchProfile(p)}>
          {t}
          {p === 'm' && <span className="if-seg-sub">{shared ? 'chung' : 'riêng'}</span>}
        </button>
      ))}
    </div>
  );

  const shareSwitch = (
    <label className="if-share">
      <span className="if-share-t">
        Điện thoại dùng chung khung với máy tính
        {mode === 'desk' && profile === 'm' && shared && <small>Đang chung: kéo ở đây là đổi cả khung máy tính.</small>}
        {mode === 'desk' && !shared && <small>Điện thoại có khung riêng. Bật lại là bỏ khung riêng này.</small>}
      </span>
      <input type="checkbox" role="switch" checked={shared} onChange={(e) => toggleShared(e.target.checked)} disabled={busy} />
      <span className="if-switch" aria-hidden="true" />
    </label>
  );

  const stage = (
    <div
      ref={stageRef}
      className={'if-stage' + (dragging ? ' dragging' : '') + (busy ? ' busy' : '')}
      tabIndex={0}
      role="application"
      aria-label={`Vùng kéo ảnh cho khung ${active ? active.title : ''}. Phím mũi tên để dời, + và − để phóng, 0 để về giữa.`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
    >
      {img.status === 'loading' && <div className="if-stage-msg"><span className="if-spin" />Đang mở ảnh…</div>}
      {img.status === 'error' && (
        <div className="if-stage-msg err">
          <strong>Không mở được ảnh này</strong>
          <span>
            {isHeic
              ? 'Có vẻ đây là ảnh HEIC từ iPhone — Chrome chưa mở được loại này. Mở trang quản trị bằng Safari, hoặc chọn bản JPG của ảnh.'
              : 'File có thể bị hỏng hoặc không phải ảnh. Thử chọn ảnh khác nhé.'}
          </span>
        </div>
      )}
      {ready && (
        <div className="if-canvas" style={{ width: W, height: H }}>
          <img className="if-ghost" src={img.src} alt="" draggable={false} style={{ left: g.left, top: g.top, width: g.width, height: g.height }} />
          <div className="if-frame" style={{ width: W, height: H, ...shapeStyle(active, W) }}>
            <FitImg src={img.src} fit={cur} alt={label} />
          </div>
          {active.decor === 'gold' && <span className="if-gold" style={{ left: 0, top: 0, width: W, height: H, ...shapeStyle(active, W) }} />}
          {active.decor === 'countdown' && <CountdownChip W={W} H={H} overlap={active.overlap} />}
          <span className="if-focus" style={{ left: (W * cur.x) / 100, top: (H * cur.y) / 100 }} />
        </div>
      )}
      {ready && <span className="if-stage-tag"><b>{active.title}</b>{!compact && <span>{active.sub}</span>}</span>}
      {ready && locked && !dragging && <span className="if-stage-hint">Ảnh vừa khít khung này — phóng to để chọn phần giữ lại</span>}
    </div>
  );

  const noImg = img.status !== 'ready';
  const controls = (
    <div className="if-controls">
      <button type="button" className="if-tbtn" onClick={resetCur} disabled={busy || noImg || ifSame(cur, IF_CENTER)} title="Tiêu điểm về giữa ảnh, độ phóng 1×">
        <IfIcon name="center" /><span>Về giữa</span>
      </button>
      <div className="if-zoom">
        <button type="button" className="if-ibtn" onClick={() => zoomTo((z) => z - 0.1)} disabled={busy || noImg || cur.z <= 1} aria-label="Thu nhỏ"><IfIcon name="minus" /></button>
        <input type="range" min="1" max="3" step="0.01" value={cur.z} disabled={busy || noImg}
          onChange={(e) => { const v = +e.target.value; zoomTo(() => v); }} aria-label="Độ phóng" />
        <button type="button" className="if-ibtn" onClick={() => zoomTo((z) => z + 0.1)} disabled={busy || noImg || cur.z >= 3} aria-label="Phóng to"><IfIcon name="plus" /></button>
        <span className="if-zval">{ifFmtZ(cur.z)}</span>
      </div>
      {isNew && (
        <button type="button" className="if-tbtn if-rot" onClick={doRotate} disabled={busy || img.status === 'error'} title="Xoay 90° theo chiều kim đồng hồ">
          <IfIcon name="rotate" /><span>Xoay</span>
        </button>
      )}
    </div>
  );

  const previewH = (p) => (mode === 'desk' ? (p === 'd' ? 170 : 128) : mode === 'land' ? 72 : 84);
  const natural = frames.find((f) => f.natural);
  const groups = ['d', 'm'].map((p) => (
    <div key={p} className={'if-group' + (profile === p ? ' on' : '')}>
      <div className="if-group-h">
        <b>{p === 'd' ? 'Máy tính' : 'Điện thoại'}</b>
        {p === 'm' && hasM && <span>{shared ? (compact ? 'dùng chung' : 'dùng chung khung máy tính') : 'khung riêng'}</span>}
      </div>
      <div className="if-pv-row">
        {frames.filter((f) => f.profile === p).map((f) => (
          <FramePreview key={f.id} frame={f} h={previewH(p)} img={img} fit={fitOf(f)}
            selected={active && f.id === active.id && profile === p} onSelect={() => selectFrame(f)} />
        ))}
      </div>
      {!compact && p === 'm' && natural && <p className="if-group-note">{natural.hidden ? 'Điện thoại không hiện ảnh này' : 'Điện thoại hiện trọn ảnh, không cắt'} — khung chỉ áp trên máy tính.</p>}
      {!compact && p === 'm' && frames.some((f) => f.id === 'm-narrow') && <p className="if-group-note">Màn ngang: vòm cao bằng khối chữ bên cạnh nên tỉ lệ đổi theo máy — xem cả lúc hẹp nhất và rộng nhất.</p>}
    </div>
  ));
  const previews = ready || img.status === 'loading'
    ? <div className={compact ? 'if-strip' : 'if-groups'}>{img.status === 'ready' ? groups : <div className="if-pv-skel" />}</div>
    : null;

  const reassure = <p className="if-note">Khách bấm vào ảnh vẫn xem được ảnh đầy đủ — khung chỉ chọn phần hiện trong ô, không cắt file gốc.</p>;

  const errorBanner = phase === 'error' && (
    <div className="if-err" role="alert">
      {isNew ? 'Tải lên chưa được' : 'Lưu chưa được'}{errMsg ? ` (${errMsg})` : ''}. Khung bạn vừa chỉnh vẫn còn nguyên — thử lại nhé.
    </div>
  );

  const progressBar = phase === 'saving' && (
    <div className={'if-progress' + (progress == null ? ' ind' : '')}><span style={progress != null ? { width: progress + '%' } : null} /></div>
  );

  const imgFailed = img.status === 'error';
  const buttons = (
    <>
      <button type="button" className="admin-btn admin-btn-secondary if-cancel" onClick={onCancel} disabled={busy}>
        {imgFailed ? 'Đóng' : 'Huỷ'}
      </button>
      {imgFailed
        ? (onPickAnother && <button type="button" className="admin-btn admin-btn-primary if-primary" onClick={onPickAnother}>Chọn ảnh khác</button>)
        : <button type="button" className="admin-btn admin-btn-primary if-primary" onClick={save} disabled={busy || img.status !== 'ready'}>{primaryLabel}</button>}
    </>
  );

  let body;
  if (mode === 'desk') {
    body = (
      <div className="if-shell">
        {header}
        <div className="if-body">
          <div className="if-main">
            {stage}
            <div className="if-under">
              {controls}
              <span className="if-help">Kéo ảnh để dời · lăn chuột hoặc chụm hai ngón để phóng · dấu <i className="if-dot" /> là điểm luôn được giữ ở mọi khung</span>
            </div>
          </div>
          <aside className="if-side">
            {hasM && profileSwitch}
            {hasM && shareSwitch}
            {previews}
          </aside>
        </div>
        {errorBanner}
        <div className="if-foot">
          {progressBar}
          {reassure}
          <div className="if-foot-btns">{buttons}</div>
        </div>
      </div>
    );
  } else if (mode === 'land') {
    body = (
      <div className="if-shell">
        {stage}
        <div className="if-panel">
          {header}
          <div className="if-scroll">
            {hasM && profileSwitch}
            {hasM && shareSwitch}
            {controls}
            {previews}
            {reassure}
          </div>
          {errorBanner}
          <div className="if-bar">{progressBar}{buttons}</div>
        </div>
      </div>
    );
  } else {
    body = (
      <div className="if-shell">
        {header}
        {hasM && (
          <div className="if-top">
            {profileSwitch}
            {shareSwitch}
          </div>
        )}
        {stage}
        {controls}
        {previews}
        {ready && <p className="if-note">Khách bấm vào ảnh vẫn xem được ảnh đầy đủ.</p>}
        {errorBanner}
        <div className="if-bar">{progressBar}{buttons}</div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className={'if-root ' + mode} role="dialog" aria-modal="true" aria-labelledby="if-title" tabIndex={-1}
      data-changed={changed ? '1' : undefined}>
      {body}
    </div>
  );
}

