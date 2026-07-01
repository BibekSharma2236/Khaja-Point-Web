import { useState } from 'react';
import { api } from '../api';
import { setToken } from '../authStore';
import logo from '../logo.svg';

export default function Register({ onAuthed }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.register({ name, email, password });
      setToken(data.token);
      onAuthed?.();
    } catch (err) {
      setError(err.message || 'Register failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="authFormShell">
      <div className="card authFormCard">
        <div className="authHeader">
          <img src={logo} alt="Khaja Point logo" className="authLogo" />
          <div>
            <h2>Register</h2>
            <p className="muted">Create your account and start ordering in minutes.</p>
          </div>
        </div>
        <form onSubmit={onSubmit} className="form">
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} type="text" required />
          </label>
          <label>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </label>
          <label>
            Password
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
          </label>
          {error ? <div className="error">{error}</div> : null}
          <button className="btn" disabled={loading}>{loading ? 'Creating...' : 'Create account'}</button>
        </form>
        <p className="muted">Demo admin: admin@khajapoint.local / admin123</p>
      </div>
    </div>
  );
}

