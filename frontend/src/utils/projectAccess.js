export function canDeleteProject(user, role, project) {
  if (!project || !user) return false;

  const ownerId = Number(project.created_by ?? project.createdBy);
  const userId = Number(user.id);

  if (role === 'Admin') return true;
  if (role === 'Project Manager' && ownerId === userId) return true;
  return false;
}
