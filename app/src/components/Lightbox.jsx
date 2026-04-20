import { useState, useEffect, useCallback, createContext, useContext } from 'react';

const LightboxContext = createContext(null);

export function useLightbox() {
  return useContext(LightboxContext);
}

export function LightboxProvider({ children }) {
  const [lightbox, setLightbox] = useState(null);

  const open = useCallback((src, label) => {
    setLightbox({ src: src || null, label: label || '' });
  }, []);

  const close = useCallback(() => setLightbox(null), []);

  return (
    <LightboxContext.Provider value={open}>
      {children}
      {lightbox && <LightboxOverlay src={lightbox.src} label={lightbox.label} onClose={close} />}
    </LightboxContext.Provider>
  );
}

function LightboxOverlay({ src, label, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose} aria-label="Close">&times;</button>
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        {src ? (
          <img src={src} alt={label || ''} className="lightbox-img" />
        ) : (
          <div className="lightbox-placeholder ph" data-label={label} />
        )}
      </div>
    </div>
  );
}
