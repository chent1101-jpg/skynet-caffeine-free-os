import { useState, useRef, useCallback, useEffect } from 'react';

const KB_KEY = 'hermes_kb_v3';

const KB_DEFAULT = {
  backlog: [
    {
      id: 'k1', title: 'Tinuiti interview prep brief',
      meta: 'Jenn Ashcroft · Jul 7 @ 9:30am MT', tag: 'personal',
      notes: 'Recruiter screen scheduled. Need to prep analytics portfolio talking points and research Tinuiti stack.',
      links: [
        { label: 'Gmail — Tinuiti thread', url: 'https://mail.google.com/mail/u/0/#search/Tinuiti' },
        { label: 'Calendar — Jul 7 interview', url: 'https://calendar.google.com/calendar/r/search?q=Tinuiti' },
        { label: 'Tinuiti website', url: 'https://tinuiti.com' },
      ],
    },
    {
      id: 'k2', title: 'ARSA GTM audit delivery',
      meta: 'Jean Cardenas · 4 containers · OVERDUE', tag: 'client',
      notes: 'Audit covers 4 GTM containers. Deliverable is a DOCX report with recommendations.',
      links: [
        { label: 'Gmail — ARSA thread', url: 'https://mail.google.com/mail/u/0/#search/ARSA' },
        { label: 'GTM — Container list', url: 'https://tagmanager.google.com/' },
      ],
    },
    {
      id: 'k3', title: 'HAN Staffing rate confirmation',
      meta: '$63/hr W2 remote', tag: 'personal',
      notes: 'Waiting on signed rate confirmation. $63/hr W2 remote arrangement.',
      links: [
        { label: 'Gmail — HAN Staffing thread', url: 'https://mail.google.com/mail/u/0/#search/HAN+Staffing' },
      ],
    },
    {
      id: 'k4', title: 'Wire n8n credentials + test run',
      meta: 'Gmail OAuth + Calendar OAuth', tag: 'hermes',
      notes: 'Authenticate Gmail and Google Calendar in n8n. Run test briefing webhook to verify data flow.',
      links: [
        { label: 'n8n — Credentials', url: 'https://your-n8n-instance.example.com/home/credentials' },
        { label: 'n8n — Workflows', url: 'https://your-n8n-instance.example.com/home/workflows' },
        { label: 'Google OAuth consent', url: 'https://console.cloud.google.com/apis/credentials' },
      ],
    },
    {
      id: 'k5', title: 'VPS + n8n backup setup',
      meta: 'Calendar: Jul 7 @ 9am', tag: 'hermes',
      notes: 'Configure automated VPS snapshot and n8n workflow export backup. Store to Drive via n8n.',
      links: [
        { label: 'Calendar — VPS backup task', url: 'https://calendar.google.com/calendar/r/search?q=VPS+backup' },
        { label: 'n8n — Workflows', url: 'https://your-n8n-instance.example.com/home/workflows' },
      ],
    },
  ],
  active: [
    {
      id: 'k6', title: 'Woodmark Hotel — Statsig experiment',
      meta: 'Selfbook vs SynXis · cross-domain stableID', tag: 'client',
      notes: 'A/B test: Selfbook widget vs SynXis redirect. StableID threads across domains via hidden GET param. HTTP conversion logging on Domain B.',
      links: [
        { label: 'Gmail — Woodmark thread', url: 'https://mail.google.com/mail/u/0/#search/Woodmark' },
        { label: 'Statsig dashboard', url: 'https://console.statsig.com' },
        { label: 'Woodmark Hotel site', url: 'https://www.woodmarkhotel.com' },
        { label: 'SynXis booking engine', url: 'https://be.synxis.com' },
        { label: 'GTM — Woodmark container', url: 'https://tagmanager.google.com/' },
      ],
    },
    {
      id: 'k7', title: 'PRMA — GTM/GA4 QA',
      meta: 'Multi-site portfolio', tag: 'client',
      notes: 'QA conversion tracking across PRMA multi-site portfolio. Verify GA4 events firing correctly on all properties.',
      links: [
        { label: 'Gmail — PRMA thread', url: 'https://mail.google.com/mail/u/0/#search/PRMA' },
        { label: 'GTM — Container list', url: 'https://tagmanager.google.com/' },
        { label: 'GA4 — Analytics', url: 'https://analytics.google.com/' },
      ],
    },
    {
      id: 'k8', title: 'Hinckley Yachts — sGTM pixel',
      meta: 'Stape.io server-side tracking', tag: 'client',
      notes: 'Implement server-side pixel tracking via Stape.io sGTM container. Configure event forwarding.',
      links: [
        { label: 'Gmail — Hinckley thread', url: 'https://mail.google.com/mail/u/0/#search/Hinckley' },
        { label: 'Stape.io dashboard', url: 'https://app.stape.io' },
        { label: 'Hinckley Yachts site', url: 'https://www.hinckleyyachts.com' },
        { label: 'GTM — sGTM container', url: 'https://tagmanager.google.com/' },
      ],
    },
    {
      id: 'k9', title: 'Hermes OS v2 React',
      meta: 'Building now', tag: 'hermes',
      notes: 'Full mission control dashboard. Sidebar nav, D3 graph, Kanban, Briefing, Goals, Notes.',
      links: [
        { label: 'Local dev — localhost:5173', url: 'http://localhost:5173' },
        { label: 'n8n — Briefing webhook', url: 'https://your-n8n-instance.example.com/home/workflows' },
      ],
    },
  ],
  done: [
    {
      id: 'k10', title: 'SOUL.md deployed',
      meta: 'Persona + values', tag: 'hermes',
      notes: 'SOUL.md persona file deployed to /opt/data/.hermes/SOUL.md on VPS.',
      links: [],
    },
    {
      id: 'k11', title: 'Hermes Telegram gateway',
      meta: 'Live and responding', tag: 'hermes',
      notes: 'Telegram bot token configured. Gateway live and responding to allowlisted user.',
      links: [
        { label: 'Telegram — BotFather', url: 'https://t.me/BotFather' },
      ],
    },
    {
      id: 'k12', title: 'Cron jobs active (2)',
      meta: 'Daily briefing + nightly report', tag: 'hermes',
      notes: 'Two cron jobs running: daily morning briefing at 7am MT, nightly n8n run report at 10pm MT.',
      links: [
        { label: 'n8n — Workflows', url: 'https://your-n8n-instance.example.com/home/workflows' },
      ],
    },
    {
      id: 'k13', title: 'DeepSeek V4 Flash default',
      meta: 'Cost-optimized routing active', tag: 'hermes',
      notes: 'Default model set to deepseek/deepseek-v4-flash via OpenRouter. $0.09/M input.',
      links: [
        { label: 'OpenRouter dashboard', url: 'https://openrouter.ai/activity' },
      ],
    },
    {
      id: 'k14', title: 'Hermes OS v1 artifact',
      meta: 'Live email + calendar dashboard', tag: 'hermes',
      notes: 'v1 HTML artifact with briefing panel. Superseded by v2 React app.',
      links: [],
    },
  ],
};

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(KB_KEY));
    if (!stored) return structuredClone(KB_DEFAULT);
    // Migrate: ensure links/notes fields exist
    ['backlog','active','done'].forEach(col => {
      (stored[col] || []).forEach(c => {
        if (!c.links) c.links = [];
        if (!c.notes) c.notes = '';
      });
    });
    return stored;
  } catch { return structuredClone(KB_DEFAULT); }
}

