import { useState } from 'react';

const GOALS_KEY = 'hermes_goals_v1';

const GOALS_DEFAULT = [
  { id: 'g1', name: 'Smarty Interview',      desc: 'Digital Analytics Specialist',     progress: 65, color: '#00c8ff' },
  { id: 'g2', name: 'Woodmark Experiment',   desc: 'Statsig A/B · Selfbook vs SynXis', progress: 80, color: '#f5a623' },
  { id: 'g3', name: 'PRMA GTM QA',           desc: 'Multi-site conversion tracking',   progress: 40, color: '#a78bfa' },
  { id: 'g4', name: 'Hermes OS Deploy',      desc: 'VPS + DNS + n8n webhook',           progress: 25, color: '#00ff64' },
  { id: 'g5', name: 'Hinckley sGTM',         desc: 'Stape.io server-side pixel',        progress: 55, color: '#f5a623' },
];

function loadGoals() {
  try { return JSON.parse(localStorage.getItem(GOALS_KEY)) || structuredClone(GOALS_DEFAULT); }
  catch { return structuredClone(GOALS_DEFAULT); }
}

export default function GoalsPanel() {
  const [goals, setGoals] = useState(loadGoals);

  function adjust(id, delta) {
    const next = goals.map(g =>
      g.id === id ? { ...g, progress: Math.max(0, Math.min(100, g.progress + delta)) } : g
    );
    setGoals(next);
    try { localStorage.setItem(GOALS_KEY, JSON.stringify(next)); } catch {}
  }

  return (
    <div className="goals-rail">
      <div className="rail-head">ACTIVE GOALS</div>
      <div className="goals-list">
        {goals.map(g => (
          <div key={g.id} className="goal-item">
            <div className="goal-header">
              <span className="goal-name">{g.name}</span>
              <span className="goal-pct" style={{ color: g.color }}>{g.progress}%</span>
            </div>
            <div className="goal-desc">{g.desc}</div>
            <div className="goal-bar-track">
              <div
                className="goal-bar-fill"
                style={{
                  width: `${g.progress}%`,
                  background: g.color,
                  boxShadow: `0 0 8px ${g.color}55`,
                }}
              />
            </div>
            <div className="goal-controls">
              <button className="goal-adj" onClick={() => adjust(g.id, -5)}>−</button>
              <button className="goal-adj" onClick={() => adjust(g.id, +5)}>+</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
