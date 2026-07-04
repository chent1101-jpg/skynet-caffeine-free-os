const NAV = [
  { id: 'mission', label: 'Control Nexus', icon: '◈', section: null },

  { id: '__agents', label: 'CYBERNETIC AGENTS', section: true },
  { id: 'hermes-agent', label: 'Hermes Agent', icon: '●', color: '#00c8ff', target: 'mission', indent: true },
  { id: 'n8n',          label: 'n8n',          icon: '●', color: '#f5a623', target: 'mission', indent: true },
  { id: 'telegram',     label: 'Telegram',     icon: '●', color: '#7289da', target: 'mission', indent: true },
  { id: 'openrouter',   label: 'OpenRouter',   icon: '●', color: '#a78bfa', target: 'mission', indent: true },
  { id: 'claude',       label: 'Claude',       icon: '●', color: '#c97ed5', target: 'mission', indent: true },
  { id: 'deepseek',     label: 'DeepSeek',     icon: '●', color: '#7c6bea', target: 'mission', indent: true },

  { id: '__workspace', label: 'WORKSPACE', section: true },
  { id: 'nexus',     label: 'Nexus',      icon: '◉' },
  { id: 'kanban',    label: 'Operations', icon: '⊞' },
  { id: 'briefing',  label: 'Briefing',   icon: '⌗' },
  { id: 'goals',     label: 'Goals',      icon: '◎' },
  { id: 'notes',     label: 'Notes',      icon: '≡' },
  { id: 'graph',     label: 'Graph',      icon: '⬡' },

  { id: '__self', label: 'SELF', section: true },
  { id: 'journal', label: 'Journal', icon: '◷', soon: true },
  { id: 'memory',  label: 'Memory',  icon: '⊙', soon: true },
];

export default function Sidebar({ activeView, onNav }) {
  return (
    <div className="sidebar">
      <nav className="sb-nav">
        {NAV.map(item => {
          if (item.section) {
            return (
              <div key={item.id} className="sb-section">{item.label}</div>
            );
          }

          const target  = item.target || item.id;
          const isActive = activeView === target && !item.target
            ? true
            : activeView === item.id && !item.target;

          const active = item.target
            ? activeView === item.target
            : activeView === item.id;

          return (
            <div
              key={item.id}
              className={`sb-item ${active ? 'active' : ''} ${item.indent ? 'indent' : ''} ${item.soon ? 'soon' : ''}`}
              onClick={item.soon ? undefined : () => onNav(item.target || item.id)}
            >
              <span
                className="sb-icon"
                style={item.color ? { color: item.color } : undefined}
              >
                {item.icon}
              </span>
              <span className="sb-label">{item.label}</span>
              {item.soon && <span className="sb-soon">SOON</span>}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
