// Wedding Site — main React app
// Sections: Gate → Details → Families → Info → Timeline → RSVP

const { useState, useEffect, useRef, useCallback } = React;

/* ---------- Default tweakable state ---------- */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "groomName": "Chu Đăng Hiếu",
  "groomShort": "Hiếu",
  "brideName": "Nguyễn Thu Thiện Minh",
  "brideShort": "Minh",
  "weddingDate": "2026-11-08",
  "weddingTime": "17:00",
  "venueName": "White Palace Phạm Văn Đồng",
  "venueAddress": "108 Phạm Văn Đồng, P. Hiệp Bình Chánh, TP. Thủ Đức, TP.HCM",
  "phone": "+84 912 345 678",
  "mapUrl": "https://maps.google.com/?q=White+Palace+Pham+Van+Dong",
  "musicTrack": "Canon in D — Pachelbel"
}/*EDITMODE-END*/;

/* ---------- Helpers ---------- */
function formatDateParts(iso) {
  const d = new Date(iso + "T12:00:00");
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const weekdays = ["Chủ nhật","Thứ hai","Thứ ba","Thứ tư","Thứ năm","Thứ sáu","Thứ bảy"];
  const weekdaysEn = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  return {
    dd, mm, yyyy,
    weekday: weekdays[d.getDay()],
    weekdayEn: weekdaysEn[d.getDay()],
    monthVn: `Tháng ${d.getMonth() + 1}`,
  };
}

function useCountdown(targetIso) {
  const [t, setT] = useState({ d: 0, h: 0, m: 0, s: 0 });
  useEffect(() => {
    const target = new Date(targetIso + "T17:00:00").getTime();
    const tick = () => {
      const diff = Math.max(0, target - Date.now());
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setT({ d, h, m, s });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetIso]);
  return t;
}

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("in"); });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* ---------- Gate hero ---------- */
function GateHero({ tweaks, onOpen }) {
  const [opened, setOpened] = useState(false);
  const parts = formatDateParts(tweaks.weddingDate);
  const handleOpen = () => {
    if (opened) return;
    setOpened(true);
    setTimeout(() => onOpen && onOpen(), 400);
  };
  return (
    <section className={`gate-hero ${opened ? "opened" : ""}`} data-screen-label="01 Gate" id="home">
      <div className="gate-bg" />

      {/* Content behind the doors */}
      <div className="gate-hero-content">
        <img className="medallion" src="assets/medallion-gold.png" alt="H&amp;M medallion" />
        <h1>
          {tweaks.brideShort}<span className="amp">&amp;</span>{tweaks.groomShort}
        </h1>
        <div className="ornament" />
        <p className="tagline">"Cùng nhau đón những hoàng hôn rực rỡ nhất của cuộc đời."</p>
        <div className="date-line">
          {parts.dd} · {parts.mm} · {parts.yyyy}
        </div>
      </div>

      {/* Left door */}
      <div className="gate-door gate-door-l" style={{ transform: opened ? "translateX(-100%)" : "translateX(0)" }}>
        <div className="door-inner" />
        <div className="lantern">
          <div className="glow" />
          <div className="lbl">囍</div>
        </div>
      </div>

      {/* Right door */}
      <div className="gate-door gate-door-r" style={{ transform: opened ? "translateX(100%)" : "translateX(0)" }}>
        <div className="door-inner" />
        <div className="lantern">
          <div className="glow" />
          <div className="lbl">囍</div>
        </div>
      </div>

      {/* Invitation prompt */}
      <button className="gate-prompt" onClick={handleOpen} aria-label="Mở thiệp">
        <span className="label">Trân trọng kính mời</span>
        <span className="sub">Tap to open · Bấm để mở thiệp</span>
        <span className="pulse" />
      </button>
    </section>
  );
}

