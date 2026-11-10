import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import { lockScroll, unlockScroll } from '../lib/scrollLock';
import { mqMatches, PHONE_QUERY } from '../hooks/useViewport';

const LightboxContext = createContext(null);

export function useLightbox() {
  return useContext(LightboxContext);
}

/**
 * Lớp phủ xem ảnh toàn màn hình.
 * Mở: bấm bất kỳ ảnh nào. Đóng: nút ×, bấm nền, hoặc Esc.
 *
 * Khoá cuộn qua `lockScroll()` (SỬA 7) thay vì tự đặt `body.overflow`, vì trên
 * iOS cách cũ không chặn được cuộn bằng ngón tay.
 */
export function LightboxProvider({ children }) {
  const [item, setItem] = useState(null);
  const [closing, setClosing] = useState(false);
  const [zoom, setZoom] = useState(false);
  const closeTimer = useRef(null);

  const open = useCallback((src, label) => {
    lockScroll();
    setItem({ src: src || null, label: label || '' });
    setClosing(false);
    setZoom(false);
  }, []);

  const close = useCallback(() => {
    setClosing((isClosing) => {
      if (isClosing) return isClosing;
      clearTimeout(closeTimer.current);
      closeTimer.current = setTimeout(() => {
        unlockScroll();
        setItem(null);
        setClosing(false);
        setZoom(false);
      }, 320);
      return true;
    });
  }, []);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  useEffect(() => {
    if (!item) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [item, close]);

  // SỬA 9 — trên điện thoại bỏ phóng 1.7× (phóng mà không kéo được là tệ nhất
  // trong ba lựa chọn). Khách dùng pinch-zoom gốc của trình duyệt.
  // Desktop giữ nguyên hành vi cũ.
  const toggleZoom = (e) => {
    e.stopPropagation();
    if (mqMatches(PHONE_QUERY)) return;
    setZoom((z) => !z);
  };

  return (
    <LightboxContext.Provider value={open}>
      {children}
      {item && (
        <div className={`lb-overlay ${closing ? 'closing' : ''}`} onClick={close}>
          <div className="lb-inner" onClick={(e) => e.stopPropagation()}>
            <div className="lb-frame">
              <div className={`lb-zoom ${zoom ? 'zoomed' : ''}`}>
                {item.src ? (
                  <img src={item.src} alt={item.label || ''} className="lb-img" onClick={toggleZoom} />
                ) : (
                  <div className="ph lb-placeholder" data-label={item.label} />
                )}
              </div>
            </div>
          </div>
          <button className="lb-close" onClick={close} aria-label="Đóng">×</button>
        </div>
      )}
    </LightboxContext.Provider>
  );
}
