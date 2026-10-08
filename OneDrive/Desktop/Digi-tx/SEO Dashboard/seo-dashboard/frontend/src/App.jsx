import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Users as UsersIcon } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './pages/Login';
import ClientList from './pages/ClientList';
import AddClient from './pages/AddClient';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';

function RequireAuth({ children, adminOnly = false }) {
  const { user, loading, bootError, retry } = useAuth();
  const location = useLocation();

  if (loading) return <p className="subtitle">Loading…</p>;

  if (bootError) {
    return (
      <div className="card" style={{ maxWidth: 480, margin: '8vh auto 0', textAlign: 'center' }}>
        <p>Can't reach the server right now.</p>
        <p className="subtitle">If it's been idle, it can take up to a minute to wake up.</p>
        <button className="btn" style={{ marginTop: 12 }} onClick={retry}>Try again</button>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

function Topbar({ theme, setTheme }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="topbar">
      <Link to="/" className="brand">
        <span className="dot" />
        <h1>SEO Command Center</h1>
      </Link>

      <div className="topbar-actions">
        {user?.role === 'admin' && (
          <Link to="/users" className="btn btn-secondary btn-sm"><UsersIcon size={14} /> Users</Link>
        )}
        {user && (
          <>
            <span className="user-chip">
              {user.username}
              <span className={`role-badge ${user.role}`}>{user.role}</span>
            </span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => { logout(); navigate('/login'); }}
            >
              <LogOut size={14} /> Log out
            </button>
          </>
        )}
        <ThemeToggle theme={theme} setTheme={setTheme} />
      </div>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="app-shell">
          <Topbar theme={theme} setTheme={setTheme} />
          <main>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<RequireAuth><ClientList /></RequireAuth>} />
              <Route path="/add" element={<RequireAuth adminOnly><AddClient /></RequireAuth>} />
              <Route path="/users" element={<RequireAuth adminOnly><Users /></RequireAuth>} />
              <Route path="/dashboard/:clientId" element={<RequireAuth><Dashboard /></RequireAuth>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}