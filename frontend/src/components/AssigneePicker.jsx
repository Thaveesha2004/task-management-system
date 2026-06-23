import { useMemo, useState } from 'react';
import { CheckIcon } from './Icons';

function getInitials(name = '') {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function roleBadgeClass(role = '') {
  if (role === 'Admin') return 'role-badge--admin';
  if (role === 'Project Manager') return 'role-badge--pm';
  return 'role-badge--collab';
}

export default function AssigneePicker({ users, selectedIds, onToggle }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = users.filter((u) => u.is_active !== false && u.is_active !== 0);
    if (!term) return list;
    return list.filter(
      (u) =>
        (u.name || u.full_name || '').toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term) ||
        (u.role || '').toLowerCase().includes(term)
    );
  }, [users, search]);

  const selectedCount = selectedIds.length;

  return (
    <div className="assignee-picker">
      <div className="assignee-picker__header">
        <div>
          <strong>Assign team members</strong>
          <p className="muted">Select collaborators for this task</p>
        </div>
        <span className="assignee-picker__count">
          {selectedCount} selected
        </span>
      </div>

      <input
        type="search"
        className="search-input assignee-picker__search"
        placeholder="Search by name, email, or role…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="table-wrap assignee-picker__table">
        <table className="data-table data-table--selectable">
          <thead>
            <tr>
              <th scope="col" className="data-table__check-col" />
              <th scope="col">Member</th>
              <th scope="col">Email</th>
              <th scope="col">Role</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="data-table__empty muted">
                  No members match your search
                </td>
              </tr>
            ) : (
              filtered.map((member) => {
                const id = Number(member.id);
                const selected = selectedIds.some((item) => Number(item) === id);
                const name = member.name || member.full_name;
                const role = member.role || member.role_name || 'Collaborator';

                return (
                  <tr
                    key={member.id}
                    className={selected ? 'is-selected' : ''}
                    onClick={() => onToggle(member.id)}
                  >
                    <td className="data-table__check-col">
                      <span className={`data-table__check ${selected ? 'is-checked' : ''}`}>
                        {selected && <CheckIcon />}
                      </span>
                    </td>
                    <td>
                      <span className="table-user">
                        <span className="table-user__avatar">{getInitials(name)}</span>
                        <span className="table-user__name">{name}</span>
                      </span>
                    </td>
                    <td className="data-table__email">{member.email}</td>
                    <td>
                      <span className={`role-badge ${roleBadgeClass(role)}`}>{role}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