/* ---------- Details + Carousel ---------- */
function Details({ tweaks }) {
  const trackRef = useRef(null);
  const scrollBy = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 400, behavior: "smooth" });
  };
  const photos = [
    { type: "tall", label: "Photo 01 · Engagement", cap: "Đà Lạt · 2024" },
    { type: "wide", label: "Photo 02 · Wide", cap: "Mùa hè đầu tiên" },
    { type: "sq",   label: "Photo 03 · Square", cap: "Buổi chiều Sài Gòn" },
    { type: "tall", label: "Photo 04 · Portrait", cap: "Nụ cười" },
    { type: "wide", label: "Photo 05 · Wide", cap: "Hoàng hôn" },
    { type: "sq",   label: "Photo 06 · Square", cap: "Tay trong tay" },
    { type: "tall", label: "Photo 07 · Portrait", cap: "Một ngày bình yên" },
  ];
  return (
    <section className="details" data-screen-label="02 Details" id="story">
      <div className="details-intro reveal">
        <span className="eyebrow">Save the date · 08.11.2026</span>
        <h2>
          Cùng nhau đón những hoàng hôn <em>rực rỡ nhất</em> của cuộc đời.
        </h2>
        <p>
          Sau bao mùa mưa nắng, hai con tim cuối cùng cũng tìm được cùng một nhịp đập.
          Chúng em xin trân trọng mời bạn đến chia vui trong ngày trọng đại của chúng em.
        </p>
      </div>

      <div className="carousel-wrap reveal d1">
        <div className="carousel" ref={trackRef}>
          {photos.map((p, i) => (
            <div key={i} className={`card ${p.type}`}>
              <div className="ph" data-label={p.label} style={{ width: "100%", height: "100%" }} />
              <span className="cap">{p.cap}</span>
            </div>
          ))}
        </div>
        <div className="carousel-nav">
          <button onClick={() => scrollBy(-1)} aria-label="Previous">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <span>Scroll · Vuốt để xem thêm</span>
          <button onClick={() => scrollBy(1)} aria-label="Next">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}

