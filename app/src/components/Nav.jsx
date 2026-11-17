import { useState, useRef, useEffect } from 'react';
import { useMediaList } from '../hooks/useMedia';
import { createPortal } from 'react-dom';
import { mqMatches, PHONE_QUERY, useViewport } from '../hooks/useViewport';
import Ico from './Icon';
import MusicBubble from './MusicBubble';

const NAV_OFFSET = 70; // desktop: chiều cao thanh nav khi cuộn tới section

// Tên file đặt cho có, không phải tên bài — thì dùng tên bài ghi trong cấu hình
const PLACEHOLDER_NAME = /^(bgm|music|audio|track|song|nhac)[\s\d-]*$/i;

/** Tên bài: caption nếu có, không thì lấy từ tên file: "canon-in-d.mp3" → "canon in d" */
function trackName(file, fallback) {
  if (!file) return fallback;
  // Tên gốc có dấu admin ghi vào caption lúc tải lên (tên file trong kho đã bỏ dấu)
  if (file.caption?.trim()) return file.caption.trim();
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
  // Logo và nhãn đĩa than: con dấu có sẵn trong bộ cài (/assets, ~15 KB). Không còn ô
  // tải lên ở admin (11/2026), nên không hỏi kho ảnh nữa.

  const navRef = useRef(null);
  const audioRef = useRef(null);
  const dragMode = useRef(null);
  const pendingRatio = useRef(null);

  const [playing, setPlaying] = useState(false);
  const [panel, setPanel] = useState(false);
  // 2 giây sau khi trang tải xong thì cho trình duyệt nạp sẵn phần đầu bài nhạc,
  // để lúc khách bấm phát không phải chờ mở kết nối + tải từ con số 0.
  const [warm, setWarm] = useState(false);
  useEffect(() => {
    let timer;
    const go = () => { timer = setTimeout(() => setWarm(true), 2000); };
    if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
    return () => { window.removeEventListener('load', go); clearTimeout(timer); };
  }, []);
  const [menu, setMenu] = useState(false);
  const [trackIdx, setTrackIdx] = useState(0);
  const [volume, setVolume] = useState(0.6);
  const [lastVol, setLastVol] = useState(0.6);
  const [loop, setLoop] = useState(true);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const { isPhone } = useViewport();
  // Nhạc LUÔN BẬT (2026-11-17, chủ thiệp chọn — thay quy tắc "không tự phát" cũ).
  // Trình duyệt chặn phát có tiếng khi khách chưa chạm trang, nên: thử phát ngay; bị chặn
  // thì phát ở lần chạm / bấm phím đầu tiên, bất kể chạm vào đâu. Khách tự bấm dừng thì
  // tôn trọng, không tự phát lại. Ẩn tab thì dừng, quay lại thì phát tiếp.
  const userPaused = useRef(false);
  const hiddenPaused = useRef(false);
  const [blocked, setBlocked] = useState(false);
  const [bubbleOff, setBubbleOff] = useState(false); // khách kéo bong bóng vào ×

  const current = tracks[trackIdx] || null;
  const musicUrl = current?.url || null;
  const nowPlaying = trackName(current, config.musicTrack);
  const [mpTitle, mpArtist] = (nowPlaying || '').split(/\s+[—–-]\s+/);

  useEffect(() => {
    const a = audioRef.current;
    if (a) a.volume = volume;
  }, [volume]);

  const playMusic = () => {
    const a = audioRef.current;
    if (!a || !musicUrl) return;
    userPaused.current = false;
    a.play().then(() => { setPlaying(true); setBlocked(false); }).catch(() => {});
  };
  const pauseMusic = () => {
    const a = audioRef.current;
    userPaused.current = true;
    if (a) a.pause();
    setPlaying(false);
  };
  const toggleMusic = () => {
    const a = audioRef.current;
    if (!a || !musicUrl) return;
    if (playing) pauseMusic();
    else playMusic();
  };

  const hasMusic = !!musicUrl;
  useEffect(() => {
    if (!hasMusic) return undefined;
    const EVTS = ['pointerup', 'touchend', 'click', 'keydown'];
    let done = false;
    const off = () => EVTS.forEach((t) => document.removeEventListener(t, start, true));
    function start() {
      if (done) return;
      if (userPaused.current) { done = true; off(); return; }
      const a = audioRef.current;
      if (!a) return;
      a.play()
        .then(() => { done = true; off(); setPlaying(true); setBlocked(false); })
        .catch(() => setBlocked(true));
    }
    EVTS.forEach((t) => document.addEventListener(t, start, true));
    start();
    return () => { done = true; off(); };
  }, [hasMusic]);

  useEffect(() => {
    const onVis = () => {
      const a = audioRef.current;
      if (!a) return;
      if (document.hidden) {
        if (!a.paused) { a.pause(); hiddenPaused.current = true; }
      } else if (hiddenPaused.current) {
        hiddenPaused.current = false;
        if (!userPaused.current) a.play().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

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
    // Đang tự cuộn tới mục: nav không trốn (usePhoneScrollFx)
    document.documentElement.setAttribute('data-nav-pin', String(Date.now() + 1600));
    // Điện thoại dọc: "Thiệp mời" cuộn tới chính thẻ thiệp (vừa khít một màn, mobile.css),
    // không tới đầu section (ảnh phía trên thẻ)
    const card = id === 'details' && mqMatches(PHONE_QUERY) && mqMatches('(orientation: portrait) and (max-width: 759.98px)')
      ? document.querySelector('#details .info-card') : null;
    const el = card || document.getElementById(id);
    if (!el) return;
    // Điện thoại: nav cao 66px (dọc) / 58px (ngang) → đo thật thay vì dùng hằng số
    const offset = (mqMatches(PHONE_QUERY) ? (navRef.current?.offsetHeight || NAV_OFFSET) : NAV_OFFSET) + (card ? 12 : 0);
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

  const panelEl = (
        <div className={`music-panel ${playing ? 'is-playing' : ''}`}>
          <div className="mp-head">
            <div className="mp-disc" aria-hidden="true"><img src="/assets/medallion-gold.png" alt="" /></div>
            <div className="mp-text">
              <div className="eyebrow-sm">
                {/* Ba cụm (tên · bài x/y · trạng thái) xuống dòng nguyên cụm khi thiếu chỗ */}
                Nhạc nền{tracks.length > 1 && <> · <span>bài {trackIdx + 1}/{tracks.length}</span></>}
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
  );

  // Điện thoại: bong bóng nhạc nổi thay viên nhạc trên nav (MusicBubble.jsx)
  const bubble = isPhone && hasMusic && !bubbleOff && typeof document !== 'undefined'
    ? createPortal(
      <MusicBubble
        open={panel}
        playing={playing}
        progress={progressNum}
        blocked={blocked}
        onToggle={() => { setPanel((p) => !p); setMenu(false); }}
        onClose={() => setPanel(false)}
        onDismiss={() => { pauseMusic(); setPanel(false); setBubbleOff(true); }}
      >
        {panelEl}
      </MusicBubble>,
      document.body,
    )
    : null;

  return (
    <>
    <nav ref={navRef} className={`nav ${visible ? 'visible' : ''}`}>
      <audio
        ref={audioRef}
        src={musicUrl || undefined}
        /* Không bao giờ 'auto': một bài vài MB nhân với mọi lượt xem là hết băng thông.
           'metadata' chỉ lấy phần đầu file (độ dài bài + vài trăm KB), và chỉ khi
           trang đã tải xong ảnh — xem `warm` ở trên. */
        preload={warm || panel || playing ? 'metadata' : 'none'}
        loop={loop && tracks.length <= 1}
        onTimeUpdate={(e) => { if (dragMode.current !== 'seek') setCur(e.currentTarget.currentTime); }}
        onLoadedMetadata={onMeta}
        onDurationChange={onMeta}
        onEnded={handleEnded}
      />

      <a href="#hero" className="nav-brand" onClick={scrollTo('hero')}>
        <img src="/assets/medallion-ink.png" alt="" />
        <span>{config.groomShort} &amp; {config.brideShort}</span>
      </a>

      <div className="nav-right">
        {links.map(([id, label]) => (
          <a key={id} href={`#${id}`} className={`nav-link ${id === 'rsvp' ? 'nav-link--cta' : ''}`} onClick={scrollTo(id)}>{label}</a>
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

        {!isPhone && (
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
            {/* Nhãn chỉ hiện ở desktop (desktop.css) — chấm ▾ trơ trọi khó đoán là nút */}
            <span className="d-caret-label">Nhạc nền</span>
            <span className="d-caret-ico">▾</span>
          </button>
        </div>
        )}
      </div>

      {menu && (
        <div className="nav-menu">
          {links.map(([id, label]) => (
            <a key={id} href={`#${id}`} className={id === 'rsvp' ? 'nav-menu-cta' : undefined} onClick={scrollTo(id)}>{label}</a>
          ))}
          {isPhone && bubbleOff && hasMusic && (
            <button
              type="button"
              className="nav-menu-music"
              onClick={() => { setBubbleOff(false); setMenu(false); playMusic(); }}
            >
              <Ico name="note" />Bật lại nhạc nền
            </button>
          )}
        </div>
      )}

      {!isPhone && panel && panelEl}

      {isPhone && <span className="nav-progress" aria-hidden="true" />}
    </nav>
    {bubble}
    </>
  );
}
