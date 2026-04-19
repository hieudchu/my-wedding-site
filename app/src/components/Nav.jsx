import { useState, useEffect, useRef } from 'react';
import { useMediaUrl } from '../hooks/useMedia';

export default function Nav({ config, musicOn, setMusicOn, visible }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const audioRef = useRef(null);

  const musicUrl = useMediaUrl('music/bgm.mp3');
  const navLogoUrl = useMediaUrl('icons/medallion-ink.png');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const src = musicUrl || '';
    if (audio.src !== src) audio.src = src;
    if (musicOn && src) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [musicOn, musicUrl]);

  const handleNavClick = () => setMenuOpen(false);

  return (
    <>
      <audio ref={audioRef} loop preload="none" />
      <nav className={`nav ${visible ? 'visible' : ''} ${scrolled ? 'scrolled' : ''}`}>
        <a href="#home" className="brand">
          <img
            src={navLogoUrl || '/assets/medallion-ink.png'}
            alt=""
            style={{ height: 32, width: 'auto', maxWidth: 32, flexShrink: 0, display: 'block' }}
          />
          <span>
            {config.brideShort} &amp; {config.groomShort}
          </span>
        </a>
        <div className="links">
          <a href="#story">Chuyện tình</a>
          <a href="#groom">Gia đình</a>
          <a href="#details">Thiệp mời</a>
          <a href="#timeline">Lịch trình</a>
          <a href="#rsvp">Xác nhận</a>
        </div>
        <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
          <a href="#story" onClick={handleNavClick}>Chuyện tình</a>
          <a href="#groom" onClick={handleNavClick}>Gia đình</a>
          <a href="#details" onClick={handleNavClick}>Thiệp mời</a>
          <a href="#timeline" onClick={handleNavClick}>Lịch trình</a>
          <a href="#rsvp" onClick={handleNavClick}>Xác nhận</a>
        </div>
        <div className="nav-right">
          <button
            className={`music-btn ${musicOn ? '' : 'muted'}`}
            onClick={() => setMusicOn(!musicOn)}
            title={config.musicTrack}
          >
            <div className="bars">
              <span />
              <span />
              <span />
            </div>
          </button>
          <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            <span className={`hamburger-icon ${menuOpen ? 'open' : ''}`}>
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
