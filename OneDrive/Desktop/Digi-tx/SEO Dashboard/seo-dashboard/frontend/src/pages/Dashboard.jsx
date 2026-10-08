import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Send } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import api from '../api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DeviceIcon from '../DeviceIcon';
import WorldMap from '../WorldMap';

function parseGA4Date(dateStr) {
  const year = dateStr.slice(0, 4);
  const month = dateStr.slice(4, 6);
  const day = dateStr.slice(6, 8);
  return new Date(`${year}-${month}-${day}T00:00:00`);
}

function formatDateLabel(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Dashboard() {
  const { clientId } = useParams();
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [refreshing, setRefreshing] = useState(false);

  // Chat state
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const chatEndRef = useRef(null);

  function load() {
    setState(prev => ({ ...prev, loading: true }));
    api.get(`/api/dashboard/${clientId}`)
      .then(res => setState({ loading: false, error: null, data: res.data }))
      .catch(err => setState({ loading: false, error: err.response?.data?.message || 'Failed to load data', data: null }));
  }

  useEffect(load, [clientId]);
  useEffect(() => setMessages([]), [clientId]); // reset chat when switching clients

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await api.post(`/api/dashboard/${clientId}/refresh`);
      load();
    } catch (err) {
      setState(prev => ({ ...prev, error: err.response?.data?.message || 'Refresh failed' }));
    } finally {
      setRefreshing(false);
    }
  }

  async function handleAsk(e) {
    e.preventDefault();
    const q = question.trim();
    if (!q || asking) return;

    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setQuestion('');
    setAsking(true);

    try {
      const res = await api.post(`/api/dashboard/${clientId}/ask`, { question: q });
      setMessages(prev => [...prev, { role: 'assistant', text: res.data.answer }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: `Error: ${err.response?.data?.message || 'Request failed'}` }]);
    } finally {
      setAsking(false);
    }
  }

  if (state.loading) return <p className="subtitle">Loading dashboard…</p>;

  if (state.error) {
    return (
      <div>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-dim)', fontSize: 13, marginBottom: 12, textDecoration: 'none' }}>
          <ArrowLeft size={14} /> All clients
        </Link>
        <div className="alert alert-error" style={{ marginBottom: 16 }}>{state.error}</div>
        <button className="btn" onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? <><span className="spinner" /> Fetching data…</> : <><RefreshCw size={15} /> Run refresh now</>}
        </button>
      </div>
    );
  }

  const { client, data, insights, updatedAt } = state.data;
  const totalSessions = data.traffic.reduce((s, r) => s + r.sessions, 0);
  const totalConversions = data.traffic.reduce((s, r) => s + r.conversions, 0);

  const chartData = [...data.traffic]
    .map(row => ({ ...row, parsedDate: parseGA4Date(row.date) }))
    .sort((a, b) => a.parsedDate - b.parsedDate)
    .map(row => ({ ...row, label: formatDateLabel(row.parsedDate) }));

  const totalDeviceSessions = data.devices?.reduce((s, d) => s + d.sessions, 0) || 0;

  return (
    <div>
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-dim)', fontSize: 13, marginBottom: 12, textDecoration: 'none' }}>
        <ArrowLeft size={14} /> All clients
      </Link>

      <div className="page-header">
        <div>
          <h2>{client}</h2>
          <p className="subtitle">Last updated {new Date(updatedAt).toLocaleString()}</p>
        </div>
        <button className="btn btn-secondary" onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? <span className="spinner" style={{ borderTopColor: 'var(--text)' }} /> : <RefreshCw size={15} />}
          Refresh data
        </button>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="metric-label">Sessions (28 days)</div>
          <div className="metric-value">{totalSessions.toLocaleString()}</div>
        </div>
        <div className="card">
  <div className="metric-label">Key events (28 days)</div>
  <div className="metric-value">{totalConversions.toLocaleString()}</div>
  {totalConversions === 0 && (
    <p className="form-hint" style={{ marginTop: 6 }}>
      0 usually means no events are marked as key events in GA4 yet.
    </p>
  )}
