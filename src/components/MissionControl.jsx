import { useState, useEffect, useCallback } from 'react';

// ── Hermes skills catalogue ───────────────────────
const HERMES_SKILLS = [
  { name: 'job-search-pipeline',       category: 'automation', desc: 'Full 7-step job search pipeline: LinkedIn scrape → filter → resume tailor → Jobscan ATS score → Drive upload → Sheets log.' },
  { name: 'interview-prep-brief',      category: 'research',   desc: 'Research a company and compile a structured interview prep brief — leadership, culture, role analysis, likely questions, talking points.' },
  { name: 'statsig-synxis-experiment', category: 'analytics',  desc: 'Build Statsig Sidecar A/B experiments with SynXis cross-domain stableID threading and HTTP conversion logging on Domain B.' },
  { name: 'docx',                      category: 'document',   desc: 'Create, read, edit, and format Word documents — headings, tables of contents, letterheads, tracked changes.' },
  { name: 'pdf',                       category: 'document',   desc: 'Comprehensive PDF processing — extract text/tables, merge, split, rotate, watermark, fill forms, OCR scanned pages.' },
  { name: 'pptx',                      category: 'document',   desc: 'Create and edit PowerPoint decks — slides, layouts, speaker notes, template application, content extraction.' },
  { name: 'xlsx',                      category: 'document',   desc: 'Excel spreadsheet creation, editing, formula application, data cleaning, charting, and tabular conversion.' },
  { name: 'schedule',                  category: 'system',     desc: 'Create and update scheduled tasks — recurring crons (daily, weekly) or one-shot future-dated triggers.' },
  { name: 'skill-creator',            category: 'system',     desc: 'Create new skills, modify existing ones, run evals, benchmark performance, and optimize skill trigger descriptions.' },
  { name: 'setup-cowork',             category: 'system',     desc: 'Guided Cowork setup — install role-matched plugins, connect tools, try a skill.' },
  { name: 'cowork-plugin-customizer', category: 'system',     desc: 'Customize a Cowork plugin for a specific organization\'s tools and workflows.' },
  { name: 'create-cowork-plugin',     category: 'system',     desc: 'Guide through creating a new plugin from scratch — MCPs, skills, tool bundles packaged as a .plugin file.' },
];

const CAT_COLORS = {
  automation: '#00c8ff',
  research:   '#00d4aa',
  analytics:  '#f5a623',
  document:   '#a78bfa',
  system:     '#6a959d',
};

