import { useState } from 'react';
import { api } from '../api';
import { setToken } from '../authStore';
import logo from '../logo.png';

export default function Login({ onAuthed }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(emailToUse, passwordToUse) {
    setError('');
    setLoading(true);
    try {
      const data = await api.login({ email: emailToUse || email, password: passwordToUse || password });
      setToken(data.token);
      onAuthed?.();
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    handleLogin(email, password);
  }

  function fillAdminDemo() {
    setEmail('admin@khajapoint.local');
    setPassword('admin123');
    handleLogin('admin@khajapoint.local', 'admin123');
  }

  return (
    <div className="authFormShell">
      <div className="card authFormCard">
        <div className="authHeader">
          <img src={logo} alt="Khaja Point logo" className="authLogo" />
          <div>
            <h2>Login</h2>
            <p className="muted">Access your dashboard and recent orders.</p>
          </div>
        </div>
        <form onSubmit={onSubmit} className="form">
          <label>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </label>
          <label>
            Password
            <div className="passwordInputWrap">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                required
              />
              <button
                type="button"
                className="passwordToggle"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          {error ? <div className="error">{error}</div> : null}

          <button className="btn" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>

          <div style={{ marginTop: 12, borderTop: '1px solid var(--border-glass)', paddingTop: 12 }}>
            <button
              type="button"
              className="btn btnGhost"
              style={{ width: '100%', fontSize: '0.85rem', color: 'var(--brand-primary)' }}
              onClick={fillAdminDemo}
            >
              🔑 Quick Admin Login (admin@khajapoint.local)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
