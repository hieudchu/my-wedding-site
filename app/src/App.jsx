import { useState, useEffect } from 'react';
import { useSiteConfig } from './hooks/useSiteConfig';
import { useViewport } from './hooks/useViewport';
import { usePhoneReveal } from './hooks/usePhoneReveal';
import { usePhoneScrollFx } from './hooks/usePhoneScrollFx';
import { useLandscapeFullscreen } from './hooks/useLandscapeFullscreen';
import { useHashLanding } from './hooks/useHashLanding';
import Nav from './components/Nav';
import Hero from './components/Hero';
import Family from './components/Family';
import WeddingInfo from './components/WeddingInfo';
import Timeline from './components/Timeline';
import RSVP from './components/RSVP';
import Footer from './components/Footer';
import DeskMotion from './components/DeskMotion';
import ScrollHint from './components/ScrollHint';
import IntroVideo from './components/intro/IntroVideo';
import { LightboxProvider } from './components/Lightbox';
import { setManifest } from './lib/storage';
import { supabase } from './lib/supabase';

/** Nhạc video mở đầu do admin chọn (site_config intro_music*); null = nhạc mặc định. */
function introMusic(t) {
  const start = Math.max(0, Number.parseFloat(t.intro_music_start) || 0);
  if (!t.intro_music) return { url: null, start };
  return { url: supabase.storage.from('media').getPublicUrl(t.intro_music).data.publicUrl, start };
}

/**
 * Trang thiệp cho khách.
 *
 * Không còn cổng mở thiệp. Từ 11/2026 có video mở đầu (`IntroVideo`) phủ lên hero
 * và kết thúc đúng ở thẻ thiệp; chạm bất kỳ là bỏ qua. Hero và nav vẫn dựng ngay
 * phía dưới (`entered` bật sau lần vẽ đầu) để lúc video mờ đi trang đã sẵn sàng.
 */
export default function App() {
  const { config, siteText, manifest, loading } = useSiteConfig();
  // Chỉ nạp khi nội dung chữ đã về. Nạp ngay lượt render đầu tiên là mở bằng
  // bản kê rỗng — đúng cái lỗi cần tránh. Vẫn gọi thẳng trong thân component
  // (không đặt trong useEffect) để tầng lưu trữ có bản kê trước lượt render của con.
  if (!loading) setManifest(manifest);

  const [entered, setEntered] = useState(false);
  const { isPhone } = useViewport();

  usePhoneReveal(isPhone);
  usePhoneScrollFx(isPhone); // chuyển động theo cuộn (điện thoại)
  useLandscapeFullscreen(isPhone); // quay ngang → toàn màn hình (Android, iPad)
  useHashLanding(); // …/#rsvp (mã QR) → mở thẳng phần Xác nhận

  useEffect(() => {
    const parts = config.weddingDate?.split('-') || [];
    const dateStr = parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : '';
    if (config.groomShort && config.brideShort) {
      document.title = `${config.groomShort} & ${config.brideShort}${dateStr ? ` — ${dateStr}` : ''}`;
    }
  }, [config]);

  useEffect(() => {
    // Có video / phong bì mở đầu (IntroVideo đặt html[data-intro]): trang "vào" — chữ thẻ hero trồi lên,
    // nav hiện — đúng lúc lớp phủ bắt đầu mờ, để khách thấy y như lần mở trang đầu tiên (chủ thiệp).
    // Trước đó animation chạy ngầm dưới lớp phủ, mờ xong thì chữ đã đứng yên.
    if (document.documentElement.dataset.intro === 'on') {
      const on = () => setEntered(true);
      window.addEventListener('hm-intro-leave', on);
      window.addEventListener('hm-intro-end', on);
      return () => { window.removeEventListener('hm-intro-leave', on); window.removeEventListener('hm-intro-end', on); };
    }
    // setTimeout thay requestAnimationFrame: rAF đứng yên khi tab nằm ở nền,
    // trang sẽ kẹt ở trạng thái chưa hiện cho tới khi khách quay lại tab.
    const id = setTimeout(() => setEntered(true), 30);
    return () => clearTimeout(id);
  }, []);

  return (
    <LightboxProvider>
      <DeskMotion />
      <IntroVideo
        ready={!loading}
        enabled={loading ? null : siteText.intro_video !== 'off'}
        music={introMusic(siteText)}
      />
      <Nav config={config} siteText={siteText} visible={entered} />
      <Hero config={config} siteText={siteText} visible={entered} />
      <ScrollHint enabled={isPhone} />
      <Family side="groom" config={config} siteText={siteText} />
      <Family side="bride" config={config} siteText={siteText} />
      <WeddingInfo config={config} siteText={siteText} />
      <Timeline config={config} siteText={siteText} />
      <RSVP config={config} siteText={siteText} />
      <Footer config={config} siteText={siteText} />
    </LightboxProvider>
  );
}
