import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api';

const STATUS_LABEL = { draft: 'Draft', sending: 'Sending…', sent: '✓ Sent', failed: 'Needs retry', discarded: 'Discarded' };

const fmt = s => (s ? new Date(`${s}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '');
const errText = err =>
  err.response?.data?.message || (err.response ? `Server returned ${err.response.status}.` : 'Cannot reach the backend.');

const store = {
  get: (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
};

function Toggle({ checked, onChange, disabled, label }) {
  return (
    <label className="switch-row">
      <span className="switch">
        <input type="checkbox" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} />
        <span className="switch-track" />
      </span>
      <span>{label}</span>
    </label>
  );
}

function DeliveryTag({ name, info }) {
  if (!info?.status) return null;
  const ok = info.status === 'sent';
  return (
    <p className="form-hint">
      <span className={`tag ${ok ? 'tag-ok' : 'tag-bad'}`}>{ok ? '✓' : '!'} {name} {ok ? 'sent' : 'failed'}</span>
      {info.at ? ` ${new Date(info.at).toLocaleString()}` : ''}
      {info.error ? ` — ${info.error}` : ''}
    </p>
  );
}

function DigestCard({ digest, testing, testEmail, testSlack, onChanged, setNotice }) {
  const editable = digest.status === 'draft' || digest.status === 'failed';
  const [slackText, setSlackText] = useState(digest.slackText || '');
  const [emailSubject, setEmailSubject] = useState(digest.emailSubject || '');
  const [emailBody, setEmailBody] = useState(digest.emailBody || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const dirty =
    slackText !== (digest.slackText || '') ||
    emailSubject !== (digest.emailSubject || '') ||
    emailBody !== (digest.emailBody || '');

  const save = () => api.patch(`/api/digests/${digest.id}`, { slackText, emailSubject, emailBody });

  async function run(action) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  }

  const targets = [
    digest.slackConfigured ? 'Slack' : null,
    digest.emailCount > 0 ? `${digest.emailCount} email recipient${digest.emailCount > 1 ? 's' : ''}` : null,
  ].filter(Boolean);

  const approve = () => {
    if (!window.confirm(`Send this REAL report to ${targets.join(' and ')} for ${digest.clientName}?`)) return;
    run(async () => {
      if (dirty) await save();
      const res = await api.post(`/api/digests/${digest.id}/approve`, {});
      setNotice(res.data.status === 'sent' ? `Sent for ${digest.clientName}.` : `Some channels failed for ${digest.clientName}. See the card for details.`);
      await onChanged();
    });
  };

  const sendTest = () => {
    if (!testEmail.trim() && !testSlack) {
      setError('Enter a test email address in the Testing panel above, or tick the Slack option.');
      return;
    }
    run(async () => {
      if (dirty) { await save(); await onChanged(); }
      const res = await api.post(`/api/digests/${digest.id}/test-send`, { email: testEmail.trim(), slack: testSlack });
      const parts = Object.entries(res.data).map(([k, v]) => `${k}: ${v}`);
      setNotice(`Test for ${digest.clientName} → ${parts.join(', ')}`);
    });
  };

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="digest-head">
        <div>
          <strong>{digest.clientName}</strong>
          <span className="subtitle"> · week of {fmt(digest.weekKey)}</span>
          {digest.range?.start && <span className="subtitle"> · data {fmt(digest.range.start)} – {fmt(digest.range.end)}</span>}
        </div>
        <span className={`status-pill status-${digest.status}`}>{STATUS_LABEL[digest.status] || digest.status}</span>
      </div>

      <div className="form-group">
        <label>Email subject</label>
        <input className="field-input" value={emailSubject} disabled={!editable || busy} onChange={e => setEmailSubject(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Email body (main)</label>
        <textarea className="field-textarea" rows={10} value={emailBody} disabled={!editable || busy} onChange={e => setEmailBody(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Slack message (optional)</label>
        <textarea className="field-textarea" rows={6} value={slackText} disabled={!editable || busy} onChange={e => setSlackText(e.target.value)} />
      </div>

      <DeliveryTag name="Email" info={digest.delivery?.email} />
        <DeliveryTag name="Slack" info={digest.delivery?.slack} />
      {digest.status === 'sent' && digest.approvedBy && <p className="form-hint">Approved by {digest.approvedBy}.</p>}
      {error && <div className="alert alert-error" style={{ marginTop: 8 }}>{error}</div>}

      {editable && (
        <div className="controls-row" style={{ marginTop: 12, marginBottom: 0 }}>
          {testing ? (
            <button className="btn btn-sm" disabled={busy} onClick={sendTest}>Send test</button>
          ) : digest.weeklyReport ? (
            <button className="btn btn-sm" disabled={busy || targets.length === 0} onClick={approve}>
              {digest.status === 'failed' ? 'Retry failed channels' : 'Approve & send'}
            </button>
          ) : null}
          <button className="btn btn-secondary btn-sm" disabled={busy || !dirty} onClick={() => run(async () => { await save(); await onChanged(); })}>Save edits</button>
          <button
            className="btn btn-secondary btn-sm"
            disabled={busy}
            onClick={() => window.confirm('Discard this draft? Nothing will be sent.') && run(async () => { await api.post(`/api/digests/${digest.id}/discard`, {}); await onChanged(); })}
          >
            Discard
          </button>
          {!testing && digest.weeklyReport && <span className="subtitle">{targets.length ? `Will send to: ${targets.join(' + ')}` : 'Nothing to send to. Check Delivery settings.'}</span>}
          {!testing && !digest.weeklyReport && <span className="subtitle">Weekly reports are OFF for this client. Turn on Testing mode to send a test, or switch them on in Delivery settings.</span>}
        </div>
      )}
      {digest.status === 'discarded' && (
  <div className="controls-row" style={{ marginTop: 12, marginBottom: 0 }}>
    <button
      className="btn btn-secondary btn-sm"
      disabled={busy}
      onClick={() => window.confirm('Delete this discarded draft permanently?') && run(async () => { await api.delete(`/api/digests/${digest.id}`); await onChanged(); })}
    >
      Delete
    </button>
  </div>
)}
    </div>
  );
}

function DeliveryRow({ row, onSaved, setNotice }) {
  const [webhook, setWebhook] = useState('');
  const [emails, setEmails] = useState((row.emailRecipients || []).join(', '));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function save(body, message) {
    setBusy(true);
    setError(null);
    try {
      await api.put(`/api/clients/${row.id}/delivery`, body);
      if ('slackWebhookUrl' in body) setWebhook('');
      setNotice(message || `Saved ${row.name}.`);
      await onSaved();
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="digest-head">
        <strong>{row.name}</strong>
        <Toggle
          checked={row.weeklyReport}
          disabled={busy}
          label={row.weeklyReport ? 'Weekly report: ON' : 'Weekly report: OFF'}
          onChange={v => save({ weeklyReport: v }, `Weekly reports ${v ? 'ON' : 'OFF'} for ${row.name}.`)}
        />
      </div>
      <p className="form-hint" style={{ marginTop: 0 }}>
        {row.weeklyReport
          ? 'ON: a draft is created every Monday and can be approved and sent.'
          : 'OFF: no draft is created and nothing is sent for this client.'}
      </p>

      <div className="form-group" style={{ marginTop: 14 }}>
        <Toggle checked={row.emailEnabled} disabled={busy} label="Send by email (main)" onChange={v => save({ emailEnabled: v })} />
        <input
            className="field-input"
            style={{ marginTop: 8 }}
            type="text"
            name="digest-recipients"
            autoComplete="off"
            value={emails}
            onChange={e => setEmails(e.target.value)}
            placeholder="name@company.com, other@company.com"
            />
        <p className="form-hint">Separate with commas. Up to 10. Everyone listed sees the other addresses.</p>
      </div>

      <div className="form-group">
        <Toggle checked={row.slackEnabled} disabled={busy} label="Also send to Slack (optional)" onChange={v => save({ slackEnabled: v })} />
        <input
            className="field-input"
            style={{ marginTop: 8, WebkitTextSecurity: 'disc' }}
            type="text"
            name="slack-webhook-url"
            autoComplete="off"
            data-lpignore="true"
            data-1p-ignore="true"
            placeholder={row.hasWebhook ? `Saved (${row.webhookHint}). Paste a new URL to replace it.` : 'https://hooks.slack.com/services/… (leave empty to skip Slack)'}
            value={webhook}
            onChange={e => setWebhook(e.target.value)}
            />
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 8 }}>{error}</div>}
      <div className="controls-row" style={{ marginBottom: 0 }}>
        <button className="btn btn-sm" disabled={busy} onClick={() => save({ ...(webhook.trim() ? { slackWebhookUrl: webhook.trim() } : {}), emailRecipients: emails })}>
          Save emails / webhook
        </button>
        {row.hasWebhook && (
          <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => window.confirm('Remove the saved Slack webhook?') && save({ slackWebhookUrl: '' })}>
            Remove webhook
          </button>
        )}
      </div>
    </div>
  );
}

export default function Digests() {
  const [tab, setTab] = useState('drafts');
  const [digests, setDigests] = useState(null);
  const [delivery, setDelivery] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const [testing, setTestingState] = useState(store.get('digest-testing', '1') === '1');
  const [testEmail, setTestEmailState] = useState(store.get('digest-test-email', ''));
  const [testSlack, setTestSlack] = useState(false);
  const [genClient, setGenClient] = useState('');
  const pollRef = useRef(null);

  const setTesting = v => { setTestingState(v); store.set('digest-testing', v ? '1' : '0'); };
  const setTestEmail = v => { setTestEmailState(v); store.set('digest-test-email', v); };

  const load = useCallback(async () => {
    try {
      const [d, s] = await Promise.all([api.get('/api/digests'), api.get('/api/delivery')]);
      setDigests(d.data);
      setDelivery(s.data);
      setError(null);
    } catch (err) {
      setError(errText(err));
    }
  }, []);

  useEffect(() => { load(); return () => clearInterval(pollRef.current); }, [load]);

  function pollForDrafts() {
    clearInterval(pollRef.current);
    let n = 0;
    pollRef.current = setInterval(() => { load(); if (++n >= 12) clearInterval(pollRef.current); }, 6000);
  }

  async function generate({ clientId, force }) {
    try {
      await api.post('/api/digests/generate', { clientId: clientId || undefined, force });
      setNotice('Started. Drafts appear in about a minute; this page refreshes by itself.');
      pollForDrafts();
    } catch (err) {
      setError(errText(err));
    }
  }

  return (
    <div>
      <div className="controls-row" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>Weekly digests</h2>
        <div className="seg">
          <button className={`seg-btn ${tab === 'drafts' ? 'active' : ''}`} onClick={() => setTab('drafts')}>Drafts</button>
          <button className={`seg-btn ${tab === 'delivery' ? 'active' : ''}`} onClick={() => setTab('delivery')}>Delivery settings</button>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
      {notice && <div className="alert alert-ok" style={{ marginBottom: 12 }}>{notice}</div>}

      {tab === 'drafts' && (
        <>
          <div className="test-panel">
            <Toggle checked={testing} onChange={setTesting} label={testing ? 'Testing mode: ON (nothing goes to clients)' : 'Testing mode: OFF (Approve & send is real)'} />
            {testing && (
              <>
                <div className="form-group" style={{ marginTop: 12 }}>
                  <label>Send tests to this email address</label>
                  <input className="field-input" value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="your own email" />
                </div>
                <label className="switch-row" style={{ marginBottom: 12 }}>
                  <input type="checkbox" checked={testSlack} onChange={e => setTestSlack(e.target.checked)} />
                  <span>Also post the test to the client's Slack channel (leave off unless that channel is yours)</span>
                </label>
                <div className="controls-row" style={{ marginBottom: 0 }}>
                  <select className="field-input" style={{ width: 'auto' }} value={genClient} onChange={e => setGenClient(e.target.value)}>
                    <option value="">All clients with weekly report ON</option>
                    {(delivery || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button
                    className="btn btn-sm"
                    onClick={() => window.confirm('Create a fresh draft now? This replaces this week\'s existing draft for the chosen client(s) and uses GA4, Search Console and Claude.') && generate({ clientId: genClient, force: true })}
                  >
                    Generate fresh draft now
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="controls-row">
            <button className="btn btn-secondary btn-sm" onClick={load}>Refresh</button>
            {!testing && <button className="btn btn-secondary btn-sm" onClick={() => generate({ force: false })}>Create missing drafts for this week</button>}
            <span className="subtitle">Nothing is sent until you click {testing ? 'Send test' : 'Approve & send'}.</span>
          </div>

          {!digests && !error && <p className="subtitle">Loading…</p>}
          {digests && digests.length === 0 && <p className="subtitle">No drafts yet. Turn a client's weekly report ON in Delivery settings, or use Testing mode to generate one now.</p>}
          {digests && digests.map(d => (
            <DigestCard
              key={`${d.id}-${d.updatedAt}`}
              digest={d}
              testing={testing}
              testEmail={testEmail}
              testSlack={testSlack}
              onChanged={load}
              setNotice={setNotice}
            />
          ))}
        </>
      )}

      {tab === 'delivery' && (
        <>
          {!delivery && !error && <p className="subtitle">Loading…</p>}
          {delivery && delivery.length === 0 && <p className="subtitle">No clients yet.</p>}
          {delivery && delivery.map(r => <DeliveryRow key={r.id} row={r} onSaved={load} setNotice={setNotice} />)}
        </>
      )}
    </div>
  );
}