/* ---------- Family sections ---------- */
function Family({ side, tweaks, reverse }) {
  const isGroom = side === "groom";
  const data = isGroom ? {
    eyebrow: "Nhà trai · Groom's Family",
    name: tweaks.groomName,
    nameEn: "The Chu Family",
    bio: "Cậu con trai lớn của gia đình, sinh ra và lớn lên tại Hà Nội. Nay chính thức trao gửi trái tim cho một nửa kia của cuộc đời.",
    hometown: "Hà Nội · Việt Nam",
    members: [
      { role: "Cha · Father", name: "Ông Chu Văn Anh", en: "Mr. Chu Van Anh" },
      { role: "Mẹ · Mother", name: "Bà Trần Thị Lan", en: "Mrs. Tran Thi Lan" },
      { role: "Anh trai · Brother", name: "Chu Đăng Khôi", en: "Chu Dang Khoi" },
    ],
    photoLabel: "Portrait · The Groom",
  } : {
    eyebrow: "Nhà gái · Bride's Family",
    name: tweaks.brideName,
    nameEn: "The Nguyen Family",
    bio: "Cô con gái út của gia đình, sinh ra và lớn lên tại Sài Gòn. Nay xin gửi trọn niềm tin và tình yêu cho người bạn đồng hành.",
    hometown: "TP. Hồ Chí Minh · Việt Nam",
    members: [
      { role: "Cha · Father", name: "Ông Nguyễn Văn Thiện", en: "Mr. Nguyen Van Thien" },
      { role: "Mẹ · Mother", name: "Bà Lê Thị Hương", en: "Mrs. Le Thi Huong" },
      { role: "Chị gái · Sister", name: "Nguyễn Thu Thảo", en: "Nguyen Thu Thao" },
    ],
    photoLabel: "Portrait · The Bride",
  };

  return (
    <section className={`family ${reverse ? "reverse" : ""}`} data-screen-label={isGroom ? "03a Groom's Family" : "03b Bride's Family"} id={isGroom ? "groom" : "bride"}>
      <div className="container">
        <div className="family-portrait reveal">
          <div className="ph" data-label={data.photoLabel} style={{ width: "100%", height: "100%" }} />
          <div className="sig">{isGroom ? "H" : "M"}</div>
        </div>
        <div className="family-info reveal d1">
          <span className="eyebrow">{data.eyebrow}</span>
          <h3>
            <em>{isGroom ? "Chú rể" : "Cô dâu"}</em><br/>
            {data.name}
          </h3>
          <p className="bio">{data.bio}</p>
          <div className="family-list">
            {data.members.map((m, i) => (
              <div key={i} className="row">
                <div className="role">{m.role}</div>
                <div className="name">
                  {m.name}
                  <span className="en">{m.en}</span>
                </div>
              </div>
            ))}
            <div className="row">
              <div className="role">Quê quán · Hometown</div>
              <div className="name">{data.hometown}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Wedding Info ---------- */
function WeddingInfo({ tweaks }) {
  const parts = formatDateParts(tweaks.weddingDate);
  return (
    <section className="info" data-screen-label="04 Wedding Info" id="details">
      <div className="info-bg-photos">
        <div className="ph l" data-label="Couple · Left" />
        <div className="ph r" data-label="Couple · Right" />
        <div className="ph l2" data-label="Moment" />
        <div className="ph r2" data-label="Moment" />
      </div>

      <div className="info-card reveal">
        <span className="corner tl" />
        <span className="corner tr" />
        <span className="corner bl" />
        <span className="corner br" />

        <img className="medallion-ink" src="assets/medallion-ink.png" alt="" />
        <p className="announce">Trân trọng báo tin</p>
        <p className="announce announce-en">We joyfully announce our wedding</p>

        <h2 className="names">
          {tweaks.brideShort}
          <span className="amp">&amp;</span>
          {tweaks.groomShort}
        </h2>

        <div className="divider" />

        <div className="date-big">
          <div className="d">{parts.dd}</div>
          <div className="mid">
            <span className="big">{parts.monthVn}</span>
            {parts.weekday} · {parts.weekdayEn}
          </div>
          <div className="d">{parts.yyyy}</div>
        </div>
        <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 18, color: "var(--muted)" }}>
          Hôn lễ bắt đầu lúc {tweaks.weddingTime}
        </div>

        <div className="divider" />

        <p className="location">
          Tại tư gia · {tweaks.venueName}
          <span className="addr">{tweaks.venueAddress}</span>
        </p>

        <div className="actions">
          <a href={tweaks.mapUrl} target="_blank" rel="noreferrer" className="btn btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 21s-7-8-7-13a7 7 0 0114 0c0 5-7 13-7 13z" strokeLinejoin="round"/>
              <circle cx="12" cy="8" r="2.5"/>
            </svg>
            Xem bản đồ
          </a>
          <a href={`tel:${tweaks.phone.replace(/\s/g,"")}`} className="btn btn-ghost">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7 12.8 12.8 0 00.7 2.8 2 2 0 01-.4 2.1L8 10a16 16 0 006 6l1.4-1.4a2 2 0 012.1-.4 12.8 12.8 0 002.8.7 2 2 0 011.7 2z" strokeLinejoin="round"/>
            </svg>
            {tweaks.phone}
          </a>
        </div>
      </div>
    </section>
  );
}

