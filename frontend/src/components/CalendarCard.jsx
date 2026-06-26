import { useMemo, useState } from 'react';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const PRIORITY_RANK = { High: 3, Medium: 2, Low: 1 };

// Parse a date-only ("YYYY-MM-DD") value as a LOCAL date so the day never
// shifts across timezones; fall back to native parsing for full timestamps.
function parseDate(value) {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
}

function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d, n) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export default function CalendarCard({
  tasks,
  onOpenTask,
  projectMap = {},
  title = 'Calendar',
  subtitle = 'Tasks by due date',
}) {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(() => ymd(new Date()));

  // Bucket tasks (with a due date) by their local YYYY-MM-DD key.
  const byDay = useMemo(() => {
    const map = {};
    (tasks || []).forEach((t) => {
      const d = parseDate(t.due_date);
      if (!d) return;
      const key = ymd(d);
      (map[key] = map[key] || []).push(t);
    });
    return map;
  }, [tasks]);

  // 6 weeks x 7 days, Monday-first, covering the visible month.
  const cells = useMemo(() => {
    const first = startOfMonth(month);
    const offset = (first.getDay() + 6) % 7; // Monday = 0
    const start = new Date(first);
    start.setDate(first.getDate() - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [month]);

  const monthLabel = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const todayKey = ymd(today);

  const selectedDate = parseDate(selected);
  const selectedTasks = (byDay[selected] || [])
    .slice()
    .sort((a, b) => (PRIORITY_RANK[b.priority] || 0) - (PRIORITY_RANK[a.priority] || 0));

  return (
    <section className="bento-card bento-card--calendar">
      <header className="bento-card__header">
        <div>
          <h3>{title}</h3>
          <p className="muted">{subtitle}</p>
        </div>
        <div className="cal-nav">
          <button type="button" aria-label="Previous month" onClick={() => setMonth(addMonths(month, -1))}>‹</button>
          <span className="cal-nav__label">{monthLabel}</span>
          <button type="button" aria-label="Next month" onClick={() => setMonth(addMonths(month, 1))}>›</button>
        </div>
      </header>

      <div className="cal-grid cal-grid--head" aria-hidden="true">
        {WEEKDAYS.map((w) => <span key={w} className="cal-weekday">{w}</span>)}
      </div>

      <div className="cal-grid cal-grid--days">
        {cells.map((d) => {
          const key = ymd(d);
          const inMonth = d.getMonth() === month.getMonth();
          const dayTasks = byDay[key] || [];
          return (
            <button
              type="button"
              key={key}
              className={[
                'cal-cell',
                inMonth ? '' : 'cal-cell--out',
                key === todayKey ? 'cal-cell--today' : '',
                key === selected ? 'cal-cell--sel' : '',
              ].join(' ').trim()}
              onClick={() => setSelected(key)}
              aria-label={`${d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}, ${dayTasks.length} task${dayTasks.length === 1 ? '' : 's'} due`}
            >
              <span className="cal-cell__num">{d.getDate()}</span>
              {dayTasks.length > 0 && (
                <span className="cal-cell__dots">
                  {dayTasks.slice(0, 3).map((t, i) => (
                    <span key={i} className={`cal-dot cal-dot--${(t.priority || 'medium').toLowerCase()}`} />
                  ))}
                  {dayTasks.length > 3 && <span className="cal-cell__more">+{dayTasks.length - 3}</span>}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="cal-detail">
        <p className="cal-detail__title">
          {selectedDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          {selectedTasks.length > 0 && (
            <span className="muted"> · {selectedTasks.length} due</span>
          )}
        </p>
        {selectedTasks.length === 0 ? (
          <p className="muted cal-detail__empty">No tasks due this day.</p>
        ) : (
          <ul className="cal-detail__list">
            {selectedTasks.map((t) => (
              <li key={t.id}>
                <button type="button" className="cal-detail__item" onClick={() => onOpenTask(t)}>
                  <span className={`cal-dot cal-dot--${(t.priority || 'medium').toLowerCase()}`} />
                  <span className="cal-detail__name">{t.title}</span>
                  {projectMap[t.project_id] && (
                    <span className="cal-detail__project">{projectMap[t.project_id]}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
