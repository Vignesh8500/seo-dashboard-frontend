import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, Trash2, Clock } from 'lucide-react';
import api from '../api';
import { useAuth } from '../AuthContext';

const RECENT_KEY = 'seo-dashboard-recent-clients';
const MAX_RECENT = 5;

export function addToRecentClients(clientId, clientName) {
  try {
    const existing = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    const filtered = existing.filter(c => c.id !== clientId);
    const updated = [{ id: clientId, name: clientName, visitedAt: Date.now() }, ...filtered].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Could not save recent client:', e);
  }
}

function getRecentClients() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

export default function ClientList() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [clients, setClients] = useState(null);
  const [error, setError] = useState(null);
  const [recent, setRecent] = useState([]);
  const navigate = useNavigate();

  function loadClients() {
    api.get('/api/clients')
      .then(res => setClients(res.data))
      .catch(() => setError('Could not load clients. Is the backend running?'));
  }

  useEffect(() => {
    loadClients();
    setRecent(getRecentClients());
  }, []);

  async function handleDelete(e, id, name) {
    e.stopPropagation();
    if (!window.confirm(`Delete "${name}"? This removes all stored data for this client.`)) return;
    try {
      await api.delete(`/api/clients/${id}`);
      loadClients();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete client.');
    }
  }

  // Only show recent entries that still exist
  const visibleRecent = clients
    ? recent.filter(r => clients.some(c => String(c.id) === String(r.id)))
    : [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Clients</h2>
          <p className="subtitle">Select a client to view SEO performance</p>
        </div>
        {isAdmin && (
          <button className="btn" onClick={() => navigate('/add')}><Plus size={16} /> Add Client</button>
        )}
      </div>

      {visibleRecent.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Clock size={13} /> Recently viewed
          </div>
          <div className="client-list">
            {visibleRecent.map(r => (
              <div className="client-card" key={r.id} onClick={() => navigate(`/dashboard/${r.id}`)} style={{ cursor: 'pointer' }}>
                <div className="client-name">{r.name}</div>
                <span className="status-pill status-verified">Recent</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}
      {!clients && !error && <p className="subtitle">Loading clients…</p>}

      {clients && clients.length === 0 && (
        <div className="empty-state card">
          <p>No clients have been added yet.</p>
          {isAdmin ? (
            <button className="btn" style={{ marginTop: 12 }} onClick={() => navigate('/add')}>Add your first client</button>
          ) : (
            <p className="subtitle">Ask an admin to add one.</p>
          )}
        </div>
      )}

      {clients && clients.length > 0 && (
        <div className="client-list">
          {clients.map(c => (
            <div className="client-card" key={c.id} onClick={() => navigate(`/dashboard/${c.id}`)} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="client-name">{c.name}</div>
                {isAdmin && (
                  <button
                    onClick={(e) => handleDelete(e, c.id, c.name)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 4 }}
                    title="Delete client"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
              <span className={`status-pill ${c.status === 'verified' ? 'status-verified' : 'status-pending'}`}>
                {c.status}
              </span>
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', color: 'var(--text-dim)' }}>
                <ChevronRight size={16} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}