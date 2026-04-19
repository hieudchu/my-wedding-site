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
import './admin.css';

const NAV_ITEMS = [
  { path: '/admin', label: 'Thông tin chung · General', icon: '&#9881;' },
  { path: '/admin/text', label: 'Nội dung · Text', icon: '&#9998;' },
  { path: '/admin/family', label: 'Gia đình · Family', icon: '&#9825;' },
  { path: '/admin/timeline', label: 'Lịch trình · Timeline', icon: '&#9737;' },
  { divider: true },
  { path: '/admin/media', label: 'Media · Ảnh & nhạc', icon: '&#9733;' },
  { divider: true },
  { path: '/admin/rsvp', label: 'RSVP · Khách mời', icon: '&#9993;' },
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
    return <GeneralSettings adminConfig={adminConfig} />;
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
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
      <main className="admin-main">
        {adminConfig.loading ? (
          <div style={{ color: '#A89996', padding: 40 }}>Loading config…</div>
        ) : (
          renderPage()
        )}
      </main>
    </div>
  );
}