// ── Hermes connectors catalogue ───────────────────
const HERMES_CONNECTORS = [
  {
    name: 'Computer Use',
    id: 'computer-use',
    risk: 'critical',
    access: ['Full desktop screenshot & control', 'Mouse clicks, keyboard input, drag-drop', 'Open any application', 'Read clipboard contents'],
    desc: 'Provides full control of Tim\'s physical desktop — screenshots, mouse, keyboard. Browser and terminal apps are tier-restricted (read-only / click-only respectively).',
    mitigations: ['Browsers locked to read-only tier', 'Terminals locked to click-only tier', 'Financial actions (trades, transfers) are hard-blocked', 'Link-click safety checks enforced', 'User must explicitly grant access per application'],
  },
  {
    name: 'Desktop Commander',
    id: 'desktop-commander',
    risk: 'high',
    access: ['Read & write files on local filesystem', 'Start, kill, and interact with processes', 'List running processes', 'Execute shell commands via start_process'],
    desc: 'Direct filesystem and process access on Tim\'s machine. Can read any file, write to any writable path, and start/kill processes.',
    mitigations: ['Runs in sandboxed session', 'No credential or secret injection guardrails beyond behavioral rules', 'All writes go through explicit tool calls visible in conversation'],
  },
  {
    name: 'Claude in Chrome',
    id: 'claude-in-chrome',
    risk: 'high',
    access: ['Navigate to any URL', 'Read full page text and DOM', 'Execute arbitrary JavaScript', 'Fill and submit forms', 'Read network requests & console logs'],
    desc: 'Full DOM-aware browser automation. Can read content from any tab, execute JS in page context, and submit forms. Used for web apps without dedicated MCPs.',
    mitigations: ['Injected page instructions treated as data, not commands', 'Links from emails/messages require URL verification before following', 'Financial form submission requires explicit user confirmation', 'Malicious JS injection from observed content is blocked by behavioral rules'],
  },
  {
    name: 'Gmail',
    id: 'gmail',
    risk: 'high',
    access: ['Search and read all email threads', 'Create and send drafts', 'Apply and remove labels', 'Access sensitive message content'],
    desc: 'Connected to chent1101@gmail.com via OAuth. Can read any email, draft outbound messages, and apply labels. Sending requires explicit user confirmation.',
    mitigations: ['Sending requires per-session explicit approval', 'Never auto-forwards or sets up rules without confirmation', 'Connected account: chent1101@gmail.com only'],
  },
  {
    name: 'Google Calendar',
    id: 'gcal',
    risk: 'medium',
    access: ['List all calendars and events', 'Create new events', 'Update and delete events', 'Suggest meeting times'],
    desc: 'Can read Tim\'s full calendar, create events, and delete existing ones. Destructive actions (delete) require confirmation.',
    mitigations: ['Delete requires explicit confirmation', 'Creating events is logged in conversation', 'Responds to invites requires confirmation'],
  },
  {
    name: 'Google Drive',
    id: 'gdrive',
    risk: 'medium',
    access: ['List and search files', 'Read file content', 'Create new files', 'Copy files', 'Read file permissions'],
    desc: 'Can read and create files in Tim\'s Drive. Cannot delete or change sharing permissions without explicit instruction.',
    mitigations: ['No delete capability exposed', 'No permission modification capability', 'File creation confirmed via conversation'],
  },
  {
    name: 'n8n',
    id: 'n8n',
    risk: 'medium',
    access: ['List, create, and update workflows', 'Execute workflows (trigger runs)', 'Read execution results', 'Manage credentials (list only)'],
    desc: 'Full n8n workflow management at your-n8n-instance.example.com. Executing a workflow can trigger real-world side effects (send email, write to Sheets, call APIs).',
    mitigations: ['Execute workflows only on Tim\'s explicit instruction', 'Workflow creation reviewed before activation', 'Credentials are list-only — values never exposed'],
  },
  {
    name: 'GTM',
    id: 'gtm',
    risk: 'medium',
    access: ['Read GTM container configs', 'Track and save component configs', 'Search and modify chatters (GTM audit data)'],
    desc: 'GTM audit and config tooling. Modifying client GTM containers has direct impact on client site tracking.',
    mitigations: ['Changes to client containers require explicit confirmation', 'Read operations are safe', 'Config saves logged in conversation'],
  },
  {
    name: 'Scheduled Tasks',
    id: 'scheduled-tasks',
    risk: 'low',
    access: ['Create scheduled/recurring tasks', 'List existing tasks', 'Update task schedule or prompt'],
    desc: 'Creates persistent background tasks that run on a schedule. Tasks persist between sessions and execute Hermes prompts automatically.',
    mitigations: ['Task content visible before creation', 'Tasks listed and auditable at any time', 'Can be updated or deleted on request'],
  },
  {
    name: 'Apify',
    id: 'apify',
    risk: 'low',
    access: ['Search and call Apify actors', 'Retrieve dataset results', 'Fetch key-value store records'],
    desc: 'External web scraping platform. Data flows to Apify\'s servers during actor runs. Used for LinkedIn job scraping and web data extraction.',
    mitigations: ['No authentication data passed to actors', 'Results fetched back through authenticated API', 'Actor runs sandboxed on Apify infrastructure'],
  },
  {
    name: 'Cowork (Internal)',
    id: 'cowork',
    risk: 'low',
    access: ['Present files to user', 'Create and update artifacts', 'Request folder access', 'Read widget context'],
    desc: 'Internal Cowork session management — file sharing, artifact creation, directory access requests.',
    mitigations: ['Folder access requires explicit user grant', 'Artifacts are sandboxed HTML', 'No external network calls from artifacts'],
  },
];

