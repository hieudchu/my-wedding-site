import { useState } from 'react';
import { WEDDING_CONFIG } from './lib/config';
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
  const [musicOn, setMusicOn] = useState(false);
  const [navVisible, setNavVisible] = useState(false);

  useReveal();

  return (
    <>
      <Nav config={WEDDING_CONFIG} musicOn={musicOn} setMusicOn={setMusicOn} visible={navVisible} />
      <GateHero config={WEDDING_CONFIG} onOpen={() => setNavVisible(true)} />
      <Details />
      <Family side="groom" config={WEDDING_CONFIG} reverse={false} />
      <Family side="bride" config={WEDDING_CONFIG} reverse={true} />
      <WeddingInfo config={WEDDING_CONFIG} />
      <Timeline config={WEDDING_CONFIG} />
      <RSVP config={WEDDING_CONFIG} />
      <Footer config={WEDDING_CONFIG} />
    </>
  );
}
