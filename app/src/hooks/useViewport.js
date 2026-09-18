import { useState, useEffect } from 'react';

export const PHONE_MAX = 760;   // dưới ngưỡng này là điện thoại
export const TABLET_MAX = 1080; // 760–1080 là tablet

/**
 * Kích thước khung nhìn, cập nhật khi đổi cỡ hoặc xoay máy.
 *
 * Carousel phải tính bề rộng và chiều cao thẻ bằng JS (phụ thuộc cả màn hình lẫn
 * hướng từng tấm ảnh) nên không thể làm bằng CSS thuần. Mọi thay đổi bố cục khác
 * đều nằm ở media query trong sections.css.
 *
 * Nghe cả `orientationchange` vì trên iOS sự kiện `resize` có lúc bắn trước khi
 * kích thước mới kịp cập nhật.
 */
export function useViewport() {
  const [size, setSize] = useState(() => ({
    vw: typeof window !== 'undefined' ? window.innerWidth : 1280,
    vh: typeof window !== 'undefined' ? window.innerHeight : 800,
  }));

  useEffect(() => {
    const read = () => setSize({ vw: window.innerWidth, vh: window.innerHeight });
    read();
    const onOrientation = () => {
      read();
      // iOS báo kích thước cũ ngay lúc xoay — đọc lại sau khi trình duyệt ổn định
      setTimeout(read, 250);
    };
    window.addEventListener('resize', read);
    window.addEventListener('orientationchange', onOrientation);
    return () => {
      window.removeEventListener('resize', read);
      window.removeEventListener('orientationchange', onOrientation);
    };
  }, []);

  return {
    ...size,
    isPhone: size.vw < PHONE_MAX,
    isTablet: size.vw >= PHONE_MAX && size.vw < TABLET_MAX,
  };
}
