import { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import api from '../api';

const DEFAULTS = {
  days: '28',
  start: '',
  end: '',
  positionDelta: 3,
  clickPct: 20,
  minClicks: 5,
  minImpressions: 20,
  blogOnly: false,
};

const PRESETS = [['7', 'Last 7 days'], ['28', 'Last 28 days'], ['90', 'Last 90 days'], ['custom', 'Custom']];

const num = n => (n == null ? '—' : Math.round(n).toLocaleString());
const dec = n => (n == null ? '—' : n.toFixed(1));
const pct = n => (n == null ? 'new' : `${n > 0 ? '+' : ''}${n.toFixed(0)}%`);
const day = s => new Date(`${s}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const yesterday = () => new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const shortUrl = u => {
  try { const x = new URL(u); return x.pathname + x.search; } catch { return u; }
};

function Badge({ dir, tone, children }) {
  return (
    <span className={`delta delta-${tone}`}>
      {dir === 'up' && <ArrowUp size={12} />}
      {dir === 'down' && <ArrowDown size={12} />}
      {children}
    </span>
  );
}

function pctBadge(changePct) {
  if (changePct == null) return <Badge dir="up" tone="good">new</Badge>;
  if (Math.abs(changePct) < 0.05) return <Badge dir="flat" tone="flat">0%</Badge>;
  const up = changePct > 0;
  return <Badge dir={up ? 'up' : 'down'} tone={up ? 'good' : 'bad'}>{Math.abs(changePct).toFixed(1)}%</Badge>;
}

// Lower position number is better, so "better" = the number went down
function posBadge(delta) {
  if (delta == null) return <Badge dir="flat" tone="flat">—</Badge>;
  if (Math.abs(delta) < 0.05) return <Badge dir="flat" tone="flat">0</Badge>;
  const better = delta > 0;
  return <Badge dir={better ? 'up' : 'down'} tone={better ? 'good' : 'bad'}>{Math.abs(delta).toFixed(1)} pos</Badge>;
}

function Kpi({ label, value, badge }) {
  return (
    <div className="kpi">
      <div className="metric-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {badge}
    </div>
  );
}

// function MoverList({ title, items, mode, tone, isPage }) {
//   const color = tone === 'good' ? 'var(--success)' : 'var(--error)';
//   return (
//     <div>
//       <div className="mover-title">{title} ({items.length})</div>
//       {items.length === 0 && <p className="subtitle">Nothing crossed the threshold.</p>}
//       {items.map(i => (
//         <div className="query-row" key={i.key}>
//           <span>{isPage ? shortUrl(i.key) : i.key}</span>
//           <span style={{ color }}>
//             {mode === 'position'
//               ? `${dec(i.prevPosition)} → ${dec(i.position)}`
//               : `${num(i.prevClicks)} → ${num(i.clicks)} (${pct(i.clickChangePct)})`}
//           </span>
//         </div>
//       ))}
//     </div>
//   );
// }


function MoverList({ title, items, mode, tone, isPage }) {
  const color = tone === 'good' ? 'var(--success)' : 'var(--error)';
  return (
    <div>
      <div className="mover-title">{title} ({items.length})</div>
      {items.length === 0 && <p className="subtitle">Nothing crossed the threshold.</p>}
      {items.map(i => (
        <div className="mover-item" key={i.key}>
          <div className="query-row">
            <span>{isPage ? shortUrl(i.key) : i.key}</span>
            <span style={{ color }}>
              {mode === 'position'
                ? `${dec(i.prevPosition)} → ${dec(i.position)}`
                : `${num(i.prevClicks)} → ${num(i.clicks)} (${pct(i.clickChangePct)})`}
            </span>
          </div>
          {i.why && (
            <p className="why">
              Likely: {i.why.cause} · {i.why.confidence} confidence{i.why.note ? ` — ${i.why.note}` : ''}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Changes({ clientId }) {
  const [draft, setDraft] = useState(DEFAULTS);
  const [applied, setApplied] = useState(DEFAULTS);
  const [formError, setFormError] = useState(null);
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    let cancelled = false;
    setState(s => ({ ...s, loading: true, error: null }));

    const params = {
      positionDelta: applied.positionDelta,
      clickPct: applied.clickPct,
      minClicks: applied.minClicks,
      minImpressions: applied.minImpressions,
      blogOnly: applied.blogOnly,
    };
    if (applied.days === 'custom') {
      params.start = applied.start;
      params.end = applied.end;
    } else {
      params.days = applied.days;
    }

    api.get(`/api/dashboard/${clientId}/compare`, { params })
      .then(res => { if (!cancelled) setState({ loading: false, error: null, data: res.data }); })
      .catch(err => {
        if (!cancelled) setState({ loading: false, error: err.response?.data?.message || (err.response ? `Server returned ${err.response.status}.` : 'Cannot reach the backend. Is it running and redeployed?'), data: null });
      });

    return () => { cancelled = true; };
  }, [clientId, applied]);

  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));

  function pickPreset(days) {
    const next = { ...draft, days };
    setDraft(next);
    setFormError(null);
    if (days !== 'custom') setApplied(next);
  }

  function apply() {
    if (draft.days === 'custom' && (!draft.start || !draft.end)) {
      setFormError('Pick both a start and an end date.');
      return;
    }
    setFormError(null);
    setApplied({ ...draft });
  }

  const { loading, error, data } = state;

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="metric-label" style={{ marginBottom: 10 }}>What changed</div>

      <div className="controls-row">
        <div className="seg">
          {PRESETS.map(([v, label]) => (
            <button key={v} type="button" className={`seg-btn ${draft.days === v ? 'active' : ''}`} onClick={() => pickPreset(v)}>
              {label}
            </button>
          ))}
        </div>
        {draft.days === 'custom' && (
          <div className="date-inputs">
            <input type="date" value={draft.start} max={yesterday()} onChange={e => set('start', e.target.value)} />
            <span className="subtitle">to</span>
            <input type="date" value={draft.end} max={yesterday()} onChange={e => set('end', e.target.value)} />
          </div>
        )}
      </div>

      <div className="controls-row">
        <label className="ctl">Position ± <input type="number" min="1" value={draft.positionDelta} onChange={e => set('positionDelta', e.target.value)} /></label>
        <label className="ctl">Clicks ±% <input type="number" min="1" max="100" value={draft.clickPct} onChange={e => set('clickPct', e.target.value)} /></label>
        <label className="ctl">Min clicks <input type="number" min="1" value={draft.minClicks} onChange={e => set('minClicks', e.target.value)} /></label>
        <label className="ctl">Min impressions <input type="number" min="1" value={draft.minImpressions} onChange={e => set('minImpressions', e.target.value)} /></label>
        <label className="ctl-check">
          <input type="checkbox" checked={draft.blogOnly} onChange={e => set('blogOnly', e.target.checked)} /> Blog pages only (pages table)
        </label>
        <button type="button" className="btn btn-sm" onClick={apply}>Apply</button>
      </div>

      {formError && <div className="alert alert-error">{formError}</div>}
      {error && <div className="alert alert-error">{error}</div>}
      {loading && <p className="subtitle">Comparing periods… this runs live against GA4 and Search Console, so it can take a few seconds.</p>}

      {data && !loading && (() => {
        const { range: r, gscRange: g, totals: t, queries, pages } = data;
        return (
          <>
            <p className="subtitle">
              {day(r.start)} – {day(r.end)} vs {day(r.prevStart)} – {day(r.prevEnd)} ({r.len} days each)
            </p>
            {g.shiftedDays > 0 && (
              <p className="form-hint">
                Search Console data lags by a few days, so its windows end {g.shiftedDays} day{g.shiftedDays > 1 ? 's' : ''} earlier
                ({day(g.start)} – {day(g.end)}).
              </p>
            )}

            <div className="kpi-grid">
              <Kpi label="Sessions" value={num(t.sessions.cur)} badge={pctBadge(t.sessions.changePct)} />
              <Kpi label="Users" value={num(t.users.cur)} badge={pctBadge(t.users.changePct)} />
              <Kpi label="Key events" value={num(t.keyEvents.cur)} badge={pctBadge(t.keyEvents.changePct)} />
              <Kpi label="Clicks" value={num(t.clicks.cur)} badge={pctBadge(t.clicks.changePct)} />
              <Kpi label="Impressions" value={num(t.impressions.cur)} badge={pctBadge(t.impressions.changePct)} />
              <Kpi label="CTR" value={`${dec(t.ctr.cur)}%`} badge={pctBadge(t.ctr.changePct)} />
              <Kpi label="Avg position" value={dec(t.position.cur)} badge={posBadge(t.position.delta)} />
            </div>
            {data.explanations?.length > 0 && (
            <div className="why-box">
                <div className="mover-title">Likely causes (rule-based)</div>
                {data.explanations.map((e, n) => (
                <p key={n} className="why"><strong>{e.metric}:</strong> {e.text} <span className="subtitle">({e.confidence} confidence)</span></p>
                ))}
            </div>
            )}

            <div className="metric-label" style={{ marginBottom: 8 }}>Search queries</div>
            <div className="grid grid-2">
              <MoverList title="Ranking up" items={queries.positionUp} mode="position" tone="good" />
              <MoverList title="Ranking down" items={queries.positionDown} mode="position" tone="bad" />
              <MoverList title="Gaining clicks" items={queries.clickWinners} mode="clicks" tone="good" />
              <MoverList title="Losing clicks" items={queries.clickLosers} mode="clicks" tone="bad" />
            </div>

            <div className="metric-label mover-section" style={{ marginBottom: 8 }}>Pages</div>
            <div className="grid grid-2">
              <MoverList title="Gaining clicks" items={pages.clickWinners} mode="clicks" tone="good" isPage />
              <MoverList title="Losing clicks" items={pages.clickLosers} mode="clicks" tone="bad" isPage />
            </div>
          </>
        );
      })()}
    </div>
  );
}