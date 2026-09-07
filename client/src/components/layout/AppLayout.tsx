import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { OnboardingModal } from '../onboarding/OnboardingModal';
import './AppLayout.css';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  // On tablets (768px - 1024px), default to collapsed for extra working space
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return window.innerWidth > 768 && window.innerWidth <= 1024;
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  // Automatically close mobile sidebar when navigating to a new route
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Handle window resizing: close mobile drawer if screen becomes large
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 900 && mobileOpen) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mobileOpen]);

  const handleMenuClick = () => {
    if (window.innerWidth <= 900) {
      setMobileOpen((prev) => !prev);
    } else {
      setSidebarCollapsed((prev) => !prev);
    }
  };

  return (
    <div className={`app-layout ${sidebarCollapsed ? 'sidebar-is-collapsed' : ''}`}>
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="app-main">
        <TopBar onMenuClick={handleMenuClick} />
        <main className="app-content">
          <Outlet />
        </main>
      </div>

      {/* Global Onboarding Welcome Modal */}
      <OnboardingModal />
    </div>
  );
};