const RISK_META = {
  critical: { label: 'CRITICAL', color: '#ff4444', bg: 'rgba(255,68,68,0.08)' },
  high:     { label: 'HIGH',     color: '#f5a623', bg: 'rgba(245,166,35,0.08)' },
  medium:   { label: 'MEDIUM',  color: '#fbbc04', bg: 'rgba(251,188,4,0.08)'  },
  low:      { label: 'LOW',     color: '#00d4aa', bg: 'rgba(0,212,170,0.08)'  },
};

// ── Agent definitions ─────────────────────────────
const HERMES_AGENTS = [
  {
    id: 'hermes',
    name: 'Hermes Agent',
    avatar: 'H',
    color: '#00c8ff',
    description: 'Chief of staff · Tool calls, Kanban, cron jobs, multi-step research pipelines.',
    stats: [
      { label: 'MODEL',   value: 'DeepSeek V4 Flash' },
      { label: 'HOST',    value: 'VPS'                 },
      { label: 'CRONS',   value: '2 active'           },
      { label: 'GATEWAY', value: 'Telegram'           },
    ],
    link: null,
    extended: [
      { label: 'Version',      value: '0.17.0'                           },
      { label: 'Container',    value: 'hermes-agent-teyd-hermes-agent-1' },
      { label: 'Config path',  value: '/opt/data/.hermes/config.yaml'    },
      { label: 'Env path',     value: '/opt/data/.hermes/.env'           },
      { label: 'SOUL.md',      value: '/opt/data/.hermes/SOUL.md'        },
      { label: 'Cron 1',       value: 'Daily briefing — 7am MT'          },
      { label: 'Cron 2',       value: 'Nightly report — 10pm MT'         },
      { label: 'Fallback',     value: 'Flash → Pro → Kimi → Sonnet'      },
    ],
    links: [
      { label: 'n8n — Workflows',       url: 'https://your-n8n-instance.example.com/home/workflows' },
      { label: 'OpenRouter — Activity', url: 'https://openrouter.ai/activity'              },
    ],
    notes: 'Hermes runs 24/7 on VPS srv1793064 (Ubuntu 24.04). Uses DeepSeek V4 Flash by default via OpenRouter, escalating to Pro → Kimi K2.7 → Claude Sonnet 4.6 for heavier tasks. All Google integrations proxy through n8n as myjobsearchjune2026@gmail.com.',
  },
  {
    id: 'n8n',
    name: 'n8n',
    avatar: 'N',
    color: '#f5a623',
    description: 'Workflow automation · Gmail, Calendar, Sheets, Drive broker for Google Suite.',
    stats: [
      { label: 'INSTANCE', value: 'your-n8n-instance.example.com' },
      { label: 'CREDS',    value: 'Gmail · Calendar'      },
      { label: 'WEBHOOK',  value: 'hermes-briefing'       },
      { label: 'BROKER',   value: 'Google Suite'          },
    ],
    link: 'https://your-n8n-instance.example.com',
    extended: [
      { label: 'Container',   value: 'n8n-stack-n8n-1'              },
      { label: 'DB',          value: 'n8n-stack-postgres-1'          },
      { label: 'Google acct', value: 'myjobsearchjune2026@gmail.com' },
      { label: 'Webhook URL', value: '/webhook/hermes-briefing'      },
      { label: 'Cache TTL',   value: '5 min (briefing endpoint)'     },
    ],
    links: [
      { label: 'n8n — Dashboard',   url: 'https://your-n8n-instance.example.com'                   },
      { label: 'n8n — Workflows',   url: 'https://your-n8n-instance.example.com/home/workflows'    },
      { label: 'n8n — Credentials', url: 'https://your-n8n-instance.example.com/home/credentials' },
      { label: 'Gmail — Inbox',     url: 'https://mail.google.com/mail/u/0/#inbox'         },
      { label: 'Google Calendar',   url: 'https://calendar.google.com/calendar/r'          },
      { label: 'Google Sheets',     url: 'https://docs.google.com/spreadsheets'            },
    ],
    notes: 'n8n acts as the Google Suite broker — all Gmail, Calendar, Sheets, and Drive access routes through n8n authenticated as myjobsearchjune2026@gmail.com. Never write directly from Hermes to chent1101@gmail.com.',
  },
  {
    id: 'telegram',
    name: 'Telegram',
    avatar: 'T',
    color: '#7289da',
    description: 'Bot gateway · Inbound/outbound messaging and voice STT pipeline.',
    stats: [
      { label: 'ALLOWED', value: '1 user'       },
      { label: 'ALLOWED', value: '1 user'        },
      { label: 'STT',     value: 'Groq (wired)' },
      { label: 'MODE',    value: 'Gateway'       },
    ],
    link: null,
    extended: [
      { label: 'Bot token',  value: 'TELEGRAM_BOT_TOKEN (.env)'   },
      { label: 'STT engine', value: 'Groq (GROQ_API_KEY pending)' },
      { label: 'Allowlist',  value: 'Configured in .env'           },
      { label: 'Gateway cmd',value: 'hermes gateway'              },
      { label: 'Status',     value: 'Token pending in .env'       },
    ],
    links: [
      { label: 'Telegram — BotFather', url: 'https://t.me/BotFather'   },
      { label: 'Telegram — Web App',   url: 'https://web.telegram.org' },
      { label: 'Groq — Console',       url: 'https://console.groq.com' },
    ],
    notes: 'Telegram gateway is gated on TELEGRAM_BOT_TOKEN and GROQ_API_KEY being confirmed in .env. Once live, Hermes will accept voice and text commands via Telegram. STT handled by Groq whisper-large-v3.',
  },
];

