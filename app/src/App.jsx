import { useState, useEffect } from 'react';
import { useSiteConfig } from './hooks/useSiteConfig';
import Nav from './components/Nav';
import GateHero from './components/GateHero';
import Hero from './components/Hero';
import Family from './components/Family';
import WeddingInfo from './components/WeddingInfo';
import Timeline from './components/Timeline';
import RSVP from './components/RSVP';
import Footer from './components/Footer';
import { LightboxProvider } from './components/Lightbox';
import { setManifest } from './lib/storage';

// Cửa trượt hết 1.8s; mở khoá cuộn ở 1.5s để khách kịp thấy Hero hiện ra
// ngay khi cánh cửa vừa rời khỏi khung hình.
const GATE_RELEASE_MS = 1500;

export default function App() {
  const { config, siteText, manifest, loading } = useSiteConfig();
  // Chỉ nạp khi nội dung chữ đã về. Nạp ngay lượt render đầu tiên là mở cổng bằng
  // bản kê rỗng — đúng cái lỗi cần tránh. Vẫn gọi thẳng trong thân component
  // (không đặt trong useEffect) để tầng lưu trữ có bản kê trước lượt render của con.
  if (!loading) setManifest(manifest);
  const [gateOpened, setGateOpened] = useState(false);
  const [navVisible, setNavVisible] = useState(false);

  useEffect(() => {
    const parts = config.weddingDate?.split('-') || [];
    const dateStr = parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : '';
    if (config.groomShort && config.brideShort) {
      document.title = `${config.groomShort} & ${config.brideShort}${dateStr ? ` — ${dateStr}` : ''}`;
    }
  }, [config]);

  // Khoá cuộn tới khi khách mở cổng. Đã mở rồi thì không khoá lại,
  // kể cả khi component mount lại.
  useEffect(() => {
    if (gateOpened) return undefined;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [gateOpened]);

  const handleGateOpen = () => {
    if (gateOpened) return;
    setGateOpened(true);
    setTimeout(() => {
      document.body.style.overflow = '';
      setNavVisible(true);
    }, GATE_RELEASE_MS);
  };

  return (
    <LightboxProvider>
      <Nav config={config} siteText={siteText} visible={navVisible} />
      <GateHero siteText={siteText} opened={gateOpened} onOpen={handleGateOpen} />
      <Hero config={config} siteText={siteText} visible={gateOpened} />
      <Family side="groom" config={config} siteText={siteText} />
      <Family side="bride" config={config} siteText={siteText} />
      <WeddingInfo config={config} siteText={siteText} />
      <Timeline config={config} siteText={siteText} />
      <RSVP config={config} siteText={siteText} />
      <Footer config={config} siteText={siteText} />
    </LightboxProvider>
  );
}
