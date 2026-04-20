import { useState, useEffect } from 'react';
import { useSiteConfig } from './hooks/useSiteConfig';
import { useReveal } from './hooks/useReveal';
import Nav from './components/Nav';
import GateHero from './components/GateHero';
import Details from './components/Details';
import Family from './components/Family';
import WeddingInfo from './components/WeddingInfo';
import Timeline from './components/Timeline';
import RSVP from './components/RSVP';
import Footer from './components/Footer';

export default function App() {
  const { config, siteText, loading } = useSiteConfig();
  const [musicOn, setMusicOn] = useState(false);
  const [navVisible, setNavVisible] = useState(false);
  const [gateOpened, setGateOpened] = useState(false);

  useReveal(!loading);

  // Lock scroll until gate is opened
  useEffect(() => {
    if (gateOpened) {
      document.body.style.overflow = '';
    } else {
      document.body.style.overflow = 'hidden';
    }
    return () => { document.body.style.overflow = ''; };
  }, [gateOpened]);

  if (loading) return null;

  const handleGateOpen = () => {
    setGateOpened(true);
    setNavVisible(true);
  };

  return (
    <>
      <Nav config={config} musicOn={musicOn} setMusicOn={setMusicOn} visible={navVisible} />
      <GateHero config={config} siteText={siteText} onOpen={handleGateOpen} />
      <Details config={config} siteText={siteText} />
      <Family side="groom" config={config} siteText={siteText} reverse={false} />
      <Family side="bride" config={config} siteText={siteText} reverse={true} />
      <WeddingInfo config={config} siteText={siteText} />
      <Timeline config={config} />
      <RSVP config={config} siteText={siteText} />
      <Footer config={config} siteText={siteText} />
    </>
  );
}
