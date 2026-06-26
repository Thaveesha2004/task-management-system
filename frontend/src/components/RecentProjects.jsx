import { Link } from 'react-router-dom';
import ProjectCard from './ProjectCard';

export default function RecentProjects({ projects, canCreateProjects = false }) {
  const recent = [...projects].slice(0, 3);

  if (!recent.length) {
    return (
      <section className="recent-work">
        <header className="recent-work__header">
          <h3>Your Projects</h3>
          <Link to="/projects" className="link-muted">View all</Link>
        </header>
        <div className="empty-state empty-state--inline">
          <p className="muted">
            {canCreateProjects
              ? 'No projects yet. Create one to start adding tasks.'
              : 'No projects yet. You will see projects here when you are added to one.'}
          </p>
          {canCreateProjects && (
            <Link to="/projects?create=1" className="btn btn--primary">
              + Create Project
            </Link>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="recent-work">
      <header className="recent-work__header">
        <h3>Your Projects</h3>
        <Link to="/projects" className="link-muted">View all</Link>
      </header>
      <div className="projects-grid projects-grid--compact">
        {recent.map((project, index) => (
          <ProjectCard key={project.id} project={project} index={index} />
        ))}
      </div>
    </section>
  );
}
