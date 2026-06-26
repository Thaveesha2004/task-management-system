const PRIORITY_CLASS = {
  High: 'pill--danger',
  Medium: 'pill--warning',
  Low: 'pill--success',
};

// Relative, human due label + urgency tone so the list reads as "what's due next".
function dueMeta(due) {
  if (!due) return { label: 'No due date', tone: 'none' };
  const d = new Date(due);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d - today) / 86400000);
  if (diff < 0) return { label: `Overdue by ${Math.abs(diff)}d`, tone: 'overdue' };
  if (diff === 0) return { label: 'Due today', tone: 'soon' };
  if (diff === 1) return { label: 'Due tomorrow', tone: 'soon' };
  if (diff <= 7) return { label: `Due in ${diff} days`, tone: 'soon' };
  return {
    label: `Due ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
    tone: 'later',
  };
}

export default function UpcomingTasks({ tasks, onOpenTask, projectMap = {} }) {
  const upcoming = [...tasks]
    .filter((t) => t.status !== 'Completed')
    .sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date) - new Date(b.due_date);
    })
    .slice(0, 5);

  const overdueCount = upcoming.filter((t) => dueMeta(t.due_date).tone === 'overdue').length;

  return (
    <section className="bento-card bento-card--list">
      <header className="bento-card__header">
        <div>
          <h3>Upcoming deadlines</h3>
          <p className="muted">Nearest due dates across your projects</p>
        </div>
        {overdueCount > 0 && (
          <span className="pill pill--danger">{overdueCount} overdue</span>
        )}
      </header>
      <ul className="upcoming-list">
        {upcoming.length === 0 ? (
          <li className="muted upcoming-list__empty">Nothing due — you&apos;re all caught up.</li>
        ) : (
          upcoming.map((task) => {
            const meta = dueMeta(task.due_date);
            const project = projectMap[task.project_id];
            return (
              <li key={task.id}>
                <button type="button" className="upcoming-item" onClick={() => onOpenTask(task)}>
                  <span className="upcoming-item__main">
                    <strong>{task.title}</strong>
                    <span className="upcoming-item__meta">
                      {project && <span className="upcoming-item__project">{project}</span>}
                      <time className={`upcoming-item__due upcoming-item__due--${meta.tone}`}>{meta.label}</time>
                    </span>
                  </span>
                  <span className={`pill ${PRIORITY_CLASS[task.priority] || 'pill--soft'}`}>
                    {task.priority}
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}
