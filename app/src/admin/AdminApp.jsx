import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAdminConfig } from './components/useAdminConfig';
import Login from './Login';
import GeneralSettings from './sections/GeneralSettings';
import TextSettings from './sections/TextSettings';
import FamilySettings from './sections/FamilySettings';
import TimelineSettings from './sections/TimelineSettings';
import MediaManager from './sections/MediaManager';
import RSVPList from './sections/RSVPList';
import WishList from './sections/WishList';
import './admin.css';
import './admin-isolation.css';

const NAV_ITEMS = [
  { path: '/admin', label: 'Thông tin chung · General', icon: '&#9881;' },
  { path: '/admin/text', label: 'Nội dung · Text', icon: '&#9998;' },
  { path: '/admin/family', label: 'Gia đình · Family', icon: '&#9825;' },
  { path: '/admin/timeline', label: 'Lịch trình · Timeline', icon: '&#9737;' },
  { divider: true },
  { path: '/admin/media', label: 'Media · Ảnh & nhạc', icon: '&#9733;' },
  { divider: true },
  { path: '/admin/rsvp', label: 'Khách xác nhận · RSVP', icon: '&#9993;' },
  { path: '/admin/wishes', label: 'Lời chúc · Wishes', icon: '&#9734;' },
];

export default function AdminApp() {
  const [session, setSession] = useState(undefined); // undefined = loading
  const location = useLocation();
  const navigate = useNavigate();
  const adminConfig = useAdminConfig();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Trên điện thoại (≤ 768px) sidebar là ngăn kéo, mở bằng nút ☰ ở thanh trên.
  const [menuOpen, setMenuOpen] = useState(false);
  // Đổi trang thì đóng ngăn kéo
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);
  // Hai tab danh sách được rộng hơn các tab cài đặt (.admin-main.wide)
  const wide = location.pathname === '/admin/rsvp' || location.pathname === '/admin/wishes';

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  // Loading state
  if (session === undefined) {
    return (
      <div className="admin-login">
        <div style={{ color: '#A89996' }}>Loading…</div>
      </div>
    );
  }

  // Not logged in
  if (!session) {
    return <Login onLogin={() => {}} />;
  }

  // Determine which page to render based on path
  const renderPage = () => {
    const path = location.pathname;
    if (path === '/admin/text') return <TextSettings adminConfig={adminConfig} />;
    if (path === '/admin/family') return <FamilySettings />;
    if (path === '/admin/timeline') return <TimelineSettings />;
    if (path === '/admin/media') return <MediaManager />;
    if (path === '/admin/rsvp') return <RSVPList />;
    if (path === '/admin/wishes') return <WishList />;
    return <GeneralSettings adminConfig={adminConfig} />;
  };

  return (
    <div className="admin-layout">
      <header className="admin-topbar">
        <button
          type="button"
          className="admin-menu-btn"
          aria-label="Mở menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        >
          <span /><span /><span />
        </button>
        <nav className="admin-quicktabs" aria-label="Chuyển nhanh">
          <Link to="/admin/rsvp" className={location.pathname === '/admin/rsvp' ? 'active' : ''}>Khách xác nhận</Link>
          <Link to="/admin/wishes" className={location.pathname === '/admin/wishes' ? 'active' : ''}>Lời chúc</Link>
        </nav>
      </header>
      {menuOpen && <div className="admin-backdrop" onClick={() => setMenuOpen(false)} />}
      <aside className={`admin-sidebar${menuOpen ? ' open' : ''}`}>
        <div className="sidebar-header">
          <h2>Wedding Admin</h2>
          <a href="/" target="_blank" rel="noreferrer" className="site-link">
            Xem trang cưới &rarr;
          </a>
        </div>
        <nav>
          {NAV_ITEMS.map((item, i) =>
            item.divider ? (
              <div key={i} className="divider" />
            ) : (
              <Link
                key={item.path}
                to={item.path}
                className={location.pathname === item.path ? 'active' : ''}
                onClick={() => setMenuOpen(false)}
              >
                <span dangerouslySetInnerHTML={{ __html: item.icon }} />
                {item.label}
              </Link>
            )
          )}
        </nav>
        <div className="sidebar-footer">
          <div style={{ fontSize: 12, color: '#A89996', marginBottom: 8 }}>
            {session.user?.email}
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            Đăng xuất · Sign out
          </button>
        </div>
      </aside>
      <main className={`admin-main${wide ? ' wide' : ''}`}>
        {adminConfig.loading ? (
          <div style={{ color: '#A89996', padding: 40 }}>Loading config…</div>
        ) : (
          renderPage()
        )}
      </main>
    </div>
  );
}