const AI_PROVIDERS = [
  {
    id: 'openrouter',
    name: 'OpenRouter',
    avatar: 'OR',
    color: '#a78bfa',
    description: 'Model routing · Cost-first multi-tier fallback chain across all providers.',
    stats: [
      { label: 'DEFAULT',  value: 'V4 Flash'         },
      { label: 'MID',      value: 'V4 Pro'           },
      { label: 'AGENTIC',  value: 'Kimi K2.7'        },
      { label: 'FALLBACK', value: 'Flash→Pro→Sonnet' },
    ],
    link: 'https://openrouter.ai/activity',
    extended: [
      { label: 'Flash cost',  value: '$0.09/$0.18 per M tokens'  },
      { label: 'Pro cost',    value: '$0.44/$0.87 per M tokens'  },
      { label: 'Kimi cost',   value: '$0.95/$4.00 per M tokens'  },
      { label: 'Sonnet cost', value: '$3.00/$15.00 per M tokens' },
      { label: 'Auxiliary',   value: 'Gemini 2.5 Flash (vision)' },
      { label: 'API key',     value: 'OPENROUTER_API_KEY (.env)' },
    ],
    links: [
      { label: 'OpenRouter — Activity', url: 'https://openrouter.ai/activity'      },
      { label: 'OpenRouter — Keys',     url: 'https://openrouter.ai/settings/keys' },
      { label: 'OpenRouter — Models',   url: 'https://openrouter.ai/models'        },
    ],
    notes: 'OpenRouter is the central model router for all Hermes API calls. Cost-first routing: V4 Flash for routine tasks, escalating to Pro → Kimi → Sonnet only when complexity demands it.',
  },
  {
    id: 'claude',
    name: 'Claude',
    avatar: 'C',
    color: '#c97ed5',
    description: 'Anthropic Claude · Cowork desktop cybernetic agent · Hermes OS development & agentic tasks.',
    stats: [
      { label: 'MODEL',     value: 'claude-sonnet-4-6' },
      { label: 'INTERFACE', value: 'Cowork Desktop'    },
      { label: 'PROJECT',   value: 'Hermes Agent Dev'  },
      { label: 'TIER',      value: 'Sonnet 4.6'        },
    ],
    link: 'https://console.anthropic.com',
    extended: [
      { label: 'Model string',   value: 'claude-sonnet-4-6'              },
      { label: 'Context window', value: '200k tokens'                     },
      { label: 'Tools',          value: 'Read, Write, Edit, Bash, Web'   },
      { label: 'Memory',         value: 'Persistent file-based'           },
      { label: 'Workspace',      value: 'Hermes Agent Dev (mounted)'      },
      { label: 'Other models',   value: 'Opus 4.8 · Haiku 4.5 · Fable 5'},
    ],
    links: [
      { label: 'Anthropic — Console',  url: 'https://console.anthropic.com'                                  },
      { label: 'Claude.ai',            url: 'https://claude.ai'                                              },
      { label: 'Anthropic — API Docs', url: 'https://docs.anthropic.com'                                     },
      { label: 'Claude — Models',      url: 'https://docs.anthropic.com/en/docs/about-claude/models'         },
      { label: 'Anthropic — Pricing',  url: 'https://www.anthropic.com/pricing'                              },
    ],
    notes: 'Claude (Sonnet 4.6) powers this Cowork session. Used for Hermes OS development, GTM audits, analytics research, and client deliverables. Also available as Power tier fallback through OpenRouter.',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    avatar: 'DS',
    color: '#7c6bea',
    description: 'Default model tier · V4 Flash for routine tasks · V4 Pro for analytics & drafting.',
    stats: [
      { label: 'FLASH',  value: '$0.09/$0.18 per M' },
      { label: 'PRO',    value: '$0.44/$0.87 per M' },
      { label: 'ROUTER', value: 'OpenRouter'        },
      { label: 'USE',    value: 'Hermes default'    },
    ],
    link: 'https://openrouter.ai/deepseek',
    extended: [
      { label: 'Flash model ID', value: 'deepseek/deepseek-v4-flash' },
      { label: 'Pro model ID',   value: 'deepseek/deepseek-v4-pro'   },
      { label: 'Flash context',  value: '128k tokens'                 },
      { label: 'Flash use case', value: 'Briefings, SMS, summaries'  },
      { label: 'Pro use case',   value: 'GTM analysis, doc drafting' },
      { label: 'Access',         value: 'Via OpenRouter only'        },
    ],
    links: [
      { label: 'DeepSeek on OpenRouter', url: 'https://openrouter.ai/deepseek' },
      { label: 'DeepSeek — Website',     url: 'https://www.deepseek.com'       },
      { label: 'OpenRouter — Activity',  url: 'https://openrouter.ai/activity' },
    ],
    notes: 'DeepSeek V4 Flash is Hermes\' default model. V4 Pro for mid-tier tasks. Both accessed via OpenRouter — no direct DeepSeek API key needed.',
  },
];

