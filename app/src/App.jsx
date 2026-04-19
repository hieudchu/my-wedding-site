import { useState } from 'react';
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

  useReveal(!loading);

  if (loading) return null;

  return (
    <>
      <Nav config={config} musicOn={musicOn} setMusicOn={setMusicOn} visible={navVisible} />
      <GateHero config={config} siteText={siteText} onOpen={() => setNavVisible(true)} />
      <Details siteText={siteText} />
      <Family side="groom" config={config} siteText={siteText} reverse={false} />
      <Family side="bride" config={config} siteText={siteText} reverse={true} />
      <WeddingInfo config={config} siteText={siteText} />
      <Timeline config={config} />
      <RSVP config={config} siteText={siteText} />
      <Footer config={config} siteText={siteText} />
    </>
  );
}
