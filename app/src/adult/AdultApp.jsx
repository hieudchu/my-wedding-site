import { useState, useEffect, useRef } from 'react';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { supabase } from '../lib/supabase';
import { formatDateParts } from '../lib/config';
import { setManifest } from '../lib/storage';
import { LightboxProvider } from '../components/Lightbox';
import MediaImage from '../components/MediaImage';
import ScriptName from '../components/ScriptName';
import Tagline from '../components/Tagline';
import AdultRSVP from './AdultRSVP';
import { AFrame, ASeal, ARule } from './AdultDecor';
import { adultScrollTo, useAdultScrollFx } from './useAdultScrollFx';
import './adult.css';

/**
 * Trang /adult: thiệp BỐ MẸ HAI BÊN gửi đồng nghiệp, cấp trên, bạn bè của mình.
 * Bản 2 (2026-11-17): giữ hero thẻ đỏ của trang chính (không có xấp ảnh vuốt), bỏ mục
 * Gia đình, vào thẳng hai tấm thiệp theo bộ thiệp in:
 *
 *   Nav     con dấu + "Hiếu & Minh" · ☰ (điện thoại) / liên kết (desktop) · vạch tiến độ
 *   Hero    #thiep-cuoi  thẻ đỏ "Thiệp cưới · Đăng Hiếu & Thiện Minh" như trang chính
 *   Thiệp   #thiep-moi   MỘT thẻ giấy (desktop: hai cột vừa một màn): Ông Bà hai họ chia đôi · báo tin lễ thành hôn · tên đôi · ❖ ·
 *                        kính mời Quý khách · #dia-diem nơi tổ chức · giờ · ngày âm · Xác nhận
 *   Ảnh     một ảnh cưới khung vòm
 *   #xac-nhan (AdultRSVP) · chân trang đỏ
 *
 * Chữ riêng trang này đọc từ site_config khoá `adult_…` (CHANGES.md). Trống → dùng dữ
 * liệu chung (venue_name, wedding_time…) hoặc ẩn dòng. Chuyển động: useAdultScrollFx.
 */

// family_members.role_label ("Cha"/"Mẹ") → cách xưng trên thiệp bố mẹ gửi
const HONORIFIC = { Cha: 'Ông', Bố: 'Ông', Mẹ: 'Bà' };

const A_LINKS = [['thiep-moi', 'Thiệp mời'], ['dia-diem', 'Địa điểm'], ['xac-nhan', 'Xác nhận tham dự']];

function useParents() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    supabase
      .from('family_members')
      .select('side, role_label, name_vi, sort_order')
      .order('sort_order')
      .then(({ data }) => { if (data) setRows(data); })
      .catch(() => {});
  }, []);
  const pick = (side) => rows
    .filter((r) => r.side === side)
    .map((r) => ({ title: HONORIFIC[r.role_label] || r.role_label, name: r.name_vi }));
  return { groom: pick('groom'), bride: pick('bride') };
}

function adultText(siteText, config) {
  const t = (k) => String(siteText[k] || '').trim();
  const partyTime = t('adult_party_time') || config.weddingTime;
  return {
    venueTitle: t('adult_venue_title') || config.venueName,
    venueHall: t('adult_venue_hall'),
    venueAddress: t('adult_venue_address') || config.venueAddress,
    partyTime,
    // Giờ đón khách = wedding_time; chỉ hiện khi khác giờ trên thiệp
    welcomeTime: config.weddingTime && config.weddingTime !== partyTime ? config.weddingTime : '',
  };
}

// "18:00" → "18h00"
function hText(hhmm) {
  const [h, m] = (hhmm || '').split(':');
  return h ? `${Number(h)}h${m || '00'}` : '';
}

function House({ side, people }) {
  const label = side === 'groom' ? 'Nhà trai' : 'Nhà gái';
  return (
    <div className="a-house" role="group" aria-label={label}>
      <span className="a-house-title">{label}</span>
      {people.length
        ? people.map((p) => <span key={p.title + p.name} className="a-house-name">{p.name}</span>)
        : <span className="a-house-name a-dim">—</span>}
    </div>
  );
}


