const PRIORITY_CLASS = {
  Low: 'priority-low',
  Medium: 'priority-medium',
  High: 'priority-high',
};

const STATUS_CLASS = {
  'To Do': 'status-todo',
  'In Progress': 'status-progress',
  Completed: 'status-done',
};

function formatAssignees(task) {
  if (!task.assignees || task.assignees === '[]') return 'Unassigned';
  const list = Array.isArray(task.assignees) ? task.assignees : [];
  if (!list.length) return 'Unassigned';
  return list.map((a) => a.full_name).join(', ');
}

function getInitials(name = '') {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function TaskTableView({ tasks, onOpenTask, onStatusChange, canManageTasks }) {
  return (
    <div className="table-wrap task-table">
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Assignee</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Due Date</th>
          </tr>
        </thead>
        <tbody>
          {tasks.length === 0 ? (
            <tr>
              <td colSpan={5} className="muted table-empty">
                No tasks match your filters
              </td>
            </tr>
          ) : (
            tasks.map((task) => {
              const assignees = Array.isArray(task.assignees) ? task.assignees : [];
              const primary = assignees[0];
              return (
                <tr key={task.id} className="task-table__row" onClick={() => onOpenTask(task)}>
                  <td>
                    <strong>{task.title}</strong>
                    {task.description && <p className="muted table-desc">{task.description}</p>}
                  </td>
                  <td>
                    {primary ? (
                      <span className="table-assignee">
                        <span className="table-assignee__avatar">{getInitials(primary.full_name)}</span>
                        {primary.full_name}
                      </span>
                    ) : (
                      'Unassigned'
                    )}
                  </td>
                  <td>
                    <span className={`priority-badge ${PRIORITY_CLASS[task.priority] || ''}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <select
                      className={`table-select status-pill ${STATUS_CLASS[task.status] || ''}`}
                      value={task.status}
                      onChange={(e) => onStatusChange(task, e.target.value)}
                    >
                      {['To Do', 'In Progress', 'Completed'].map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{task.due_date ? new Date(task.due_date).toLocaleDateString() : '—'}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      <div className="table-footer muted">
        Showing {tasks.length} task{tasks.length === 1 ? '' : 's'}
      </div>
    </div>
  );
}
