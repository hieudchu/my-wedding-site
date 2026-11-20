import { useEffect, useState } from 'react';

/** ?introdebug=1 — vài dòng trạng thái góc trên trái, để thử trên điện thoại thật (Safari). */
export const DEBUG = typeof window !== 'undefined' && /introdebug=1/.test(window.location.search);

export default function IntroDebug({ phase, needTap, musicRef, mainRef }) {
  const [, tick] = useState(0);
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 250); return () => clearInterval(id); }, []);
  const m = musicRef.current?.state();
  const v = mainRef.current;
  const site = document.querySelector('nav audio, .nav audio, audio');
  return (
    <pre className="intro-debug">
      {`phase ${phase} · tap ${needTap ? 'CẦN' : 'không'} · ${document.visibilityState}
video ${v ? `${v.currentTime.toFixed(1)}${v.paused ? ' (dừng)' : ''}` : '-'}
nhạc ${m ? `${m.paused ? 'dừng' : 'phát'} ${m.t.toFixed(1)}s vol ${m.vol.toFixed(2)} ctx ${m.ctx}` : '-'}
audioSession ${navigator.audioSession?.type || 'không có'}
nhạc nền ${site ? (site.paused ? 'dừng' : `phát ${site.currentTime.toFixed(1)}s`) : '-'}
${window.__introErr || ''}`}
    </pre>
  );
}
