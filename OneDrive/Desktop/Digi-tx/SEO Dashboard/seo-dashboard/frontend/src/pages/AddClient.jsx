import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function AddClient() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', ga4PropertyId: '', gscSiteUrl: '', semrushDomain: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post('/api/clients', form);
      navigate(`/dashboard/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Check the values and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h2>Add a client</h2>
          <p className="subtitle">We'll verify each connection before saving</p>
        </div>
      </div>

      <form className="card" onSubmit={handleSubmit}>
        {error && <div className="alert alert-error">{error}</div>}

        <div className="form-group">
          <label>Client name</label>
          <input required value={form.name} onChange={e => update('name', e.target.value)} placeholder="Acme Corp" />
        </div>

        <div className="form-group">
          <label>GA4 Property ID</label>
          <input required value={form.ga4PropertyId} onChange={e => update('ga4PropertyId', e.target.value)} placeholder="123456789" />
          <p className="form-hint">GA4 Admin → Property Settings → Property ID</p>
        </div>

        <div className="form-group">
          <label>Search Console Site URL</label>
          <input required value={form.gscSiteUrl} onChange={e => update('gscSiteUrl', e.target.value)} placeholder="https://www.clientsite.com/" />
          <p className="form-hint">Must match exactly as shown in Search Console</p>
        </div>

        <div className="form-group">
            <label>Semrush Domain <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(optional)</span></label>
            <input value={form.semrushDomain} onChange={e => update('semrushDomain', e.target.value)} placeholder="clientsite.com — leave blank if not on your plan" />
            <p className="form-hint">Requires an API-enabled Semrush plan. Leave blank if you don't have one yet.</p>
        </div>

        <button className="btn" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
          {loading ? <><span className="spinner" /> Verifying connections…</> : 'Verify & Add Client'}
        </button>
      </form>
    </div>
  );
}