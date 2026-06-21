import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

const FEATURES = [
  { icon: '📋', text: 'Kanban & table views' },
  { icon: '🔔', text: 'Real-time notifications' },
  { icon: '👥', text: 'Role-based teamwork' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.login(email.trim(), password);
      login({
        token: response.token,
        user: response.user,
        mustResetPassword: response.mustResetPassword,
      });

      if (response.mustResetPassword) {
        navigate('/reset-password');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card auth-card--animated">
        <div className="auth-card__hero">
          <span className="navbar__logo auth-card__logo">TMS</span>
          <h1>Welcome back</h1>
          <p>Sign in to manage tasks, collaborate with your team, and track progress in real time.</p>
          <ul className="auth-features">
            {FEATURES.map((item) => (
              <li key={item.text}>
                <span>{item.icon}</span>
                {item.text}
              </li>
            ))}
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <h2>Sign in</h2>
          <p className="muted auth-form__subtitle">Enter your credentials to continue</p>
          {error && <div className="alert alert--error">{error}</div>}

          <label>
            Email
            <input
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@tms.com"
              autoComplete="email"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </label>

          <button type="submit" className="btn btn--primary btn--full btn--glow" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner spinner--inline" />
                Signing in…
              </>
            ) : (
              'Sign In →'
            )}
          </button>

          <div className="auth-hint auth-hint--box">
            <strong>Demo accounts</strong>
            <p>
              <code>sarah.j@tms.com</code> · PM &nbsp;|&nbsp; <code>emily.r@tms.com</code> · Collaborator
            </p>
            <p className="muted">Password: <code>Password@123</code></p>
          </div>
        </form>
      </div>
    </div>
  );
}
