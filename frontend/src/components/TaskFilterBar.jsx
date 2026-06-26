import { SORT_OPTIONS } from '../hooks/useTaskFilters';

const STATUSES = ['To Do', 'In Progress', 'Completed'];
const PRIORITIES = ['Low', 'Medium', 'High'];

// Horizontal filter controls shown above the Kanban board. Reads/writes the
// shared useTaskFilters state. `projects` is passed only on the global Tasks page.
export default function TaskFilterBar({ filters, projects = null }) {
  const {
    status, setStatus,
    priority, setPriority,
    assignee, setAssignee, assigneeOptions,
    project, setProject,
    sortBy, sortOrder, setSortValue,
    activeCount, clear,
  } = filters;

  return (
    <div className="task-filters" role="group" aria-label="Task filters">
      <select className="select-pill" aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">All statuses</option>
        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>

      <select className="select-pill" aria-label="Filter by priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
        <option value="">All priorities</option>
        {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>

      <select className="select-pill" aria-label="Filter by assignee" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
        <option value="">All assignees</option>
        {assigneeOptions.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>

      {projects && (
        <select className="select-pill" aria-label="Filter by project" value={project} onChange={(e) => setProject(e.target.value)}>
          <option value="all">All projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.project_name || p.name}</option>)}
        </select>
      )}

      <select className="select-pill" aria-label="Sort tasks" value={`${sortBy}:${sortOrder}`} onChange={(e) => setSortValue(e.target.value)}>
        {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      {activeCount > 0 && (
        <button type="button" className="btn btn--ghost btn--small task-filters__clear" onClick={clear}>
          Clear ({activeCount})
        </button>
      )}
    </div>
  );
}