const ALL_AGENTS = [...HERMES_AGENTS, ...AI_PROVIDERS];
const STATUS_DEFAULTS = {
  hermes: true, n8n: null, telegram: true,
  openrouter: true, claude: true, deepseek: true,
};

// ── Hermes tabs content ───────────────────────────
function TabSkills() {
  const cats = [...new Set(HERMES_SKILLS.map(s => s.category))];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {cats.map(cat => (
        <div key={cat} className="km-section">
          <div className="km-section-label" style={{ color: CAT_COLORS[cat] }}>{cat.toUpperCase()}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {HERMES_SKILLS.filter(s => s.category === cat).map(skill => (
              <div key={skill.name} className="am-skill-row">
                <div className="am-skill-name" style={{ color: CAT_COLORS[cat] }}>{skill.name}</div>
                <div className="am-skill-desc">{skill.desc}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TabConnectors() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {HERMES_CONNECTORS.map(c => {
        const risk = RISK_META[c.risk];
        return (
          <div key={c.id} className="am-connector-row" style={{ borderColor: risk.color + '30' }}>
            <div className="am-connector-head">
              <span className="am-connector-name">{c.name}</span>
              <span className="am-risk-badge" style={{ color: risk.color, background: risk.bg }}>{risk.label}</span>
            </div>
            <div className="am-connector-desc">{c.desc}</div>
            <div className="am-access-list">
              {c.access.map((a, i) => (
                <span key={i} className="am-access-chip">✓ {a}</span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TabSecurity() {
  const sorted = [...HERMES_CONNECTORS].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.risk] - order[b.risk];
  });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="am-security-summary">
        {Object.entries(RISK_META).map(([key, meta]) => {
          const count = HERMES_CONNECTORS.filter(c => c.risk === key).length;
          return (
            <div key={key} className="am-summary-chip" style={{ borderColor: meta.color + '40', background: meta.bg }}>
              <span style={{ color: meta.color, fontWeight: 700 }}>{count}</span>
              <span style={{ color: meta.color }}>{meta.label}</span>
            </div>
          );
        })}
      </div>
      {sorted.map(c => {
        const risk = RISK_META[c.risk];
        return (
          <div key={c.id} className="am-connector-row" style={{ borderColor: risk.color + '30' }}>
            <div className="am-connector-head">
              <span className="am-connector-name">{c.name}</span>
              <span className="am-risk-badge" style={{ color: risk.color, background: risk.bg }}>{risk.label}</span>
            </div>
            <div className="am-connector-desc" style={{ marginBottom: 8 }}>{c.desc}</div>
            <div className="km-section-label" style={{ marginBottom: 5 }}>MITIGATIONS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {c.mitigations.map((m, i) => (
                <div key={i} className="am-mitigation-row">
                  <span className="am-mitigation-dot" style={{ color: risk.color }}>▸</span>
                  <span className="am-mitigation-text">{m}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Agent Modal ───────────────────────────────────
const MODAL_TABS = ['OVERVIEW', 'SKILLS', 'CONNECTORS', 'SECURITY'];

function AgentModal({ def, online, onClose }) {
  const [tab, setTab] = useState('OVERVIEW');
  const isHermes = def.id === 'hermes';

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);

  const sc = online === true ? 'live' : online === false ? 'down' : 'unknown';
  const badgeLabel = sc === 'live' ? 'ONLINE' : sc === 'down' ? 'OFFLINE' : 'CHECKING';

  return (
    <div className="km-overlay" onClick={onClose}>
      <div className="km-modal am-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="km-modal-head" style={{ borderColor: def.color + '44' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="am-avatar" style={{ background: def.color + '22', borderColor: def.color + '55' }}>
              <span style={{ color: def.color, fontSize: def.avatar.length > 1 ? '11px' : '18px', fontWeight: 700 }}>
                {def.avatar}
              </span>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div className="km-modal-title" style={{ color: def.color }}>{def.name}</div>
                <span className={`mc-badge badge-${sc}`} style={{ position: 'static' }}>{badgeLabel}</span>
              </div>
              <div className="km-modal-meta">{def.description}</div>
            </div>
          </div>
          <button className="km-close" onClick={onClose}>✕</button>
        </div>

        {/* Tabs (Hermes only) */}
        {isHermes && (
          <div className="am-tab-bar">
            {MODAL_TABS.map(t => (
              <button
                key={t}
                className={`am-tab${tab === t ? ' active' : ''}`}
                style={tab === t ? { color: def.color, borderBottomColor: def.color } : {}}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        <div className="km-modal-body">

          {/* OVERVIEW tab (default for all agents) */}
          {(!isHermes || tab === 'OVERVIEW') && (
            <>
              {def.notes && (
                <div className="km-section">
                  <div className="km-section-label">OVERVIEW</div>
                  <div className="am-notes">{def.notes}</div>
                </div>
              )}
              <div className="am-detail-grid">
                <div className="km-section">
                  <div className="km-section-label">CORE STATS</div>
                  <div className="am-kv-list">
                    {def.stats.map(s => (
                      <div key={s.label} className="am-kv-row">
                        <span className="am-kv-key">{s.label}</span>
                        <span className="am-kv-val">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {def.extended?.length > 0 && (
                  <div className="km-section">
                    <div className="km-section-label">EXTENDED</div>
                    <div className="am-kv-list">
                      {def.extended.map(s => (
                        <div key={s.label} className="am-kv-row">
                          <span className="am-kv-key">{s.label}</span>
                          <span className="am-kv-val">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {def.links?.length > 0 && (
                <div className="km-section">
                  <div className="km-section-label">LINKS</div>
                  <div className="am-links">
                    {def.links.map((lnk, i) => (
                      <a key={i} href={lnk.url} target="_blank" rel="noopener noreferrer" className="km-link">
                        ↗ {lnk.label}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {isHermes && tab === 'SKILLS'     && <TabSkills />}
          {isHermes && tab === 'CONNECTORS' && <TabConnectors />}
          {isHermes && tab === 'SECURITY'   && <TabSecurity />}

        </div>

        <div className="km-modal-foot" style={{ justifyContent: 'flex-end' }}>
          {def.link && (
            <a href={def.link} target="_blank" rel="noopener noreferrer"
              className="km-btn-save" style={{ textDecoration: 'none', display: 'inline-block' }}>
              OPEN CONTROL ROOM →
            </a>
          )}
          <button className="km-btn-cancel" onClick={onClose}>CLOSE</button>
        </div>

      </div>
    </div>
  );
}

// ── Status Ribbon ─────────────────────────────────
function StatusRibbon({ statuses }) {
  const liveCount = Object.values(statuses).filter(v => v === true).length;
  return (
    <div className="mc-ribbon">
      {ALL_AGENTS.map(a => {
        const online = statuses[a.id];
        const sc = online === true ? 'live' : online === false ? 'down' : 'unknown';
        return (
          <div key={a.id} className={`mc-ribbon-card ribbon-${sc}`}>
            <div className="rc-name">{a.name.toUpperCase()}</div>
            <div className="rc-indicator">
              <span className={`rc-dot dot-${sc}`} />
              <span className="rc-label">{sc === 'live' ? 'LIVE' : sc === 'down' ? 'DOWN' : '···'}</span>
            </div>
          </div>
        );
      })}
      <div className="mc-ribbon-card ribbon-meta">
        <div className="rc-name">ALL SYSTEMS</div>
        <div className="rc-indicator">
          <span className="rc-dot dot-live" />
          <span className="rc-label">{liveCount}/{ALL_AGENTS.length}</span>
        </div>
      </div>
    </div>
  );
}

// ── Usage Banner ──────────────────────────────────
function UsageBanner({ usage }) {
  if (!usage) return null;
  const spent = typeof usage.usage === 'number' ? `$${usage.usage.toFixed(4)}` : '—';
  const limit = usage.limit ? `$${usage.limit}` : 'Unlimited';
  const rate  = usage.rate_limit ? `${usage.rate_limit.requests} req / ${usage.rate_limit.interval}` : '—';
  return (
    <div className="mc-usage-banner">
      <div className="mc-usage-item">
        <span className="mc-usage-label">OR SPEND</span>
        <span className="mc-usage-val">{spent}</span>
      </div>
      <div className="mc-usage-sep" />
      <div className="mc-usage-item">
        <span className="mc-usage-label">LIMIT</span>
        <span className="mc-usage-val">{limit}</span>
      </div>
      <div className="mc-usage-sep" />
      <div className="mc-usage-item">
        <span className="mc-usage-label">RATE LIMIT</span>
        <span className="mc-usage-val">{rate}</span>
      </div>
      <div className="mc-usage-sep" />
      <div className="mc-usage-item">
        <span className="mc-usage-label">TIER</span>
        <span className="mc-usage-val">{usage.is_free_tier ? 'Free' : 'Paid'}</span>
      </div>
      <a href="https://openrouter.ai/activity" target="_blank" rel="noopener noreferrer" className="mc-usage-link">
        FULL USAGE →
      </a>
    </div>
  );
}

// ── Agent Card ────────────────────────────────────
function AgentCard({ def, online, orUsage, onSelect }) {
  const sc = online === true ? 'live' : online === false ? 'down' : 'unknown';
  const badgeLabel = sc === 'live' ? 'ONLINE' : sc === 'down' ? 'OFFLINE' : 'CHECKING';
  const stats = (def.id === 'openrouter' && orUsage)
    ? [
        { label: 'SPEND', value: typeof orUsage.usage === 'number' ? `$${orUsage.usage.toFixed(4)}` : '—' },
        { label: 'LIMIT', value: orUsage.limit ? `$${orUsage.limit}` : 'Unlimited' },
        { label: 'RATE',  value: orUsage.rate_limit ? `${orUsage.rate_limit.requests}/${orUsage.rate_limit.interval}` : '—' },
        { label: 'TIER',  value: orUsage.is_free_tier ? 'Free' : 'Paid' },
      ]
    : def.stats;

  return (
    <div className="mc-card mc-card-clickable" style={{ '--card-color': def.color }} onClick={() => onSelect(def)}>
      <div className="mc-card-top">
        <div className="mc-avatar" style={{ background: def.color + '22', borderColor: def.color + '55' }}>
          <span style={{ color: def.color, fontSize: def.avatar.length > 1 ? '10px' : undefined, fontWeight: 700 }}>
            {def.avatar}
          </span>
        </div>
        <div className="mc-card-head">
          <div className="mc-agent-name">{def.name}</div>
          <span className={`mc-badge badge-${sc}`}>{badgeLabel}</span>
        </div>
      </div>
      <div className="mc-desc">{def.description}</div>
      <div className="mc-stats">
        {stats.map(s => (
          <div key={s.label} className="mc-stat">
            <div className="mc-stat-label">{s.label}</div>
            <div className="mc-stat-value">{s.value}</div>
          </div>
        ))}
      </div>
      {def.link ? (
        <a className="mc-ctrl-link" href={def.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
          OPEN CONTROL ROOM →
        </a>
      ) : (
        <div className="mc-ctrl-link disabled">OPEN CONTROL ROOM →</div>
      )}
    </div>
  );
}

// ── MissionControl ────────────────────────────────
export default function MissionControl({ token }) {
  const [statuses, setStatuses] = useState(STATUS_DEFAULTS);
  const [orUsage,  setOrUsage]  = useState(null);
  const [selected, setSelected] = useState(null);

  const fetchStatuses = useCallback(async () => {
    try {
      const r = await fetch('/api/agents', { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) return;
      const agents = await r.json();
      const map = {};
      agents.forEach(a => { map[a.id] = a.online; });
      setStatuses(prev => ({ ...prev, ...map }));
    } catch {}
  }, [token]);

  const fetchUsage = useCallback(async () => {
    try {
      const r = await fetch('/api/openrouter-usage', { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) return;
      const data = await r.json();
      if (data?.data) setOrUsage(data.data);
    } catch {}
  }, [token]);

  useEffect(() => {
    fetchStatuses();
    fetchUsage();
    const id = setInterval(fetchStatuses, 60_000);
    return () => clearInterval(id);
  }, [fetchStatuses, fetchUsage]);

  return (
    <>
      <div className="mc-view">
        <div className="mc-header">
          <div className="mc-title">Control Nexus</div>
          <div className="mc-sub">Status of every cybernetic agent, every workflow, every signal.</div>
        </div>
        <StatusRibbon statuses={statuses} />
        <UsageBanner usage={orUsage} />
        <div className="mc-section-label">HERMES CYBERNETIC AGENTS</div>
        <div className="mc-cards-grid">
          {HERMES_AGENTS.map(def => (
            <AgentCard key={def.id} def={def} online={statuses[def.id]} onSelect={setSelected} />
          ))}
        </div>
        <div className="mc-section-label" style={{ marginTop: 20 }}>AI PROVIDERS</div>
        <div className="mc-cards-grid">
          {AI_PROVIDERS.map(def => (
            <AgentCard key={def.id} def={def} online={statuses[def.id]} orUsage={orUsage} onSelect={setSelected} />
          ))}
        </div>
      </div>

      {selected && (
        <AgentModal def={selected} online={statuses[selected.id]} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
