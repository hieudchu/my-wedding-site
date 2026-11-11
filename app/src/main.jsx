import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './styles/globals.css';
import './styles/sections.css';
import './styles/desktop.css';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import App from './App.jsx';
// Trang admin chỉ một người dùng — tách thành bundle riêng để 600 khách không
// phải tải code quản trị (MediaManager, bảng RSVP…) mà họ không bao giờ thấy.
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'));

// Trình phát nhạc kiểu "đĩa than" trên điện thoại/tablet.
// CSS khoá theo html[data-player="dia"]; desktop vẫn dùng giao diện cũ.
document.documentElement.setAttribute('data-player', 'dia');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/admin/*" element={<Suspense fallback={null}><AdminApp /></Suspense>} />
          <Route path="*" element={<App />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);
