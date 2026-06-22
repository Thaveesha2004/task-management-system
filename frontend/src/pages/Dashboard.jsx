import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth, useRole } from '../context/AuthContext';
import KanbanBoard from '../components/KanbanBoard';
import TaskTableView from '../components/TaskTableView';
import TaskModal from '../components/TaskModal';
import StatCard from '../components/StatCard';

export default function Dashboard() {
  const { mustResetPassword, user } = useAuth();
  const { canManageTasks } = useRole();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [creating, setCreating] = useState(false);
  const [viewMode, setViewMode] = useState('kanban');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    assigned_to: '',
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.getTasks(filters);
      setTasks(response.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    const onTasksChanged = () => loadTasks();
    window.addEventListener('tms:tasks-changed', onTasksChanged);
    return () => window.removeEventListener('tms:tasks-changed', onTasksChanged);
  }, [loadTasks]);

  useEffect(() => {
    api.getTeamMembers().then((res) => setUsers(res.data || [])).catch(() => {});
  }, []);

  const handleStatusChange = async (task, status) => {
    try {
      if (canManageTasks) {
        await api.updateTask(task.id, {
          title: task.title,
          description: task.description,
          due_date: task.due_date ? task.due_date.slice(0, 10) : null,
          priority: task.priority,
          status,
          assignee_ids: Array.isArray(task.assignees)
            ? task.assignees.map((a) => a.id)
            : [],
        });
      } else {
        await api.updateTask(task.id, { status });
      }
      await loadTasks();
    } catch (err) {
      setError(err.message);
    }
  };

  const displayedTasks = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return tasks;
    return tasks.filter(
      (t) =>
        t.title?.toLowerCase().includes(term) ||
        t.description?.toLowerCase().includes(term)
    );
  }, [tasks, search]);

  const stats = useMemo(() => ({
    total: tasks.length,
    todo: tasks.filter((t) => t.status === 'To Do').length,
    inProgress: tasks.filter((t) => t.status === 'In Progress').length,
    done: tasks.filter((t) => t.status === 'Completed').length,
  }), [tasks]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  if (mustResetPassword) {
    return <Navigate to="/reset-password" replace />;
  }

  return (
    <div className="dashboard page-enter">
      <header className="page-header">
        <div>
          <h2>
            {greeting}, {user?.name?.split(' ')[0] || 'there'}
          </h2>
          <p className="muted">Here&apos;s what&apos;s happening with your projects today.</p>
        </div>
        <div className="page-header__actions">
          <input
            className="search-input search-input--header"
            placeholder="Search tasks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {canManageTasks && (
            <button type="button" className="btn btn--primary" onClick={() => setCreating(true)}>
              + New Task
            </button>
          )}
        </div>
      </header>

      {!loading && !error && (
        <div className="stats-row">
          <StatCard label="Total Tasks" value={stats.total} accent="indigo" icon="📋" />
          <StatCard label="In Progress" value={stats.inProgress} accent="blue" icon="🔄" />
          <StatCard label="Completed" value={stats.done} accent="green" icon="✓" />
          <StatCard label="To Do" value={stats.todo} accent="slate" icon="📝" />
        </div>
      )}

      <div className="filter-bar">
        <div className="view-toggle">
          <button
            type="button"
            className={viewMode === 'kanban' ? 'is-active' : ''}
            onClick={() => setViewMode('kanban')}
          >
            Board
          </button>
          <button
            type="button"
            className={viewMode === 'table' ? 'is-active' : ''}
            onClick={() => setViewMode('table')}
          >
            Table
          </button>
        </div>

        <div className="filter-bar__selects">
          <select
            className="select-pill"
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
          >
            <option value="">All statuses</option>
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>

          <select
            className="select-pill"
            value={filters.priority}
            onChange={(e) => setFilters((prev) => ({ ...prev, priority: e.target.value }))}
          >
            <option value="">All priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>

          <select
            className="select-pill"
            value={filters.assigned_to}
            onChange={(e) => setFilters((prev) => ({ ...prev, assigned_to: e.target.value }))}
          >
            <option value="">All assignees</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name || u.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="alert alert--error">{error}</div>}
      {loading ? (
        <div className="skeleton-board">
          {[1, 2, 3].map((col) => (
            <div key={col} className="skeleton-column">
              <div className="skeleton skeleton--title" />
              <div className="skeleton skeleton--card" />
            </div>
          ))}
        </div>
      ) : displayedTasks.length === 0 && !error ? (
        <div className="empty-state">
          <span className="empty-state__icon">📭</span>
          <h3>No tasks yet</h3>
          <p className="muted">Create your first task or adjust filters.</p>
          {canManageTasks && (
            <button type="button" className="btn btn--primary" onClick={() => setCreating(true)}>
              + Create Task
            </button>
          )}
        </div>
      ) : viewMode === 'kanban' ? (
        <KanbanBoard
          tasks={displayedTasks}
          onOpenTask={setSelectedTask}
          onStatusChange={handleStatusChange}
          onAddTask={canManageTasks ? () => setCreating(true) : undefined}
        />
      ) : (
        <TaskTableView
          tasks={displayedTasks}
          onOpenTask={setSelectedTask}
          onStatusChange={handleStatusChange}
          canManageTasks={canManageTasks}
        />
      )}

      {(creating || selectedTask) && (
        <TaskModal
          task={creating ? null : selectedTask}
          onClose={() => {
            setCreating(false);
            setSelectedTask(null);
          }}
          onSaved={loadTasks}
          onDeleted={loadTasks}
        />
      )}
    </div>
  );
}
