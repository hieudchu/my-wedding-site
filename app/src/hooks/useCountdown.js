import { useState, useEffect } from 'react';

const pad = (n, len) => String(n).padStart(len, '0');

/**
 * Đếm ngược tới giờ hôn lễ, nhảy mỗi giây.
 *
 * Mốc đích chốt theo giờ Việt Nam (+07:00) chứ không theo múi giờ của máy khách —
 * khách ở nước ngoài mở thiệp vẫn thấy đúng số ngày còn lại tới giờ làm lễ.
 *
 * Giờ/phút/giây đệm 2 chữ số để bề ngang không nhảy. Số NGÀY không đệm —
 * lưới đếm ngược giờ là 4 cột đều nhau nên "68" không làm xô bố cục,
 * mà "068" thì khách đọc ra số ngày sai.
 */
export function useCountdown(dateIso, time = '18:00') {
  const [t, setT] = useState({ d: '0', h: '00', m: '00', s: '00' });

  useEffect(() => {
    if (!dateIso) return undefined;
    const hhmm = /^\d{1,2}:\d{2}$/.test(time) ? time.padStart(5, '0') : '18:00';
    const target = new Date(`${dateIso}T${hhmm}:00+07:00`).getTime();
    if (Number.isNaN(target)) return undefined;

    const tick = () => {
      const diff = Math.max(0, target - Date.now());
      setT({
        d: String(Math.floor(diff / 86400000)),
        h: pad(Math.floor((diff % 86400000) / 3600000), 2),
        m: pad(Math.floor((diff % 3600000) / 60000), 2),
        s: pad(Math.floor((diff % 60000) / 1000), 2),
      });
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [dateIso, time]);

  return t;
}
