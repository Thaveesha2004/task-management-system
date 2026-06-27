import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import AppTopBar from './AppTopBar';
import AssignmentAlert from './AssignmentAlert';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../context/AuthContext';
import { canOpenTask, getTaskPath } from '../utils/notificationNavigation';
import { api, startApiKeepAlive } from '../api';

export default function Layout() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { connected, liveNotifications, dismissLiveNotification } = useSocket(
    Boolean(token),
    token,
    user?.id // FE-1: lets the socket hook drop notifications addressed to someone else
  );

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setSidebarOpen((open) => !open), []);

  useEffect(() => {
    closeSidebar();
  }, [location.pathname, closeSidebar]);

  useEffect(() => {
    if (!sidebarOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeSidebar();
    };

    window.addEventListener('keydown', onKeyDown);
    document.body.classList.add('sidebar-drawer-open');

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.classList.remove('sidebar-drawer-open');
    };
  }, [sidebarOpen, closeSidebar]);

  useEffect(() => {
    if (!token) return undefined;
    return startApiKeepAlive();
  }, [token]);

  const openLiveNotification = async (item) => {
    if (canOpenTask(item)) {
      try {
        if (item.id && typeof item.id === 'number') {
          await api.markNotificationRead(item.id);
        }
      } catch {
        // continue to task page
      }
      navigate(getTaskPath(item));
    }
    dismissLiveNotification(item.id);
  };

  return (
    <div className="app-shell app-shell--workspace">
      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close navigation menu"
          onClick={closeSidebar}
        />
      )}
      <Sidebar isOpen={sidebarOpen} onNavigate={closeSidebar} onClose={closeSidebar} />
      <div className="app-main">
        <AppTopBar
          connected={connected}
          sidebarOpen={sidebarOpen}
          onMenuToggle={toggleSidebar}
        />
        <AssignmentAlert />
        <div className="toast-stack" role="status" aria-live="polite">
          {liveNotifications.map((item) => (
            <div
              key={item.id}
              className={`toast toast--${item.type || 'info'}${canOpenTask(item) ? ' toast--clickable' : ''}`}
              onClick={canOpenTask(item) ? () => openLiveNotification(item) : undefined}
              onKeyDown={
                canOpenTask(item)
                  ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openLiveNotification(item);
                      }
                    }
                  : undefined
              }
              role={canOpenTask(item) ? 'button' : undefined}
              tabIndex={canOpenTask(item) ? 0 : undefined}
            >
              <div>
                <strong>{item.title || 'Notification'}</strong>
                <span>{item.message || 'New update'}</span>
                {canOpenTask(item) && (
                  <span className="toast__action">Click to open task</span>
                )}
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  dismissLiveNotification(item.id);
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
