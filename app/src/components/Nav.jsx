import { useState, useEffect, useRef } from 'react';
import { useMediaUrl } from '../hooks/useMedia';

export default function Nav({ config, siteText = {}, musicOn, setMusicOn, visible }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const audioRef = useRef(null);

  const musicUrl = useMediaUrl('music/bgm.mp3', null);
  const navLogoUrl = useMediaUrl('icons/medallion-ink.png', '/assets/medallion-ink.png');

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
            onError={(e) => { e.target.src = '/assets/medallion-ink.png'; }}
          />
          <span>
            {config.groomShort} &amp; {config.brideShort}
          </span>
        </a>
        <div className="links">
          <a href="#story">{siteText.nav_story || 'Chuyện tình'}</a>
          <a href="#groom">{siteText.nav_family || 'Gia đình'}</a>
          <a href="#details">{siteText.nav_invitation || 'Thiệp mời'}</a>
          <a href="#timeline">{siteText.nav_timeline || 'Lịch trình'}</a>
          <a href="#rsvp">{siteText.nav_rsvp || 'Xác nhận'}</a>
        </div>
        <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
          <a href="#story" onClick={handleNavClick}>{siteText.nav_story || 'Chuyện tình'}</a>
          <a href="#groom" onClick={handleNavClick}>{siteText.nav_family || 'Gia đình'}</a>
          <a href="#details" onClick={handleNavClick}>{siteText.nav_invitation || 'Thiệp mời'}</a>
          <a href="#timeline" onClick={handleNavClick}>{siteText.nav_timeline || 'Lịch trình'}</a>
          <a href="#rsvp" onClick={handleNavClick}>{siteText.nav_rsvp || 'Xác nhận'}</a>
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