</div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="metric-label" style={{ marginBottom: 12 }}>Traffic trend — GA4</div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="label" stroke="var(--text-dim)" fontSize={11} />
            <YAxis stroke="var(--text-dim)" fontSize={11} />
            <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
            <Line type="monotone" dataKey="sessions" stroke="var(--accent)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Readers by location 
      --------------------Maps-------------------------------------------------------------------------*/}
        <div className="card" style={{ marginBottom: 16 }}>
        <div className="metric-label" style={{ marginBottom: 12 }}>Readers by location — GA4</div>
        {(!data.countries || data.countries.length === 0) ? (
            <p className="subtitle">No location data yet.</p>
        ) : (
            <>
            <WorldMap countries={data.countries} />
            <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: '8px 20px' }}>
                {data.countries.slice(0, 8).map((c, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                    <span style={{ color: 'var(--text)', fontWeight: 600 }}>{c.country}</span> — {c.sessions.toLocaleString()}
                </div>
                ))}
            </div>
            </>
        )}
        </div>

      {/* NEW: Acquisition + Devices */}
      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="metric-label" style={{ marginBottom: 8 }}>Traffic sources — GA4</div>
          {(!data.acquisition?.channels || data.acquisition.channels.length === 0) && (
            <p className="subtitle">No acquisition data yet.</p>
          )}
          {data.acquisition?.channels.map((c, i) => (
            <div className="query-row" key={i}>
              <span>{c.channel}</span>
              <span style={{ color: 'var(--text-dim)' }}>{c.sessions.toLocaleString()} sessions</span>
            </div>
          ))}
          {data.acquisition?.sources?.length > 0 && (
            <>
              <div className="metric-label" style={{ marginTop: 16, marginBottom: 8 }}>By source / medium</div>
              {data.acquisition.sources.map((s, i) => (
                <div className="query-row" key={i}>
                  <span>{s.source} <span style={{ color: 'var(--text-dim)' }}>/ {s.medium}</span></span>
                  <span style={{ color: 'var(--text-dim)' }}>{s.sessions.toLocaleString()}</span>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="card">
          <div className="metric-label" style={{ marginBottom: 14 }}>Devices — GA4</div>
          {(!data.devices || data.devices.length === 0) && <p className="subtitle">No device data yet.</p>}
          <div className="device-grid">
            {data.devices?.map((d, i) => {
              const pct = totalDeviceSessions ? Math.round((d.sessions / totalDeviceSessions) * 100) : 0;
              return (
                <div className="device-item" key={i}>
                  <DeviceIcon device={d.device} size={26} />
                  <div className="device-name">{d.device}</div>
                  <div className="device-pct">{pct}%</div>
                  <div className="device-count">{d.sessions.toLocaleString()} sessions</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="metric-label" style={{ marginBottom: 8 }}>Top events — GA4</div>
          {(!data.events || data.events.length === 0) && <p className="subtitle">No event data yet.</p>}
          <div className="events-scroll scroll-area">
                {data.events?.map((e, i) => (
                    <div className="query-row" key={i}>
                    <span>{e.name}</span>
                    <span style={{ color: 'var(--text-dim)' }}>{e.count.toLocaleString()}</span>
                    </div>
                ))}
            </div>
        </div>

        <div className="card">
          <div className="metric-label" style={{ marginBottom: 8 }}>Sitemap status — GSC</div>
          {!data.indexing && <p className="subtitle">No sitemap submitted.</p>}
          {data.indexing && (
            <>
              <div className="query-row"><span>URLs in sitemap</span><span>{data.indexing.submitted.toLocaleString()}</span></div>
              <div className="query-row"><span>Sitemaps found</span><span>{data.indexing.sitemapCount}</span></div>
              <p className="form-hint" style={{ marginTop: 10 }}>
                Exact indexed/not-indexed counts aren't available via the Search Console API — check the Pages report in GSC directly for that breakdown.
              </p>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="metric-label" style={{ marginBottom: 8 }}>Top queries — Search Console</div>
          {data.search.length === 0 && <p className="subtitle">No query data for this period yet.</p>}
          {data.search.map((row, i) => (
            <div className="query-row" key={i}>
              <span>{row.keys?.[0]}</span>
              <span style={{ color: 'var(--text-dim)' }}>{row.clicks} clicks · pos {row.position?.toFixed(1)}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="metric-label" style={{ marginBottom: 8 }}>Domain overview — Semrush</div>
          {data.semrushStatus === 'not_added' && <p className="subtitle">Not added</p>}
          {data.semrushStatus === 'error' && <p className="subtitle" style={{ color: 'var(--error)' }}>Could not fetch Semrush data</p>}
          {data.semrushStatus === 'ok' && data.domain && Object.entries(data.domain[0] || {}).map(([k, v]) => (
            <div className="query-row" key={k}>
              <span>{k}</span>
              <span style={{ color: 'var(--text-dim)' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/*------------------------------------------------------------------ Blog pages performance ---------------------------------------------------*/}
       {/*------------------------------------------------------------------ Blog pages performance ---------------------------------------------------*/}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="metric-label" style={{ marginBottom: 2 }}>Blog pages — performance</div>
          <p className="subtitle" style={{ marginBottom: 12 }}>Last 28 days</p>
          {(!data.blogPages || data.blogPages.length === 0) ? (
            <p className="subtitle">No blog page data yet.</p>
          ) : (
            <div className="scroll-area" style={{ maxHeight: 480, overflowY: 'auto', paddingRight: 14 }}>
              {data.blogPages.map((page, i) => (
                <div key={i} className="page-item">
                  <div className="page-item-header">
                    <span className="page-path">{page.path}</span>
                    <span className="page-sessions">{page.sessions.toLocaleString()} sessions</span>
                  </div>

                  <div className="page-item-grid">
                    <div>
                      <div className="page-item-label">Sources</div>
                      {page.topSources.length === 0 && <span className="page-item-empty">—</span>}
                      {page.topSources.map((s, j) => (
                        <div key={j} className="page-item-row"><span>{s.name}</span><span>{s.sessions}</span></div>
                      ))}
                    </div>
                    <div>
                      <div className="page-item-label">Devices</div>
                      {page.topDevices.length === 0 && <span className="page-item-empty">—</span>}
                      {page.topDevices.map((d, j) => (
                        <div key={j} className="page-item-row"><span>{d.name}</span><span>{d.sessions}</span></div>
                      ))}
                    </div>
                    <div>
                      <div className="page-item-label">Top keywords</div>
                      {page.topKeywords.length === 0 && <span className="page-item-empty">—</span>}
                      {page.topKeywords.map((k, j) => (
                        <div key={j} className="page-item-row"><span>{k.query}</span><span>{k.clicks}</span></div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      {/* Claude analysis + mini-chat */}
      <div className="card claude-card">
        <div className="metric-label" style={{ marginBottom: 10 }}>Claude analysis</div>
        <div className="claude-scroll-area scroll-area">
          <div className="insights-box">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{insights}</ReactMarkdown>
          </div>

          {messages.length > 0 && <div className="chat-divider">Follow-up questions</div>}

          {messages.map((m, i) => (
            <div key={i} className={`chat-bubble chat-${m.role}`}>
              {m.role === 'assistant'
                ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                : m.text}
            </div>
          ))}
          {asking && <div className="chat-bubble chat-assistant"><span className="spinner" style={{ borderTopColor: 'var(--text)' }} /></div>}
          <div ref={chatEndRef} />
        </div>

        <form className="chat-input-row" onSubmit={handleAsk}>
          <input
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Ask about this client's data — e.g. 'Why did conversions drop?'"
            disabled={asking}
          />
          <button className="btn" type="submit" disabled={asking || !question.trim()}>
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}