/* ---------- Timeline + Countdown ---------- */
function Timeline({ tweaks }) {
  const cd = useCountdown(tweaks.weddingDate);
  const items = [
    { time: "14:30", label: "Chụp ảnh gia đình", en: "Family photo session", img: "Moment · Photo" },
    { time: "15:00", label: "Đón khách", en: "Guest welcome", img: "Moment · Welcome" },
    { time: "16:30", label: "Bắt đầu buổi lễ", en: "Ceremony begins", img: "Moment · Ceremony" },
    { time: "17:00", label: "Trao nhẫn", en: "Ring exchange", img: "Moment · Vows" },
    { time: "18:00", label: "Khai tiệc", en: "Reception", img: "Moment · Toast" },
  ];
  return (
    <section className="timeline" data-screen-label="05 Timeline" id="timeline">
      <div className="container">
        <div className="timeline-head reveal">
          <span className="eyebrow">Timeline · Lịch trình</span>
          <h2>Một ngày <em>trọn vẹn</em></h2>
        </div>

        <div className="timeline-track">
          {items.map((it, i) => (
            <div key={i} className={`tl-item reveal ${i % 2 ? "alt" : ""}`}>
              <div className="side-time">
                <span className="t">{it.time}</span>
                <span className="label">{it.label}</span>
                <span className="en">{it.en}</span>
              </div>
              <div className="dot" />
              <div className="side-img">
                <div className="ph" data-label={it.img} />
              </div>
            </div>
          ))}
        </div>

        <div className="countdown-card reveal">
          <div className="lbl">Cùng đếm ngược đến ngày vui · Counting down</div>
          <div className="countdown-grid">
            <div className="cd-unit"><div className="n">{String(cd.d).padStart(3,"0")}</div><div className="u">Days</div></div>
            <div className="cd-unit"><div className="n">{String(cd.h).padStart(2,"0")}</div><div className="u">Hours</div></div>
            <div className="cd-unit"><div className="n">{String(cd.m).padStart(2,"0")}</div><div className="u">Minutes</div></div>
            <div className="cd-unit"><div className="n">{String(cd.s).padStart(2,"0")}</div><div className="u">Seconds</div></div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- RSVP ---------- */
function RSVP({ tweaks }) {
  const [form, setForm] = useState({
    name: "", phone: "", email: "",
    attend: "", guests: "1", side: "bride",
    dietary: "", message: "",
  });
  const [nameStatus, setNameStatus] = useState({ state: "idle", msg: "" });
  const [submitted, setSubmitted] = useState(false);
  const timerRef = useRef(null);

  // Fake API: check duplicate from localStorage list of already-submitted names
  const checkDuplicate = (name) => {
    clearTimeout(timerRef.current);
    if (!name.trim()) {
      setNameStatus({ state: "idle", msg: "" });
      return;
    }
    setNameStatus({ state: "checking", msg: "Đang kiểm tra trùng tên · Checking…" });
    timerRef.current = setTimeout(() => {
      const list = JSON.parse(localStorage.getItem("rsvp_names") || "[]");
      const dup = list.some((n) => n.trim().toLowerCase() === name.trim().toLowerCase());
      if (dup) {
        setNameStatus({ state: "error", msg: `"${name}" đã xác nhận trước đó. Bạn có muốn sửa lại? · already confirmed.` });
      } else {
        setNameStatus({ state: "ok", msg: "Tên hợp lệ · Name available" });
      }
    }, 700);
  };

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.attend) return;
    if (nameStatus.state === "error") return;
    const list = JSON.parse(localStorage.getItem("rsvp_names") || "[]");
    list.push(form.name);
    localStorage.setItem("rsvp_names", JSON.stringify(list));
    setSubmitted(true);
    setTimeout(() => document.getElementById("rsvp").scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  return (
    <section className="rsvp" data-screen-label="06 RSVP" id="rsvp">
      <div className="container">
        <div className="rsvp-head reveal">
          <img className="medallion-ink" src="assets/medallion-ink.png" alt="" />
          <span className="eyebrow">RSVP · Xác nhận tham dự</span>
          <h2>Cảm ơn bạn đã <em>đến với chúng em</em></h2>
          <p>
            Sự hiện diện của bạn là món quà quý giá nhất. Xin bạn vui lòng xác nhận
            trước ngày 25.10.2026 để chúng em chuẩn bị chu đáo.
          </p>
        </div>

        <form className="rsvp-form reveal d1" onSubmit={handleSubmit}>
          {submitted ? (
            <div className="success-card show">
              <div className="check">✓</div>
              <h3>Đã xác nhận</h3>
              <p>
                Cảm ơn {form.name}! Chúng em sẽ liên lạc lại với bạn sớm nhất.<br/>
                <em>See you on {formatDateParts(tweaks.weddingDate).dd}.{formatDateParts(tweaks.weddingDate).mm}.{formatDateParts(tweaks.weddingDate).yyyy}</em>
              </p>
            </div>
          ) : (
            <>
              {/* Attendance */}
              <div className="attend-toggle">
                <button type="button" className={form.attend === "yes" ? "active" : ""} onClick={() => update("attend", "yes")}>
                  Tham dự
                  <span className="sub">Yes, I'll be there</span>
                </button>
                <button type="button" className={form.attend === "no" ? "active" : ""} onClick={() => update("attend", "no")}>
                  Gửi lời chúc
                  <span className="sub">Can't make it</span>
                </button>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>Họ và tên · Full name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => { update("name", e.target.value); checkDuplicate(e.target.value); }}
                    placeholder="VD: Nguyễn Văn A"
                    required
                  />
                  {nameStatus.msg && (
                    <div className={`hint ${nameStatus.state === "error" ? "error" : nameStatus.state === "ok" ? "ok" : ""}`}>
                      <span className={`check-icon ${nameStatus.state === "checking" ? "checking" : nameStatus.state === "ok" ? "ok" : ""}`} />
                      {nameStatus.msg}
                    </div>
                  )}
                </div>
                <div className="form-field">
                  <label>Số điện thoại · Phone</label>
                  <input type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="09xx xxx xxx" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@example.com" />
                </div>
                <div className="form-field">
                  <label>Bạn là khách của · You're with</label>
                  <select value={form.side} onChange={(e) => update("side", e.target.value)}>
                    <option value="bride">Nhà gái · Bride's side</option>
                    <option value="groom">Nhà trai · Groom's side</option>
                    <option value="both">Cả hai · Both</option>
                  </select>
                </div>
              </div>

              {form.attend === "yes" && (
                <>
                  <div className="form-row">
                    <div className="form-field">
                      <label>Số người tham dự · Guests</label>
                      <select value={form.guests} onChange={(e) => update("guests", e.target.value)}>
                        <option value="1">1 người · Just me</option>
                        <option value="2">2 người · +1</option>
                        <option value="3">3 người</option>
                        <option value="4">4 người</option>
                      </select>
                    </div>
                    <div className="form-field">
                      <label>Yêu cầu ăn uống · Dietary</label>
                      <select value={form.dietary} onChange={(e) => update("dietary", e.target.value)}>
                        <option value="">Không có · None</option>
                        <option value="veg">Chay · Vegetarian</option>
                        <option value="halal">Halal</option>
                        <option value="allergy">Dị ứng · Allergy (please note)</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div className="form-row full">
                <div className="form-field">
                  <label>Lời nhắn · Message to the couple</label>
                  <textarea rows="3" value={form.message} onChange={(e) => update("message", e.target.value)} placeholder="Gửi đôi lời chúc phúc…" />
                </div>
              </div>

              <div className="dress-code">
                <div className="icon">♡</div>
                <div className="txt">
                  <h5>Dress code · Semi-formal</h5>
                  <p>
                    Tông màu gợi ý: kem, be, vàng ánh kim, burgundy — để cùng hoà vào không khí ấm áp của buổi tiệc.<br/>
                    <em>Suggested palette: cream, beige, gold, burgundy.</em>
                  </p>
                </div>
              </div>

              <div className="submit-row">
                <div className="legal">
                  Bằng việc xác nhận, bạn đồng ý để chúng em lưu thông tin phục vụ việc sắp xếp chỗ ngồi.
                </div>
                <button type="submit" className="btn btn-primary" disabled={!form.name || !form.attend || nameStatus.state === "error"}>
                  Xác nhận · Confirm
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </section>
  );
}

/* ---------- Nav + Music ---------- */
function Nav({ tweaks, musicOn, setMusicOn, visible }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <nav className={`nav ${visible ? "visible" : ""} ${scrolled ? "scrolled" : ""}`}>
      <a href="#home" className="brand">
        <img src="assets/medallion-ink.png" alt="" style={{ height: 32, width: "auto", maxWidth: 32, flexShrink: 0, display: "block" }} />
        <span>{tweaks.brideShort} &amp; {tweaks.groomShort}</span>
      </a>
      <div className="links">
        <a href="#story">Chuyện tình</a>
        <a href="#groom">Gia đình</a>
        <a href="#details">Thiệp mời</a>
        <a href="#timeline">Lịch trình</a>
        <a href="#rsvp">Xác nhận</a>
      </div>
      <button className={`music-btn ${musicOn ? "" : "muted"}`} onClick={() => setMusicOn(!musicOn)} title={tweaks.musicTrack}>
        <div className="bars"><span /><span /><span /></div>
      </button>
    </nav>
  );
}

/* ---------- Footer ---------- */
function Footer({ tweaks }) {
  const parts = formatDateParts(tweaks.weddingDate);
  return (
    <footer className="footer">
      <div className="names">{tweaks.brideShort} &amp; {tweaks.groomShort}</div>
      <div>{parts.dd}.{parts.mm}.{parts.yyyy} — {tweaks.venueName}</div>
      <div className="small">With love · Made for our beloved guests</div>
    </footer>
  );
}

/* ---------- Tweaks panel ---------- */
function TweaksPanel({ open, tweaks, setTweaks }) {
  const persist = (patch) => {
    setTweaks((t) => ({ ...t, ...patch }));
    window.parent.postMessage({ type: "__edit_mode_set_keys", edits: patch }, "*");
  };
  return (
    <div className={`tweaks-panel ${open ? "open" : ""}`}>
      <h4>Tweaks</h4>
      <div className="sub">Customize live</div>

      <label>Groom short name</label>
      <input type="text" value={tweaks.groomShort} onChange={(e) => persist({ groomShort: e.target.value })} />

      <label>Bride short name</label>
      <input type="text" value={tweaks.brideShort} onChange={(e) => persist({ brideShort: e.target.value })} />

      <label>Wedding date</label>
      <input type="date" value={tweaks.weddingDate} onChange={(e) => persist({ weddingDate: e.target.value })} />

      <label>Wedding time</label>
      <input type="text" value={tweaks.weddingTime} onChange={(e) => persist({ weddingTime: e.target.value })} />

      <label>Venue name</label>
      <input type="text" value={tweaks.venueName} onChange={(e) => persist({ venueName: e.target.value })} />

      <label>Background music track</label>
      <select value={tweaks.musicTrack} onChange={(e) => persist({ musicTrack: e.target.value })}>
        <option>Canon in D — Pachelbel</option>
        <option>A Thousand Years — Christina Perri</option>
        <option>Yêu Em Dài Lâu — Vũ</option>
        <option>Nơi Này Có Anh — Sơn Tùng M-TP</option>
        <option>La Vie En Rose — Édith Piaf</option>
      </select>
    </div>
  );
}

/* ---------- App ---------- */
function App() {
  const [tweaks, setTweaks] = useState(TWEAK_DEFAULTS);
  const [musicOn, setMusicOn] = useState(false);
  const [navVisible, setNavVisible] = useState(false);
  const [tweaksOpen, setTweaksOpen] = useState(false);

  useReveal();

  // Edit-mode host protocol
  useEffect(() => {
    const handler = (e) => {
      if (!e.data || typeof e.data !== "object") return;
      if (e.data.type === "__activate_edit_mode") setTweaksOpen(true);
      if (e.data.type === "__deactivate_edit_mode") setTweaksOpen(false);
    };
    window.addEventListener("message", handler);
    window.parent.postMessage({ type: "__edit_mode_available" }, "*");
    return () => window.removeEventListener("message", handler);
  }, []);

  return (
    <>
      <Nav tweaks={tweaks} musicOn={musicOn} setMusicOn={setMusicOn} visible={navVisible} />
      <GateHero tweaks={tweaks} onOpen={() => setNavVisible(true)} />
      <Details tweaks={tweaks} />
      <Family side="groom" tweaks={tweaks} reverse={false} />
      <Family side="bride" tweaks={tweaks} reverse={true} />
      <WeddingInfo tweaks={tweaks} />
      <Timeline tweaks={tweaks} />
      <RSVP tweaks={tweaks} />
      <Footer tweaks={tweaks} />
      <TweaksPanel open={tweaksOpen} tweaks={tweaks} setTweaks={setTweaks} />
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
