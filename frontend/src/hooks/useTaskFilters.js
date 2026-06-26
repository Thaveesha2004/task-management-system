import { useMemo, useState } from 'react';

// Shared task filtering/sorting used by both the global Tasks page and project
// detail, so the two views behave identically. Sorting is client-side here (works
// uniformly for board + table); priority/status sort by semantic rank, not text.
const PRIORITY_RANK = { High: 3, Medium: 2, Low: 1 };
const STATUS_RANK = { 'To Do': 1, 'In Progress': 2, Completed: 3 };

export const SORT_OPTIONS = [
  { value: 'created_at:desc', label: 'Newest first' },
  { value: 'created_at:asc', label: 'Oldest first' },
  { value: 'due_date:asc', label: 'Due date ↑' },
  { value: 'due_date:desc', label: 'Due date ↓' },
  { value: 'priority:desc', label: 'Priority high→low' },
  { value: 'priority:asc', label: 'Priority low→high' },
  { value: 'title:asc', label: 'Title A–Z' },
  { value: 'title:desc', label: 'Title Z–A' },
];

export function useTaskFilters(tasks, { withProject = false } = {}) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [assignee, setAssignee] = useState('');
  const [project, setProject] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Toggle order when clicking the same column header again (table view).
  const setSort = (field) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // "field:order" from the board's sort dropdown.
  const setSortValue = (value) => {
    const [f, o] = String(value).split(':');
    setSortBy(f);
    setSortOrder(o === 'asc' ? 'asc' : 'desc');
  };

  const clear = () => {
    setSearch('');
    setStatus('');
    setPriority('');
    setAssignee('');
    setProject('all');
  };

  const assigneeOptions = useMemo(() => {
    const map = new Map();
    (tasks || []).forEach((t) => {
      (Array.isArray(t.assignees) ? t.assignees : []).forEach((a) => {
        if (a && a.id != null && !map.has(a.id)) {
          map.set(a.id, a.full_name || a.email || `User ${a.id}`);
        }
      });
    });
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [tasks]);

  const activeCount = [
    search.trim() !== '',
    status !== '',
    priority !== '',
    assignee !== '',
    withProject && project !== 'all',
  ].filter(Boolean).length;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const dir = sortOrder === 'asc' ? 1 : -1;

    const matched = (tasks || []).filter((t) => {
      if (
        term &&
        !(
          t.title?.toLowerCase().includes(term) ||
          t.description?.toLowerCase().includes(term) ||
          t.project_name?.toLowerCase().includes(term)
        )
      ) {
        return false;
      }
      if (status && t.status !== status) return false;
      if (priority && t.priority !== priority) return false;
      if (
        assignee &&
        !(Array.isArray(t.assignees) && t.assignees.some((a) => String(a.id) === String(assignee)))
      ) {
        return false;
      }
      if (withProject && project !== 'all' && String(t.project_id) !== String(project)) return false;
      return true;
    });

    const num = (t, key) => (t[key] ? new Date(t[key]).getTime() : 0);
    const sorted = [...matched].sort((a, b) => {
      if (sortBy === 'title') {
        const av = (a.title || '').toLowerCase();
        const bv = (b.title || '').toLowerCase();
        return av < bv ? -dir : av > bv ? dir : 0;
      }
      let av;
      let bv;
      if (sortBy === 'priority') {
        av = PRIORITY_RANK[a.priority] || 0;
        bv = PRIORITY_RANK[b.priority] || 0;
      } else if (sortBy === 'status') {
        av = STATUS_RANK[a.status] || 0;
        bv = STATUS_RANK[b.status] || 0;
      } else if (sortBy === 'due_date') {
        av = num(a, 'due_date');
        bv = num(b, 'due_date');
      } else {
        av = num(a, 'created_at');
        bv = num(b, 'created_at');
      }
      return (av - bv) * dir;
    });

    return sorted;
  }, [tasks, search, status, priority, assignee, project, withProject, sortBy, sortOrder]);

  return {
    search, setSearch,
    status, setStatus,
    priority, setPriority,
    assignee, setAssignee,
    project, setProject,
    sortBy, sortOrder, setSort, setSortValue,
    clear, activeCount,
    filtered, assigneeOptions,
  };
}
