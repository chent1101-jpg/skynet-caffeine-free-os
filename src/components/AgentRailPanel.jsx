import { useState, useEffect, useCallback } from 'react';

const DEFAULT_AGENTS = [
  { id: 'hermes',     name: 'Hermes Agent',  description: 'VPS · DeepSeek V4 Flash', online: true  },
  { id: 'n8n',        name: 'n8n',           description: 'your-n8n-instance.example.com',    online: null  },
  { id: 'telegram',   name: 'Telegram',      description: 'Bot gateway · active',     online: true  },
  { id: 'openrouter', name: 'OpenRouter',    description: 'API routing · active',     online: true  },
];

function statusClass(online) {
  if (online === true)  return 'a-online';
  if (online === false) return 'a-offline';
  return 'a-unknown';
}

function statusLabel(online) {
  if (online === true)  return 'LIVE';
  if (online === false) return 'DOWN';
  return '···';
}

export default function AgentRailPanel({ token }) {
  const [agents, setAgents] = useState(DEFAULT_AGENTS);

  const fetchAgents = useCallback(async () => {
    try {
      const r = await fetch('/api/agents', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) setAgents(await r.json());
    } catch { /* keep defaults */ }
  }, [token]);

  useEffect(() => {
    fetchAgents();
    const id = setInterval(fetchAgents, 60_000);
    return () => clearInterval(id);
  }, [fetchAgents]);

  return (
    <div className="agent-rail">
      <div className="rail-head">CYBERNETIC AGENT NETWORK</div>
      <div className="agent-list">
        {agents.map(a => {
          const sc = statusClass(a.online);
          return (
            <div key={a.id} className="agent-item">
              <div className={`agent-dot ${sc}`} />
              <div className="agent-info">
                <div className="agent-name">{a.name}</div>
                <div className="agent-desc">{a.description}</div>
              </div>
              <span className={`agent-badge ${sc}`}>{statusLabel(a.online)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
