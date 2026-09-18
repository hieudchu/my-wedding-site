import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';

const LightboxContext = createContext(null);

export function useLightbox() {
  return useContext(LightboxContext);
}

/**
 * Lớp phủ xem ảnh toàn màn hình.
 * Mở: bấm bất kỳ ảnh nào. Đóng: nút ×, bấm nền, hoặc Esc.
 * Bấm vào chính tấm ảnh thì phóng to 1.7×.
 */
export function LightboxProvider({ children }) {
  const [item, setItem] = useState(null);
  const [closing, setClosing] = useState(false);
  const [zoom, setZoom] = useState(false);
  const closeTimer = useRef(null);
  // Nhớ trạng thái cuộn trước khi mở, để trả lại đúng như cũ
  // (trang vẫn đang khoá cuộn nếu khách chưa mở cổng).
  const prevOverflow = useRef('');

  const open = useCallback((src, label) => {
    prevOverflow.current = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setItem({ src: src || null, label: label || '' });
    setClosing(false);
    setZoom(false);
  }, []);

  const close = useCallback(() => {
    setClosing((isClosing) => {
      if (isClosing) return isClosing;
      clearTimeout(closeTimer.current);
      closeTimer.current = setTimeout(() => {
        document.body.style.overflow = prevOverflow.current;
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
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [item, close]);

  return (
    <LightboxContext.Provider value={open}>
      {children}
      {item && (
        <div className={`lb-overlay ${closing ? 'closing' : ''}`} onClick={close}>
          <div className="lb-inner" onClick={(e) => e.stopPropagation()}>
            <div className="lb-frame">
              <div className={`lb-zoom ${zoom ? 'zoomed' : ''}`}>
                {item.src ? (
                  <img
                    src={item.src}
                    alt={item.label || ''}
                    className="lb-img"
                    onClick={(e) => { e.stopPropagation(); setZoom((z) => !z); }}
                  />
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