const COLS = [
  { key: 'backlog', label: 'BACKLOG',     cls: 'backlog' },
  { key: 'active',  label: 'IN PROGRESS', cls: 'active'  },
  { key: 'done',    label: 'DONE',        cls: 'done'    },
];

const TAG_COLORS = { client: '#00c8ff', hermes: '#a78bfa', personal: '#f5a623' };

// ── Card Modal ───────────────────────────────────
function CardModal({ card, colKey, onClose, onSave, onDelete }) {
  const [notes, setNotes] = useState(card.notes || '');
  const [links, setLinks] = useState(card.links || []);
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl]     = useState('');

  // Close on Escape
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);

  function addLink() {
    const label = newLabel.trim();
    const url   = newUrl.trim();
    if (!label || !url) return;
    setLinks(l => [...l, { label, url }]);
    setNewLabel(''); setNewUrl('');
  }

  function removeLink(i) {
    setLinks(l => l.filter((_, idx) => idx !== i));
  }

  function handleSave() {
    onSave({ ...card, notes, links });
  }

  const tagColor = TAG_COLORS[card.tag] || '#6a959d';

  return (
    <div className="km-overlay" onClick={onClose}>
      <div className="km-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="km-modal-head" style={{ borderColor: tagColor + '44' }}>
          <div>
            <div className="km-modal-tag" style={{ color: tagColor }}>{card.tag?.toUpperCase()}</div>
            <div className="km-modal-title">{card.title}</div>
            {card.meta && <div className="km-modal-meta">{card.meta}</div>}
          </div>
          <button className="km-close" onClick={onClose}>✕</button>
        </div>

        <div className="km-modal-body">

          {/* Links */}
          <div className="km-section">
            <div className="km-section-label">LINKS</div>
            {links.length === 0 && (
              <div className="km-empty">No links yet.</div>
            )}
            {links.map((lnk, i) => (
              <div key={i} className="km-link-row">
                <a href={lnk.url} target="_blank" rel="noopener noreferrer" className="km-link">
                  ↗ {lnk.label}
                </a>
                <button className="km-link-del" onClick={() => removeLink(i)}>✕</button>
              </div>
            ))}

            {/* Add link */}
            <div className="km-add-link">
              <input
                className="km-input"
                placeholder="Label"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addLink()}
              />
              <input
                className="km-input"
                placeholder="https://..."
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addLink()}
              />
              <button className="km-add-btn" onClick={addLink}>+ ADD</button>
            </div>
          </div>

          {/* Notes */}
          <div className="km-section">
            <div className="km-section-label">NOTES</div>
            <textarea
              className="km-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add context, blockers, or next steps..."
              rows={4}
            />
          </div>

        </div>

        {/* Footer */}
        <div className="km-modal-foot">
          <button className="km-btn-delete" onClick={() => onDelete(card.id, colKey)}>DELETE CARD</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="km-btn-cancel" onClick={onClose}>CANCEL</button>
            <button className="km-btn-save" onClick={handleSave}>SAVE</button>
          </div>
        </div>

      </div>
    </div>
  );
}