export default function AdultApp() {
  const { config, siteText, manifest, loading } = useSiteConfig();
  if (!loading) setManifest(manifest); // như App.jsx: nạp bản kê trước khi MediaImage render
  const parents = useParents();
  const d = formatDateParts(config.weddingDate);
  const t = adultText(siteText, config);
  const pageRef = useRef(null);
  const [menu, setMenu] = useState(false);
  const [rsvpIn, setRsvpIn] = useState(false); // mục xác nhận đang trên màn → bong bóng lui đi
  const [cueIn, setCueIn] = useState(true); // nút "Mời xem thiệp" ở hero đang trên màn → bong bóng chờ
  useAdultScrollFx(pageRef);

  // Bong bóng "Xác nhận tham dự": nổi ở góc dưới suốt trang, trừ hai lúc:
  //  · thẻ đỏ hero còn chiếm đáy màn (mở trang) → bong bóng chờ, không che "Mời xem thiệp" / góc khung;
  //  · chính mục xác nhận đang trên màn → lui đi, không che nút Gửi.
  // Không có IntersectionObserver → luôn hiện.
  useEffect(() => {
    // Đo theo cuộn (không dùng IntersectionObserver: trong iframe / webview, IO tính theo màn của
    // trang cha nên có thể không bao giờ báo). Chỉ đọc bố cục, một lần mỗi khung hình.
    const rsvp = document.getElementById('xac-nhan');
    const hero = document.getElementById('thiep-cuoi');
    // Hai phép đo nhỏ mỗi lần cuộn; setState trùng giá trị thì React bỏ qua. Gọi thẳng (không rAF:
    // iframe ngoài màn bị hoãn rAF → trạng thái kẹt).
    // Chờ theo chính hero (không chỉ nút "Mời xem thiệp"): khi thẻ đỏ còn chiếm đáy màn thì bong bóng
    // không hiện — màn ngang không có nút đó nhưng thẻ đỏ lấp kín màn, bong bóng sẽ đè lên góc khung.
    const check = () => {
      const vh = window.innerHeight;
      const h = hero ? hero.getBoundingClientRect() : null;
      const r = rsvp ? rsvp.getBoundingClientRect() : null;
      setCueIn(!!h && h.bottom > vh - 80);
      setRsvpIn(!!r && r.top < vh * 0.7 && r.bottom > 0);
    };
    check();
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => {
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, []);
  const bubbleOff = rsvpIn || cueIn;

  useEffect(() => {
    document.title = `Thiệp mời · ${config.groomShort} & ${config.brideShort}`;
  }, [config.groomShort, config.brideShort]);

  // Menu ☰: Esc hoặc chạm ra ngoài nav thì đóng
  useEffect(() => {
    if (!menu) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setMenu(false); };
    const onDown = (e) => { if (!e.target.closest('.a-nav')) setMenu(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [menu]);

  // href="#…" vẫn chạy khi JS lỗi
  const go = (id) => (e) => { e.preventDefault(); setMenu(false); adultScrollTo(id); };

  return (
    <LightboxProvider>
      <div className="a-page" ref={pageRef}>
        {/* ── Nav ──────────────────────────────────────────────── */}
        <nav className="a-nav" aria-label="Điều hướng thiệp">
          <a href="#thiep-cuoi" className="a-nav-brand" onClick={go('thiep-cuoi')}>
            <img src="/assets/medallion-ink.png" alt="" />
            <span>{config.groomShort} &amp; {config.brideShort}</span>
          </a>
          <div className="a-nav-links">
            {A_LINKS.map(([id, label]) => (
              <a key={id} href={`#${id}`} className={id === 'xac-nhan' ? 'a-nav-cta' : undefined} onClick={go(id)}>{label}</a>
            ))}
          </div>
          <button
            type="button"
            className={`a-burger ${menu ? 'open' : ''}`}
            onClick={() => setMenu((m) => !m)}
            aria-label="Menu"
            aria-expanded={menu}
            aria-controls="a-menu"
          >
            <span><i /><i /><i /></span>
          </button>
          {menu && (
            <div className="a-menu" id="a-menu">
              {A_LINKS.map(([id, label]) => (
                <a key={id} href={`#${id}`} className={id === 'xac-nhan' ? 'a-menu-cta' : undefined} onClick={go(id)}>{label}</a>
              ))}
            </div>
          )}
          <span className="a-nav-progress" aria-hidden="true" />
        </nav>

        <main>
          {/* ── Hero: thẻ đỏ như trang chính ─────────────────────── */}
          <section className="a-hero" id="thiep-cuoi" data-sp="" aria-label="Thiệp cưới">
            <div className="a-hcard">
              <AFrame tone="wine" />
              {(
                <div className="a-flecks" aria-hidden="true">
                  {Array.from({ length: 16 }, (_, i) => (
                    <i key={i} style={{ '--x': `${(i * 37 + 11) % 100}%`, '--y': `${(i * 53 + 7) % 90}%`, '--d': `${(i * 0.37) % 4}s`, '--s': (0.6 + ((i * 7) % 5) * 0.18).toFixed(2), '--r': `${(i * 47) % 360}deg` }} />
                  ))}
                </div>
              )}
              <div className="a-hcard-body">
                <div className="a-hkicker">
                  <span className="a-hrule" />
                  <span>{siteText.hero_kicker || 'Thiệp cưới'}</span>
                  <span className="a-hrule" />
                </div>
                <h1 className="a-hnames a-script">
                  <ScriptName full={siteText.couple_groom_full} short={config.groomShort} />
                  <em>&amp;</em>
                  <ScriptName full={siteText.couple_bride_full} short={config.brideShort} />
                </h1>
                <p className="a-htag"><Tagline text={siteText.gate_tagline} /></p>
                <div className="a-hmeta">
                  <span className="a-hm-date">{d.dd} · {d.mm} · {d.yyyy}</span>
                  <span className="a-hm-place">{t.partyTime} — {siteText.hero_venue || config.venueName}</span>
                </div>
              </div>
            </div>
            <a className="a-cue" href="#thiep-moi" onClick={go('thiep-moi')}>
              <span>Mời xem thiệp</span>
              <i aria-hidden="true" />
            </a>
          </section>

          {/* ── Một tấm thiệp: báo hỷ (trên) + mời (dưới) ───────── */}
          <div className="a-cards">
            <section className="a-pc" id="thiep-moi" data-sp="" aria-label="Thiệp mời">
              <AFrame tone="paper" />
              <div className="a-pc-col a-pc-l">
              <ASeal />
              <div className="a-houses a-fx" data-sp="" style={{ '--rows': 1 + Math.max(1, parents.groom.length, parents.bride.length) }}>
                <House side="groom" people={parents.groom} />
                <House side="bride" people={parents.bride} />
              </div>
              <ARule cls="a-rule--desk" />
              <div className="a-ann-lead a-fx" data-sp="">
                <p className="a-eyebrow">Trân trọng kính mời</p>
                <p className="a-ann-line"><em className="a-guest-inline">Quý khách</em> tới dự lễ thành hôn<br />của hai con chúng tôi</p>
              </div>
              <img className="a-ico" src="/assets/icons/timeline-rings.png" alt="" aria-hidden="true" />
              <h2 className="a-couple" data-sp="">
                <span className="a-person">{config.groomName}</span>
                <span className="a-amp">&amp;</span>
                <span className="a-person">{config.brideName}</span>
              </h2>

              </div>

              <ARule cls="a-rule--mid" />

              <div className="a-pc-col a-pc-r">

              <div className="a-venue a-fx" id="dia-diem" data-sp="">
                <img className="a-ico" src="/assets/icons/timeline-glasses.png" alt="" aria-hidden="true" />
                <h2 className="a-venue-title">{t.venueTitle}</h2>
                {t.venueHall && <p className="a-venue-hall">{t.venueHall}</p>}
                <p className="a-venue-addr">{t.venueAddress}</p>
                {config.mapUrl && (
                  <a className="a-btn a-btn-ghost a-map-inline" href={config.mapUrl} target="_blank" rel="noopener noreferrer">
                    Xem bản đồ <span aria-hidden="true" className="a-btn-arrow">↗</span>
                  </a>
                )}
              </div>

              <ARule />

              <div className="a-when a-when--cal a-fx" id="gio" data-sp="">
                <div className="a-cal">
                  <div className="a-cal-tile" aria-label={`${d.weekday}, ngày ${d.dd} tháng ${Number(d.mm)} năm ${d.yyyy}`}>
                    <span className="a-cal-wd">{d.weekday}</span>
                    <span className="a-cal-dd">{d.dd}</span>
                    <span className="a-cal-my">{d.monthVn} · {d.yyyy}</span>
                  </div>
                  <div className="a-cal-side">
                    <span className="a-eyebrow">Vào lúc</span>
                    <span className="a-cal-time">{t.partyTime}</span>
                    {t.welcomeTime && <span className="a-cal-welcome">Đón khách <strong>{hText(t.welcomeTime)}</strong></span>}
                  </div>
                </div>
              </div>

              <ARule />

              <div className="a-honor a-fx" data-sp="">
                <p className="a-honor-text">Sự hiện diện của Quý vị<br />là niềm vinh hạnh cho gia đình chúng tôi!</p>
                <p className="a-welcome">Rất hân hạnh được đón tiếp!</p>
                <div className="a-actions">
                  {config.mapUrl && (
                    <a className="a-btn a-btn-ghost a-map-desk" href={config.mapUrl} target="_blank" rel="noopener noreferrer">
                      Xem bản đồ <span aria-hidden="true" className="a-btn-arrow">↗</span>
                    </a>
                  )}
                </div>
              </div>
              </div>
            </section>
          </div>

          {/* ── Một ảnh cưới ─────────────────────────────────────── */}
          <figure className="a-photo" id="anh-cuoi">
            <div className="a-photo-mount" data-sp="">
              {['tl', 'tr', 'bl', 'br'].map((k) => <span key={k} className={`a-pcn a-pcn-${k}`} aria-hidden="true" />)}
            <div className="a-photo-frame">
              <MediaImage
                storagePath="background/moment-2.jpg"
                label={`${config.groomShort} và ${config.brideShort}`}
                alt={`${config.groomShort} và ${config.brideShort}`}
                sizes="(max-width: 760px) 86vw, 420px"
              />
            </div>
            </div>
          </figure>

          {/* ── Xác nhận ─────────────────────────────────────────── */}
          <AdultRSVP config={config} venueTitle={t.venueTitle} partyTime={t.partyTime} />
        </main>

        {/* ── Bong bóng: nhảy thẳng xuống mục xác nhận ───────────── */}
        <a
          href="#xac-nhan"
          className="a-bubble"
          data-off={bubbleOff ? '' : undefined}
          aria-hidden={bubbleOff ? 'true' : undefined}
          tabIndex={bubbleOff ? -1 : undefined}
          onClick={go('xac-nhan')}
        >
          <span className="a-bubble-ico"><img src="/assets/rsvp/envelope.png" alt="" /></span>
          <span className="a-bubble-txt">Xác nhận tham dự</span>
        </a>

        {/* ── Chân trang ───────────────────────────────────────── */}
        <footer className="a-foot" id="cuoi-trang" data-sp="">
          <img src="/assets/medallion-gold.png" alt="" loading="lazy" />
          <p className="a-foot-thanks a-fx" data-sp="">Gia đình hai họ trân trọng cảm ơn</p>
          <p className="a-foot-names a-script a-fx" data-sp="">
            <ScriptName full={config.groomShort} /> <em>&amp;</em> <ScriptName full={config.brideShort} />
          </p>
          <span className="a-foot-date">{d.dd} · {d.mm} · {d.yyyy}</span>
        </footer>
      </div>
    </LightboxProvider>
  );
}
