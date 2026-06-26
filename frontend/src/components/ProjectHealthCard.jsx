export default function ProjectHealthCard({ tasks, subtitle = 'Across your workspace' }) {
  const total = tasks.length || 1;
  const completed = tasks.filter((t) => t.status === 'Completed').length;
  const inProgress = tasks.filter((t) => t.status === 'In Progress').length;
  const todo = tasks.filter((t) => t.status === 'To Do').length;

  const completedPct = Math.round((completed / total) * 100);
  const progressPct = Math.round((inProgress / total) * 100);
  const todoPct = Math.max(0, 100 - completedPct - progressPct);

  return (
    <section className="bento-card bento-card--health">
      <header className="bento-card__header">
        <div>
          <h3>Task Status</h3>
          <p className="muted">{subtitle}</p>
        </div>
        <span className="muted">{tasks.length} tasks</span>
      </header>
      <div className="donut-wrap">
        <div
          className="donut"
          style={{
            background: `conic-gradient(
              var(--success) 0 ${completedPct}%,
              var(--primary) ${completedPct}% ${completedPct + progressPct}%,
              var(--warning) ${completedPct + progressPct}% 100%
            )`,
          }}
          role="img"
          aria-label={`${completedPct}% of tasks completed`}
        >
          <div className="donut__center">
            <strong>{completedPct}%</strong>
            <span>Complete</span>
          </div>
        </div>
        <ul className="donut-legend">
          <li><span className="dot dot--green" /> Completed <b>{completed}</b></li>
          <li><span className="dot dot--blue" /> In Progress <b>{inProgress}</b></li>
          <li><span className="dot dot--amber" /> To Do <b>{todo}</b></li>
        </ul>
      </div>
    </section>
  );
}
