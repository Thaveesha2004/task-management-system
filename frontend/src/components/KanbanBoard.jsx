import { useMemo, useState } from 'react';
import TaskCard from './TaskCard';

const COLUMNS = [
  { status: 'To Do', accent: 'todo', icon: '📋' },
  { status: 'In Progress', accent: 'progress', icon: '⚡' },
  { status: 'Completed', accent: 'done', icon: '✅' },
];

export default function KanbanBoard({ tasks, onOpenTask, onStatusChange }) {
  const [draggingId, setDraggingId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  const grouped = useMemo(() => {
    return COLUMNS.reduce((acc, col) => {
      acc[col.status] = tasks.filter((task) => task.status === col.status);
      return acc;
    }, {});
  }, [tasks]);

  const handleDrop = (status) => {
    if (!draggingId) return;
    const task = tasks.find((item) => item.id === draggingId);
    if (task && task.status !== status) {
      onStatusChange(task, status);
    }
    setDraggingId(null);
    setDropTarget(null);
  };

  return (
    <div className="kanban">
      {COLUMNS.map(({ status, accent, icon }) => (
        <section
          key={status}
          className={`kanban__column kanban__column--${accent} ${dropTarget === status ? 'kanban__column--drop' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDropTarget(status);
          }}
          onDragLeave={() => setDropTarget(null)}
          onDrop={(e) => {
            e.preventDefault();
            handleDrop(status);
          }}
        >
          <header>
            <div className="kanban__column-title">
              <span className="kanban__column-icon">{icon}</span>
              <h2>{status}</h2>
            </div>
            <span className="kanban__count">{grouped[status].length}</span>
          </header>
          <div className="kanban__list">
            {grouped[status].map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                onOpen={onOpenTask}
                draggable
                isDragging={draggingId === task.id}
                style={{ animationDelay: `${index * 0.05}s` }}
                onDragStart={() => setDraggingId(task.id)}
                onDragEnd={() => {
                  setDraggingId(null);
                  setDropTarget(null);
                }}
              />
            ))}
            {grouped[status].length === 0 && (
              <div className="kanban__empty">
                <span className="kanban__empty-icon">{icon}</span>
                <p>Drop tasks here</p>
              </div>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
