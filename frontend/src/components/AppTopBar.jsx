import NotificationPanel from './NotificationPanel';
import ThemeToggle from './ThemeToggle';
import { CloseIcon, MenuIcon } from './Icons';

export default function AppTopBar({ connected, sidebarOpen, onMenuToggle }) {
  return (
    <header className="topbar">
      <div className="topbar__brand">
        <button
          type="button"
          className="topbar__menu-btn"
          onClick={onMenuToggle}
          aria-label={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={sidebarOpen}
          aria-controls="app-sidebar"
        >
          {sidebarOpen ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
        </button>
        <div className="topbar__brand-text">
          <strong>Velocity workspace</strong>
          <span className="muted">Task management</span>
        </div>
      </div>
      <div className="topbar__actions">
        <ThemeToggle />
        <NotificationPanel />
        <span
          className={`topbar__live ${connected ? 'is-live' : ''}`}
          title={connected ? 'Real-time connected' : 'Offline'}
        >
          {connected ? '● Live' : '○ Offline'}
        </span>
      </div>
    </header>
  );
}
