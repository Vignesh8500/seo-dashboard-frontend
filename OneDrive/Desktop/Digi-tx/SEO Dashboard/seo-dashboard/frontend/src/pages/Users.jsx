import { useEffect, useState } from 'react';
import { Trash2, Copy, Check, RefreshCw } from 'lucide-react';
import api from '../api';
import { useAuth } from '../AuthContext';

// No look-alike characters (0/O, 1/l/I) so passwords are easy to read out
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

function generatePassword(length = 14) {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, v => ALPHABET[v % ALPHABET.length]).join('');
}

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ username: '', password: '', role: 'user' });
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(null); // { username, password, reset? }
  const [copied, setCopied] = useState(false);
  const [resetId, setResetId] = useState(null);
  const [resetPw, setResetPw] = useState('');

  function load() {
    api.get('/api/users')
      .then(res => setUsers(res.data))
      .catch(err => setError(err.response?.data?.message || 'Could not load users.'));
  }

  useEffect(load, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    setCreated(null);
    setCreating(true);
    try {
      await api.post('/api/users', form);
      setCreated({ username: form.username.trim().toLowerCase(), password: form.password });
      setForm({ username: '', password: '', role: 'user' });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create user.');
    } finally {
      setCreating(false);
    }
  }

  async function handleReset(u) {
    setError(null);
    try {
      await api.patch(`/api/users/${u.id}/password`, { password: resetPw });
      setCreated({ username: u.username, password: resetPw, reset: true });
      setResetId(null);
      setResetPw('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reset password.');
    }
  }

  async function handleDelete(u) {
    if (!window.confirm(`Delete user "${u.username}"? They will be signed out immediately.`)) return;
    setError(null);
    try {
      await api.delete(`/api/users/${u.id}`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete user.');
    }
  }

  async function copyCreds() {
    const text = `Login: ${window.location.origin}/login\nUsername: ${created.username}\nPassword: ${created.password}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy automatically. Select the text and copy it manually.');
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Users</h2>
          <p className="subtitle">Create accounts for your team and share the credentials with them</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {created && (
        <div className="alert alert-success">
          <strong>{created.reset ? 'Password reset' : 'Account created'}</strong> — share these details now. The password can't be shown again.
          <div className="cred-box">
            Login: {window.location.origin}/login<br />
            Username: {created.username}<br />
            Password: {created.password}
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={copyCreds}>
            {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy details</>}
          </button>
        </div>
      )}

      <form className="card" onSubmit={handleCreate} style={{ marginBottom: 16 }}>
        <div className="metric-label" style={{ marginBottom: 12 }}>Create a user</div>
        <div className="form-row">
          <div className="form-group">
            <label>Username</label>
            <input
              required
              minLength={3}
              autoComplete="off"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              placeholder="e.g. priya"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                required
                minLength={8}
                type="text"
                autoComplete="new-password"
                style={{ flex: 1, minWidth: 0 }}
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="At least 8 characters"
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                title="Generate a strong password"
                onClick={() => setForm(f => ({ ...f, password: generatePassword() }))}
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Role</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        <button className="btn" disabled={creating}>
          {creating ? <><span className="spinner" /> Creating…</> : 'Create user'}
        </button>
      </form>

      <div className="card">
        <div className="metric-label" style={{ marginBottom: 4 }}>Accounts</div>
        {!users && !error && <p className="subtitle">Loading…</p>}
        {users?.map(u => {
          const isMe = u.username === me.username;
          return (
            <div className="user-row" key={u.id}>
              <div>
                <span style={{ fontWeight: 600 }}>{u.username}</span>{' '}
                <span className={`role-badge ${u.role}`}>{u.role}</span>
                {isMe && <span className="subtitle" style={{ marginLeft: 8 }}>(you)</span>}
              </div>

              <div className="user-actions">
                {resetId === u.id ? (
                  <>
                    <input
                      className="inline-input"
                      type="text"
                      autoComplete="new-password"
                      placeholder="New password (8+)"
                      value={resetPw}
                      onChange={e => setResetPw(e.target.value)}
                    />
                    <button type="button" className="btn btn-secondary btn-sm" title="Generate" onClick={() => setResetPw(generatePassword())}>
                      <RefreshCw size={14} />
                    </button>
                    <button type="button" className="btn btn-sm" disabled={resetPw.length < 8} onClick={() => handleReset(u)}>Save</button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setResetId(null); setResetPw(''); }}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setResetId(u.id); setResetPw(''); }}>
                      Reset password
                    </button>
                    {!isMe && (
                      <button type="button" className="btn btn-secondary btn-sm" title="Delete user" onClick={() => handleDelete(u)}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}