// ── KanbanBoard ──────────────────────────────────
export default function KanbanBoard() {
  const [kb, setKb]           = useState(loadState);
  const [selected, setSelected] = useState(null); // { card, colKey }
  const drag = useRef({ id: null, col: null, targetId: null, before: true, moved: false });

  function save(next) {
    setKb(next);
    localStorage.setItem(KB_KEY, JSON.stringify(next));
  }

  function moveCard(id, colKey, dir) {
    const next  = structuredClone(kb);
    const cards = next[colKey];
    const idx   = cards.findIndex(c => c.id === id);
    if (idx === -1) return;
    if (dir === 'up'   && idx > 0)                [cards[idx-1], cards[idx]] = [cards[idx], cards[idx-1]];
    if (dir === 'down' && idx < cards.length - 1) [cards[idx], cards[idx+1]] = [cards[idx+1], cards[idx]];
    save(next);
  }

  function addCard(colKey) {
    const title = window.prompt('Card title:');
    if (!title?.trim()) return;
    const meta   = window.prompt('Sub-label (optional):') || '';
    const tagRaw = window.prompt('Tag: client / hermes / personal') || 'personal';
    const tag    = ['client','hermes','personal'].includes(tagRaw.trim().toLowerCase())
      ? tagRaw.trim().toLowerCase() : 'personal';
    const next = structuredClone(kb);
    next[colKey].unshift({ id: 'k' + Date.now(), title: title.trim(), meta: meta.trim(), tag, notes: '', links: [] });
    save(next);
  }

  function updateCard(updated, colKey) {
    const next = structuredClone(kb);
    const idx  = next[colKey].findIndex(c => c.id === updated.id);
    if (idx !== -1) next[colKey][idx] = updated;
    save(next);
    setSelected(null);
  }

  function deleteCard(id, colKey) {
    if (!window.confirm('Delete this card?')) return;
    const next = structuredClone(kb);
    next[colKey] = next[colKey].filter(c => c.id !== id);
    save(next);
    setSelected(null);
  }

  // ── drag handlers ────────────────────────────────
  function onDragStart(e, id, col) {
    drag.current = { id, col, targetId: null, before: true, moved: false };
    setTimeout(() => {
      document.querySelectorAll(`[data-cardid="${id}"]`).forEach(el => el.classList.add('dragging'));
    }, 0);
    e.dataTransfer.effectAllowed = 'move';
  }

  function onDragEnd() {
    drag.current.moved = true; // mark as dragged so click doesn't fire
    setTimeout(() => { drag.current.moved = false; }, 100);
    document.querySelectorAll('.k-card').forEach(el => el.classList.remove('dragging','drop-above','drop-below'));
    document.querySelectorAll('.k-col').forEach(el => el.classList.remove('drop-over'));
  }

  function onCardDragOver(e, cardId) {
    e.preventDefault();
    e.stopPropagation();
    if (drag.current.id === cardId) return;
    const el     = e.currentTarget;
    const rect   = el.getBoundingClientRect();
    const before = e.clientY < rect.top + rect.height / 2;
    document.querySelectorAll('.k-card').forEach(c => c.classList.remove('drop-above','drop-below'));
    el.classList.add(before ? 'drop-above' : 'drop-below');
    drag.current.targetId = cardId;
    drag.current.before   = before;
    e.currentTarget.closest('.k-col')?.classList.remove('drop-over');
  }

  function onCardDrop(e, cardId, colKey) {
    e.preventDefault();
    e.stopPropagation();
    document.querySelectorAll('.k-card').forEach(c => c.classList.remove('drop-above','drop-below'));
    const { id: srcId, col: srcCol } = drag.current;
    if (!srcId || srcId === cardId) return;
    const next    = structuredClone(kb);
    const srcCard = next[srcCol].find(c => c.id === srcId);
    if (!srcCard) return;
    next[srcCol] = next[srcCol].filter(c => c.id !== srcId);
    const tgtIdx = next[colKey].findIndex(c => c.id === cardId);
    const ins    = drag.current.before ? tgtIdx : tgtIdx + 1;
    next[colKey].splice(ins < 0 ? 0 : ins, 0, srcCard);
    drag.current = { id: null, col: null, targetId: null, before: true, moved: false };
    save(next);
  }

  function onColDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drop-over');
  }

  function onColDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      e.currentTarget.classList.remove('drop-over');
    }
  }

  function onColDrop(e, colKey) {
    e.preventDefault();
    e.currentTarget.classList.remove('drop-over');
    document.querySelectorAll('.k-card').forEach(c => c.classList.remove('drop-above','drop-below'));
    if (drag.current.targetId) { drag.current.targetId = null; return; }
    const { id: srcId, col: srcCol } = drag.current;
    if (!srcId) return;
    const next    = structuredClone(kb);
    const srcCard = next[srcCol].find(c => c.id === srcId);
    if (!srcCard) return;
    next[srcCol] = next[srcCol].filter(c => c.id !== srcId);
    next[colKey].push(srcCard);
    drag.current = { id: null, col: null, targetId: null, before: true, moved: false };
    save(next);
  }

  function handleCardClick(card, colKey) {
    if (drag.current.moved) return; // skip if user just finished dragging
    setSelected({ card, colKey });
  }

  return (
    <>
      <div className="kanban-wrap">
        {COLS.map(col => {
          const cards = kb[col.key] || [];
          return (
            <div
              key={col.key}
              className={`k-col ${col.cls}`}
              onDragOver={onColDragOver}
              onDragLeave={onColDragLeave}
              onDrop={e => onColDrop(e, col.key)}
            >
              <div className="k-col-head">
                <div>
                  <div className="k-col-title">{col.label}</div>
                  <div className="k-col-bar" />
                </div>
                <div className="k-count">{cards.length}</div>
              </div>

              <div className="k-cards">
                {cards.map((card, i) => (
                  <div
                    key={card.id}
                    className="k-card"
                    data-tag={card.tag || ''}
                    data-cardid={card.id}
                    draggable
                    onClick={() => handleCardClick(card, col.key)}
                    onDragStart={e => onDragStart(e, card.id, col.key)}
                    onDragEnd={onDragEnd}
                    onDragOver={e => onCardDragOver(e, card.id)}
                    onDrop={e => onCardDrop(e, card.id, col.key)}
                  >
                    <div className="k-card-inner">
                      <div className="k-card-body">
                        <div className="k-tag">{card.tag}</div>
                        <div className="k-title">{card.title}</div>
                        {card.meta && <div className="k-meta">{card.meta}</div>}
                        {card.links?.length > 0 && (
                          <div className="k-link-hint">{card.links.length} link{card.links.length > 1 ? 's' : ''}</div>
                        )}
                      </div>
                      <div className="k-card-actions">
                        <button
                          className="k-move-btn"
                          disabled={i === 0}
                          onClick={e => { e.stopPropagation(); moveCard(card.id, col.key, 'up'); }}
                          title="Move up"
                        >↑</button>
                        <button
                          className="k-move-btn"
                          disabled={i === cards.length - 1}
                          onClick={e => { e.stopPropagation(); moveCard(card.id, col.key, 'down'); }}
                          title="Move down"
                        >↓</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button className="k-add-btn" onClick={() => addCard(col.key)}>+ ADD CARD</button>
            </div>
          );
        })}
      </div>

      {selected && (
        <CardModal
          card={selected.card}
          colKey={selected.colKey}
          onClose={() => setSelected(null)}
          onSave={(updated) => updateCard(updated, selected.colKey)}
          onDelete={deleteCard}
        />
      )}
    </>
  );
}
