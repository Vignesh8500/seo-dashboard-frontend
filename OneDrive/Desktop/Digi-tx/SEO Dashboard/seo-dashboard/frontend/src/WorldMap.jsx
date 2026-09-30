import { useEffect, useState } from 'react';
import { geoEquirectangular, geoPath, geoCentroid } from 'd3-geo';
import { feature } from 'topojson-client';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
const WIDTH = 800;
const HEIGHT = 420;

// GA4 country names that don't exactly match this map's country names
const ALIASES = {
  'united states': 'united states of america',
  'russia': 'russian federation',
  'south korea': 'korea, republic of',
  'czechia': 'czech republic',
  'ivory coast': "côte d'ivoire",
  'laos': "lao people's democratic republic",
  'vietnam': 'viet nam',
  'syria': 'syrian arab republic',
  'iran': 'iran, islamic republic of',
  'tanzania': 'united republic of tanzania',
  'moldova': 'republic of moldova',
  'bolivia': 'bolivia (plurinational state of)',
  'venezuela': 'venezuela (bolivarian republic of)',
};

export default function WorldMap({ countries }) {
  const [geo, setGeo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(GEO_URL)
      .then(res => res.json())
      .then(topo => {
        if (cancelled) return;
        setGeo(feature(topo, topo.objects.countries));
      })
      .catch(err => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, []);

  if (error) return <p className="subtitle">Could not load map data ({error}).</p>;
  if (!geo) return <p className="subtitle">Loading map…</p>;

  const projection = geoEquirectangular().fitSize([WIDTH, HEIGHT], geo);
  const pathGen = geoPath(projection);

  // Build a lookup of sessions by normalized country name
  const sessionsByName = {};
  countries.forEach(c => {
    sessionsByName[c.country.trim().toLowerCase()] = c.sessions;
  });

  function getSessions(featureName) {
    const key = (featureName || '').trim().toLowerCase();
    if (sessionsByName[key] !== undefined) return sessionsByName[key];
    // check reverse alias: does any GA4 name alias to this feature name?
    for (const [ga4Name, mapName] of Object.entries(ALIASES)) {
      if (mapName === key && sessionsByName[ga4Name] !== undefined) {
        return sessionsByName[ga4Name];
      }
    }
    return 0;
  }

  const maxSessions = Math.max(...countries.map(c => c.sessions), 1);

  // One bubble per country feature that has traffic, positioned at its real centroid
  const bubbles = geo.features
    .map(f => {
      const sessions = getSessions(f.properties.name);
      if (!sessions) return null;
      const centroid = geoCentroid(f);
      const [x, y] = projection(centroid);
      if (!isFinite(x) || !isFinite(y)) return null;
      const radius = 4 + (sessions / maxSessions) * 22;
      return { name: f.properties.name, sessions, x, y, radius };
    })
    .filter(Boolean);

  // Names in your data that never matched any country in the map (for debugging)
  const matchedGA4Names = new Set(bubbles.map(b => {
    const entry = Object.entries(sessionsByName).find(([, v]) => v === b.sessions);
    return entry ? entry[0] : null;
  }));
  const unmatched = countries.filter(c => {
    const key = c.country.trim().toLowerCase();
    return key !== '(not set)' && key !== '' && !matchedGA4Names.has(key);
  });

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 8, background: 'var(--surface-2)' }}
      >
        <g>
          {geo.features.map((f, i) => (
            <path key={i} d={pathGen(f)} className="worldmap-land" />
          ))}
        </g>
        {bubbles.map((b, i) => (
          <g key={i}>
            <circle cx={b.x} cy={b.y} r={b.radius} className="worldmap-bubble" />
            <title>{b.name}: {b.sessions.toLocaleString()} sessions</title>
          </g>
        ))}
      </svg>

      {unmatched.length > 0 && (
        <p className="form-hint" style={{ marginTop: 8 }}>
          Not plotted (name not matched): {unmatched.map(c => c.country).join(', ')}
        </p>
      )}
    </div>
  );
}