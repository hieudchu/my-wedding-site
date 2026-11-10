import { useState, useRef, useEffect } from 'react';
import { useMediaSources, useMediaList } from '../hooks/useMedia';
import { mqMatches, PHONE_QUERY } from '../hooks/useViewport';
import Ico from './Icon';

const NAV_OFFSET = 70; // desktop: chiều cao thanh nav khi cuộn tới section

// Tên file đặt cho có, không phải tên bài — thì dùng tên bài ghi trong cấu hình
const PLACEHOLDER_NAME = /^(bgm|music|audio|track|song|nhac)[\s\d-]*$/i;

/** Tên bài lấy từ tên file: "canon-in-d.mp3" → "canon in d" */
function trackName(file, fallback) {
  if (!file) return fallback;
  const base = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
  if (!base || PLACEHOLDER_NAME.test(base)) return fallback;
  return base;
}

function fmt(t) {
  const s = Math.max(0, Math.floor(t || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Thanh điều hướng + trình phát nhạc nền.
 *
 * Trên điện thoại/tablet trình phát có giao diện "đĩa than" (đĩa quay, cần đĩa hạ
 * khi phát, vòng tiến trình quanh nút play). CSS khoá theo `html[data-player="dia"]`
 * — thuộc tính đó đặt một lần trong `main.jsx`. Desktop giữ giao diện cũ: CSS ẩn các
 * phần tử mới và hiện lại ký tự trong `.ico-txt`.
 *
 * Nhạc không tự phát — trình duyệt chặn, và khách cũng không nên bị giật mình.
 */
export default function Nav({ config, siteText = {}, visible }) {
  // Cả thư mục music là một danh sách phát — chủ nhà thêm bớt bài tuỳ ý
  const { files: tracks } = useMediaList('music');
  // Logo cao 30px, nhãn đĩa than vài chục px — bản nhỏ nhất là đủ. Bản gốc của
  // medallion-ink trên kho nặng 1,7 MB, chỉ để vẽ một hình 30px.
  const navLogoUrl = useMediaSources('icons/medallion-ink.png', '/assets/medallion-ink.png')?.small;
  const discLabelUrl = useMediaSources('icons/medallion-gold.png', '/assets/medallion-gold.png')?.small;

  const navRef = useRef(null);
  const audioRef = useRef(null);
  const dragMode = useRef(null);
  const pendingRatio = useRef(null);

  const [playing, setPlaying] = useState(false);
  const [panel, setPanel] = useState(false);
  const [menu, setMenu] = useState(false);
  const [trackIdx, setTrackIdx] = useState(0);
  const [volume, setVolume] = useState(0.6);
  const [lastVol, setLastVol] = useState(0.6);
  const [loop, setLoop] = useState(true);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);

  const current = tracks[trackIdx] || null;
  const musicUrl = current?.url || null;
  const nowPlaying = trackName(current, config.musicTrack);
  const [mpTitle, mpArtist] = (nowPlaying || '').split(/\s+[—–-]\s+/);

  useEffect(() => {
    const a = audioRef.current;
    if (a) a.volume = volume;
  }, [volume]);

  const toggleMusic = () => {
    const a = audioRef.current;
    if (!a || !musicUrl) return;
    if (playing) { a.pause(); setPlaying(false); }
    else a.play().then(() => setPlaying(true)).catch(() => {});
  };

  const ratioFrom = (e) => {
    const track = e.currentTarget.querySelector('.slider-track') || e.currentTarget;
    const r = track.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  };

  const applySeek = (e) => {
    const a = audioRef.current;
    if (!a) return;
    const r = ratioFrom(e);
    const d = Number.isFinite(a.duration) ? a.duration : 0;
    if (!d) {
      // Chưa biết độ dài bài — nhớ tỉ lệ, áp dụng khi metadata về
      pendingRatio.current = r;
      setCur(0);
      return;
    }
    a.currentTime = r * d;
    setCur(r * d);
    setDur(d);
  };

  const applyVol = (e) => {
    const v = ratioFrom(e);
    setVolume(v);
    if (v > 0) setLastVol(v);
  };

  const startDrag = (mode, apply) => (e) => {
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* con trỏ tổng hợp */ }
    dragMode.current = mode;
    apply(e);
  };
  const moveDrag = (mode, apply) => (e) => { if (dragMode.current === mode) apply(e); };
  const endDrag = () => { dragMode.current = null; };

  /** Chuyển bài. Chỉ có một bài thì quay về đầu bài đó. */
  const skip = (step) => () => {
    const a = audioRef.current;
    if (!a) return;
    if (tracks.length <= 1) { a.currentTime = 0; setCur(0); return; }
    setTrackIdx((i) => (i + step + tracks.length) % tracks.length);
    setCur(0);
    setDur(0);
  };

  // Đổi bài giữa chừng thì phát tiếp bài mới, không bắt bấm lại
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !playing) return;
    a.play().catch(() => {});
  }, [trackIdx, playing]);

  const handleEnded = () => {
    if (tracks.length > 1) {
      const last = trackIdx === tracks.length - 1;
      if (last && !loop) { setPlaying(false); return; }
      setTrackIdx((i) => (i + 1) % tracks.length);
      return;
    }
    if (loop) {
      const a = audioRef.current;
      if (a) { a.currentTime = 0; a.play().catch(() => {}); }
      return;
    }
    setPlaying(false);
  };

  const toggleMute = () => {
    if (volume === 0) setVolume(lastVol || 0.6);
    else { setLastVol(volume); setVolume(0); }
  };

  const onMeta = (e) => {
    const a = e.currentTarget;
    const d = Number.isFinite(a.duration) ? a.duration : 0;
    if (d && pendingRatio.current != null) {
      a.currentTime = pendingRatio.current * d;
      pendingRatio.current = null;
    }
    setDur(d);
    setCur(a.currentTime);
  };

  const scrollTo = (id) => (e) => {
    e.preventDefault();
    setMenu(false); // chọn xong thì đóng menu điện thoại luôn
    const el = document.getElementById(id);
    if (!el) return;
    // Điện thoại: nav cao 66px (dọc) / 58px (ngang) → đo thật thay vì dùng hằng số
    const offset = mqMatches(PHONE_QUERY) ? (navRef.current?.offsetHeight || NAV_OFFSET) : NAV_OFFSET;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
  };

  const links = [
    ['groom', siteText.nav_family || 'Gia đình'],
    ['details', siteText.nav_invitation || 'Thiệp mời'],
    ['timeline', siteText.nav_timeline || 'Lịch trình'],
    ['rsvp', siteText.nav_rsvp || 'Xác nhận'],
  ];

  const progress = `${dur ? (cur / dur) * 100 : 0}%`;
  const progressNum = dur ? (cur / dur) * 100 : 0;
  const volPct = `${Math.round(volume * 100)}%`;

  return (
    <nav ref={navRef} className={`nav ${visible ? 'visible' : ''}`}>
      <audio
        ref={audioRef}
        src={musicUrl || undefined}
        /* Bản nhạc nặng 5.5 MB. Chỉ nạp khi khách thật sự quan tâm tới nhạc —
           mở bảng điều khiển hoặc bấm phát — chứ không nạp sẵn cho mọi lượt xem. */
        preload={panel || playing ? 'metadata' : 'none'}
        loop={loop && tracks.length <= 1}
        onTimeUpdate={(e) => { if (dragMode.current !== 'seek') setCur(e.currentTarget.currentTime); }}
        onLoadedMetadata={onMeta}
        onDurationChange={onMeta}
        onEnded={handleEnded}
      />

      <a href="#hero" className="nav-brand" onClick={scrollTo('hero')}>
        <img src={navLogoUrl || '/assets/medallion-ink.png'} alt="" />
        <span>{config.groomShort} &amp; {config.brideShort}</span>
      </a>

      <div className="nav-right">
        {links.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="nav-link" onClick={scrollTo(id)}>{label}</a>
        ))}

        {/* Hamburger chỉ hiện ở bố cục điện thoại — media query lo phần ẩn/hiện */}
        <button
          className={`burger ${menu ? 'open' : ''}`}
          onClick={() => { setMenu((m) => !m); setPanel(false); }}
          aria-label="Menu"
          aria-expanded={menu}
        >
          <span><i /><i /><i /></span>
        </button>

        <div className="music-pill">
          <button
            className={`music-btn ${playing ? 'on' : ''}`}
            onClick={toggleMusic}
            title={nowPlaying}
            aria-label="Bật hoặc tắt nhạc nền"
          >
            <span className="music-bars"><span /><span /><span /></span>
            <span className="mb-disc" aria-hidden="true" />
            <Ico name="note" className="mb-note" />
          </button>
          <button
            className={`caret-btn ${panel ? 'open' : ''}`}
            onClick={() => { setPanel((p) => !p); setMenu(false); }}
            aria-label="Điều chỉnh nhạc"
            aria-expanded={panel}
          >
            ▾
          </button>
        </div>
      </div>

      {menu && (
        <div className="nav-menu">
          {links.map(([id, label]) => (
            <a key={id} href={`#${id}`} onClick={scrollTo(id)}>{label}</a>
          ))}
        </div>
      )}

      {panel && (
        <div className={`music-panel ${playing ? 'is-playing' : ''}`}>
          <div className="mp-head">
            <div className="mp-disc" aria-hidden="true"><img src={discLabelUrl || '/assets/medallion-gold.png'} alt="" /></div>
            <div className="mp-text">
              <div className="eyebrow-sm">
                Nhạc nền{tracks.length > 1 ? ` · bài ${trackIdx + 1}/${tracks.length}` : ''}
              </div>
              <div className="track-name">{nowPlaying}</div>
              <div className="mp-title">{mpTitle}</div>
              {mpArtist && <div className="mp-artist">{mpArtist}</div>}
            </div>
          </div>

          <div className="music-transport">
            <button className="mt-btn mt-prev" onClick={skip(-1)} aria-label="Bài trước">
              <span className="ico-txt">⏮</span><Ico name="prev" />
            </button>
            <button className="mt-play" onClick={toggleMusic} aria-label="Phát hoặc tạm dừng">
              <svg className="mp-ring" viewBox="0 0 100 100" aria-hidden="true">
                <circle className="mp-ring-bg" cx="50" cy="50" r="47" />
                <circle
                  className="mp-ring-fg"
                  cx="50"
                  cy="50"
                  r="47"
                  pathLength="100"
                  style={{ strokeDasharray: `${progressNum} 100` }}
                />
              </svg>
              <span className="ico-txt">{playing ? '❙❙' : '▶'}</span>
              <Ico name={playing ? 'pause' : 'play'} />
            </button>
            <button className="mt-btn mt-next" onClick={skip(1)} aria-label="Bài sau">
              <span className="ico-txt">⏭</span><Ico name="next" />
            </button>
          </div>

          <div
            className="slider-hit"
            onPointerDown={startDrag('seek', applySeek)}
            onPointerMove={moveDrag('seek', applySeek)}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <div className="slider-track">
              <div className="slider-fill" style={{ width: progress }} />
              <div className="slider-knob" style={{ left: progress }} />
            </div>
          </div>
          <div className="time-row">
            <span>{fmt(cur)}</span>
            <span>{fmt(dur)}</span>
          </div>

          <div className="vol-row">
            <button className="vol-btn" onClick={toggleMute} aria-label="Tắt tiếng">
              <span className="ico-txt">{volume === 0 ? '✕' : '♪'}</span>
              <Ico name={volume === 0 ? 'mute' : 'vol'} />
            </button>
            <div
              className="slider-hit"
              onPointerDown={startDrag('vol', applyVol)}
              onPointerMove={moveDrag('vol', applyVol)}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              <div className="slider-track">
                <div className="slider-fill" style={{ width: volPct }} />
                <div className="slider-knob" style={{ left: volPct }} />
              </div>
            </div>
            <span className="vol-label">{Math.round(volume * 100)}</span>
          </div>

          <div className="loop-row">
            <span><Ico name="repeat" className="mp-loop-ico" />Phát lặp lại</span>
            <button
              className={`loop-switch ${loop ? 'on' : ''}`}
              onClick={() => setLoop((l) => !l)}
              aria-label="Phát lặp lại"
              aria-pressed={loop}
            >
              <i />
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
