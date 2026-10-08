import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../AuthContext';

export default function Login() {
  const { user, login } = useAuth();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const redirectTo = location.state?.from || '/';

  // Already signed in (or just signed in): leave the login page
  if (user) return <Navigate to={redirectTo} replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reach the server. If it was idle, wait a few seconds and try again.');
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <h2>Sign in</h2>
          <p className="subtitle">Use the credentials provided by your admin</p>
        </div>
      </div>

      <form className="card" onSubmit={handleSubmit}>
        {error && <div className="alert alert-error">{error}</div>}

        <div className="form-group">
          <label>Username</label>
          <input
            required
            autoFocus
            autoComplete="username"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Password</label>
          <div className="input-with-toggle">
            <input
              required
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button type="button" className="input-toggle" onClick={() => setShow(s => !s)} title={show ? 'Hide password' : 'Show password'}>
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button className="btn" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
          {loading ? <><span className="spinner" /> Signing in…</> : 'Sign in'}
        </button>
      </form>
    </div>
  );
}