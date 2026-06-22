import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api';
import { useRole } from '../context/AuthContext';

const ROLES = ['Admin', 'Project Manager', 'Collaborator'];
const ROLE_FILTERS = ['All Members', 'Admins', 'PMs', 'Collaborators'];

function getInitials(name = '') {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function roleBadgeClass(role) {
  if (role === 'Admin') return 'role-badge--admin';
  if (role === 'Project Manager') return 'role-badge--pm';
  return 'role-badge--collab';
}

export default function AdminUsers() {
  const { canViewAdmin } = useRole();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', role: 'Collaborator' });
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All Members');
  const [showInvite, setShowInvite] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await api.getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canViewAdmin) loadUsers();
  }, [canViewAdmin]);

  const filteredUsers = useMemo(() => {
    let list = users;
    const term = search.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (user) =>
          (user.name || user.full_name || '').toLowerCase().includes(term) ||
          user.email.toLowerCase().includes(term)
      );
    }
    if (roleFilter === 'Admins') {
      list = list.filter((u) => (u.role || u.role_name) === 'Admin');
    } else if (roleFilter === 'PMs') {
      list = list.filter((u) => (u.role || u.role_name) === 'Project Manager');
    } else if (roleFilter === 'Collaborators') {
      list = list.filter((u) => (u.role || u.role_name) === 'Collaborator');
    }
    return list;
  }, [users, search, roleFilter]);

  if (!canViewAdmin) {
    return <Navigate to="/" replace />;
  }

  const resetForm = () => {
    setForm({ name: '', email: '', role: 'Collaborator' });
    setEditId(null);
    setShowInvite(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      if (editId) {
        await api.updateUser(editId, form);
        setMessage('User updated successfully.');
      } else {
        const result = await api.createUser(form);
        setMessage(result.message || `User created. Welcome email sent to ${form.email}.`);
      }
      resetForm();
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const startEdit = (user) => {
    setEditId(user.id);
    setShowInvite(true);
    setForm({
      name: user.name || user.full_name,
      email: user.email,
      role: user.role || user.role_name,
    });
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('Deactivate this user?')) return;
    try {
      await api.deactivateUser(id);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleActivate = async (id) => {
    try {
      await api.activateUser(id);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="admin-page page-enter">
      <header className="page-header page-header--split">
        <div>
          <h2>User Management</h2>
          <p className="muted">Oversee workspace access, roles, and member activity.</p>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => {
            resetForm();
            setShowInvite(true);
          }}
        >
          + Invite User
        </button>
      </header>

      <div className="admin-toolbar">
        <div className="role-filters">
          {ROLE_FILTERS.map((label) => (
            <button
              key={label}
              type="button"
              className={`role-filter ${roleFilter === label ? 'is-active' : ''}`}
              onClick={() => setRoleFilter(label)}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          className="search-input"
          placeholder="Search team members…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <div className="alert alert--error">{error}</div>}
      {message && <div className="alert alert--success">{message}</div>}

      {showInvite && (
        <form className="panel panel--invite" onSubmit={handleSubmit}>
          <h3>{editId ? 'Edit User' : 'Invite User'}</h3>
          <div className="form-grid form-grid--3">
            <label>
              Full name
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                required
              />
            </label>
            <label>
              Role
              <select
                value={form.role}
                onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-actions-inline">
            <button type="submit" className="btn btn--primary">
              {editId ? 'Save Changes' : 'Send Invite'}
            </button>
            <button type="button" className="btn btn--ghost" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <section className="panel panel--flush">
        {loading ? (
          <p className="muted panel__padding">Loading users…</p>
        ) : (
          <div className="table-wrap admin-table">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const role = user.role || user.role_name;
                  const active = user.is_active !== false && user.is_active !== 0;
                  return (
                    <tr key={user.id}>
                      <td>
                        <span className="table-assignee">
                          <span className="table-assignee__avatar">{getInitials(user.name || user.full_name)}</span>
                          {user.name || user.full_name}
                        </span>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`role-badge ${roleBadgeClass(role)}`}>{role}</span>
                      </td>
                      <td>
                        <span className={`status-dot ${active ? 'is-active' : ''}`}>
                          {active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="table-actions">
                        <button type="button" className="btn btn--ghost btn--small" onClick={() => startEdit(user)}>
                          Edit
                        </button>
                        {active ? (
                          <button
                            type="button"
                            className="btn btn--ghost btn--small"
                            onClick={() => handleDeactivate(user.id)}
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn--ghost btn--small"
                            onClick={() => handleActivate(user.id)}
                          >
                            Activate
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="table-footer muted">
              Showing {filteredUsers.length} of {users.length} members
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
