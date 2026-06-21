const PRIORITY_CLASS = {
  Low: 'priority-low',
  Medium: 'priority-medium',
  High: 'priority-high',
};

function formatAssignees(task) {
  const list = Array.isArray(task.assignees) ? task.assignees : [];
  if (!list.length) return null;
  return list.map((a) => a.full_name).join(', ');
}

function isOverdue(dueDate, status) {
  if (!dueDate || status === 'Completed') return false;
  const due = new Date(dueDate);
  due.setHours(23, 59, 59, 999);
  return due < new Date();
}

export default function TaskCard({
  task,
  onOpen,
  draggable = false,
  isDragging = false,
  onDragStart,
  onDragEnd,
  style,
}) {
  const assignees = formatAssignees(task);
  const overdue = isOverdue(task.due_date, task.status);

  return (
    <article
      className={`task-card task-card--${(task.priority || 'medium').toLowerCase()} ${isDragging ? 'task-card--dragging' : ''} ${overdue ? 'task-card--overdue' : ''}`}
      draggable={draggable}
      style={style}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(task)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onOpen(task);
      }}
    >
      <div className="task-card__accent" aria-hidden="true" />
      <div className="task-card__top">
        <span className={`priority-badge ${PRIORITY_CLASS[task.priority] || ''}`}>
          {task.priority}
        </span>
        {task.due_date && (
          <time dateTime={task.due_date} className={overdue ? 'task-card__due--overdue' : ''}>
            {overdue ? '⚠ ' : ''}
            {new Date(task.due_date).toLocaleDateString()}
          </time>
        )}
      </div>
      <h3>{task.title}</h3>
      {task.description && <p>{task.description}</p>}
      <div className="task-card__meta">
        <span className="task-card__id">#{task.id}</span>
        {assignees && (
          <span className="task-card__assignee" title={assignees}>
            👤 {assignees}
          </span>
        )}
      </div>
    </article>
  );
}
