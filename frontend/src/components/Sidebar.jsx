import { Link, useLocation } from 'react-router-dom';
import { useAuth, useRole } from '../context/AuthContext';

function getInitials(name = '') {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const NAV = [
  { to: '/', label: 'Dashboard', icon: '▦' },
  { to: '/', label: 'My Tasks', icon: '☑', match: '/' },
  { to: '/admin', label: 'Team', icon: '👥', adminOnly: true },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { canViewAdmin } = useRole();
  const location = useLocation();

  const isActive = (item) => {
    if (item.to === '/admin') return location.pathname.startsWith('/admin');
    return location.pathname === '/' && item.label === 'Dashboard';
  };

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__logo" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <div>
          <strong>Taskora</strong>
          <span>Workspace</span>
        </div>
      </div>

      <nav className="sidebar__nav">
        {NAV.filter((item) => !item.adminOnly || canViewAdmin).map((item) => (
          <Link
            key={item.label}
            to={item.to}
            className={`sidebar__link ${isActive(item) ? 'is-active' : ''}`}
          >
            <span className="sidebar__link-icon" aria-hidden="true">
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__profile">
          <span className="sidebar__avatar">{getInitials(user?.name)}</span>
          <div>
            <strong>{user?.name}</strong>
            <span>{user?.role}</span>
          </div>
        </div>
        <button type="button" className="sidebar__logout" onClick={logout}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
