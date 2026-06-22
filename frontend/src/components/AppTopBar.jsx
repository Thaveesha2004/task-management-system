import NotificationPanel from './NotificationPanel';

export default function AppTopBar({ connected }) {
  return (
    <header className="topbar">
      <div className="topbar__spacer" />
      <div className="topbar__actions">
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
