function getInitials(name = '') {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function AvatarStack({ assignees = [], max = 3 }) {
  if (!assignees.length) {
    return <span className="avatar-stack avatar-stack--empty muted">Unassigned</span>;
  }

  const visible = assignees.slice(0, max);
  const overflow = assignees.length - max;

  return (
    <span className="avatar-stack">
      <span className="avatar-stack__faces">
        {visible.map((person) => (
          <span
            key={person.id || person.full_name}
            className="avatar-stack__avatar"
            title={person.full_name || person.name}
          >
            {getInitials(person.full_name || person.name)}
          </span>
        ))}
      </span>
      <span className="avatar-stack__label">
        {visible.map((p) => p.full_name || p.name).join(', ')}
        {overflow > 0 ? ` +${overflow}` : ''}
      </span>
    </span>
  );
}
