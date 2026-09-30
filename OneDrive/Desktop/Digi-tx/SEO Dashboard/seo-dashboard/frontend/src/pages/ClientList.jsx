import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, Trash2 } from 'lucide-react';
import api from '../api';

export default function ClientList() {
  const [clients, setClients] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  function loadClients() {
    api.get('/api/clients')
      .then(res => setClients(res.data))
      .catch(() => setError('Could not load clients. Is the backend running?'));
  }

  useEffect(loadClients, []);

  async function handleDelete(e, id, name) {
    e.stopPropagation();
    if (!window.confirm(`Delete "${name}"? This removes all stored data for this client.`)) return;
    await api.delete(`/api/clients/${id}`);
    loadClients();
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Clients</h2>
          <p className="subtitle">Select a client to view SEO performance, or add a new one</p>
        </div>
        <button className="btn" onClick={() => navigate('/add')}><Plus size={16} /> Add Client</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {!clients && !error && <p className="subtitle">Loading clients…</p>}

      {clients && clients.length === 0 && (
        <div className="empty-state card">
          <p>No clients added yet.</p>
          <button className="btn" style={{ marginTop: 12 }} onClick={() => navigate('/add')}>Add your first client</button>
        </div>
      )}

      {clients && clients.length > 0 && (
        <div className="client-list">
          {clients.map(c => (
            <div className="client-card" key={c.id} onClick={() => navigate(`/dashboard/${c.id}`)} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="client-name">{c.name}</div>
                <button
                  onClick={(e) => handleDelete(e, c.id, c.name)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 4 }}
                  title="Delete client"
                >
                  <Trash2 size={15} />
                </button>
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