import { useTheme } from '../context/ThemeContext';
import { MoonIcon, SunIcon } from './Icons';

export default function ThemeToggle({ className = '' }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className={`theme-switch ${className}`.trim()}
      role="group"
      aria-label="Color theme"
    >
      <button
        type="button"
        className={`theme-switch__btn ${theme === 'light' ? 'is-active' : ''}`}
        onClick={() => setTheme('light')}
        aria-label="Light mode"
        title="Light mode"
      >
        <SunIcon size={16} />
      </button>
      <button
        type="button"
        className={`theme-switch__btn ${theme === 'dark' ? 'is-active' : ''}`}
        onClick={() => setTheme('dark')}
        aria-label="Dark mode"
        title="Dark mode"
      >
        <MoonIcon size={16} />
      </button>
    </div>
  );
}
