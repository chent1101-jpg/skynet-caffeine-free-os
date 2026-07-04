import { useState } from 'react';

const NT_KEY = 'hermes_notes_v2';
const LP_KEY = 'hermes_loops_v3';

const LP_DEFAULT = [
  { id: 'l1', text: 'Tinuiti interview — Jenn Ashcroft, Jul 7 @ 9:30am MT', done: false, pri: '🔴' },
  { id: 'l2', text: 'ARSA GTM audit delivery — Jean Cardenas',               done: false, pri: '🔴' },
  { id: 'l3', text: 'HAN Staffing rate confirmation — $63/hr W2',            done: false, pri: '🟡' },
  { id: 'l4', text: 'Wire n8n credentials (Gmail + Calendar) + test run',    done: false, pri: '🟡' },
  { id: 'l5', text: 'VPS + n8n backup setup',                                done: false, pri: '🟡' },
  { id: 'l6', text: 'Verify nightly cron fires tonight (11pm MT)',            done: false, pri: '🟢' },
  { id: 'l7', text: 'Archive n8n Morning Digest workflow',                    done: false, pri: '🟢' },
];

function loadNotes() {
  try { return localStorage.getItem(NT_KEY) || ''; } catch { return ''; }
}

function loadLoops() {
  try { return JSON.parse(localStorage.getItem(LP_KEY)) || structuredClone(LP_DEFAULT); }
  catch { return structuredClone(LP_DEFAULT); }
}

export default function NotesPanel() {
  const [notes, setNotes] = useState(loadNotes);
  const [loops, setLoops] = useState(loadLoops);

  function saveNotes(v) {
    setNotes(v);
    try { localStorage.setItem(NT_KEY, v); } catch {}
  }

  function saveLoops(next) {
    setLoops(next);
    try { localStorage.setItem(LP_KEY, JSON.stringify(next)); } catch {}
  }

  function toggleLoop(id) {
    saveLoops(loops.map(l => l.id === id ? { ...l, done: !l.done } : l));
  }

  function addLoop() {
    const text = window.prompt('Open loop:');
    if (!text?.trim()) return;
    const priRaw = window.prompt('Priority: 🔴 / 🟡 / 🟢') || '🟡';
    const pri = ['🔴','🟡','🟢'].includes(priRaw.trim()) ? priRaw.trim() : '🟡';
    saveLoops([...loops, { id: 'l' + Date.now(), text: text.trim(), done: false, pri }]);
  }

  return (
    <>
      <div className="panel-head">
        <span className="panel-label">// Notes + Open Loops</span>
      </div>
      <div className="panel-body" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="section-title">SCRATCHPAD</div>
        <div className="notes-box">
          <textarea
            className="notes-ta"
            placeholder="type here..."
            value={notes}
            onChange={e => saveNotes(e.target.value)}
          />
        </div>

        <div className="divider" />

        <div className="section-title">OPEN LOOPS</div>
        <div>
          {loops.map(l => (
            <div key={l.id} className="loop-item">
              <div
                className={`loop-check${l.done ? ' checked' : ''}`}
                onClick={() => toggleLoop(l.id)}
              >
                {l.done ? '✓' : ''}
              </div>
              <div className={`loop-text${l.done ? ' done' : ''}`}>{l.text}</div>
              <div className="loop-pri">{l.pri}</div>
            </div>
          ))}
        </div>
        <button className="btn-add-loop" onClick={addLoop}>+ ADD LOOP</button>
      </div>
    </>
  );
}
