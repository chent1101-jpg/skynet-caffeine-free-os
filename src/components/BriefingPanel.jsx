import { useState, useEffect, useCallback } from 'react';

const HIGHLIGHT = /interview|tinuiti|smarty|client|call|zoom/i;
const AUTO_REFRESH_MS = 5 * 60 * 1000; // 5 min

export default function BriefingPanel({ token, onUnauth }) {
  const [state, setState] = useState({ loading: true, emails: [], events: [], error: null, ts: null, cached: false });

  const load = useCallback(async (force = false) => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const r = await fetch(`/api/briefing${force ? '?force=1' : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.status === 401) { onUnauth(); return; }
      const data = await r.json();
      setState({
        loading: false,
        emails:  Array.isArray(data.emails) ? data.emails : [],
        events:  Array.isArray(data.events) ? data.events : [],
        error:   data.error || null,
        ts:      new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Denver' }),
        cached:  !!data.cached,
      });
    } catch (err) {
      setState(s => ({ ...s, loading: false, error: err.message }));
    }
  }, [token, onUnauth]);

  // Initial load + auto-refresh
  useEffect(() => {
    load();
    const id = setInterval(() => load(), AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  return (
    <>
      <div className="panel-head">
        <span className="panel-label">// Daily Briefing</span>
        <button className="btn-refresh" onClick={() => load(true)} disabled={state.loading}>
          ↻ REFRESH
        </button>
      </div>
      <div className="panel-body">
        {state.loading ? (
          <div className="loading-row">
            <div className="ld" /><div className="ld" /><div className="ld" />
            <span>FETCHING DATA...</span>
          </div>
        ) : (
          <>
            <div className="section-title">TODAY&apos;S CALENDAR</div>
            {state.events.length === 0 ? (
              <div style={{ color: '#6a959d', fontFamily: 'SF Mono, monospace', fontSize: 12 }}>No events today.</div>
            ) : (
              state.events.map(ev => {
                const title   = ev.summary || ev.title || '(no title)';
                const rawTime = ev.start?.dateTime || ev.start?.date || '';
                const time    = rawTime
                  ? new Date(rawTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Denver' })
                  : 'All day';
                const url = ev.htmlLink || 'https://calendar.google.com/calendar/r';
                return (
                  <a key={ev.id || title} className="cal-item" href={url} target="_blank" rel="noopener noreferrer">
                    <div className="cal-time">{time}</div>
                    <div className={`cal-name${HIGHLIGHT.test(title) ? ' highlight' : ''}`}>{title}</div>
                  </a>
                );
              })
            )}

            <div className="section-title" style={{ marginTop: 16 }}>INBOX</div>
            {state.error && <div className="error-row">⚠ {state.error}</div>}
            {state.emails.length === 0 && !state.error ? (
              <div style={{ color: '#6a959d', fontFamily: 'SF Mono, monospace', fontSize: 12 }}>Inbox clear.</div>
            ) : (
              state.emails.slice(0, 10).map(email => {
                const threadId = email.id || email.threadId;
                const url = threadId
                  ? `https://mail.google.com/mail/u/0/#inbox/${threadId}`
                  : 'https://mail.google.com/mail/u/0/#inbox';
                const cls = email.classification === 'ACTION' ? 'action'
                          : email.classification === 'MONITOR' ? 'monitor' : '';
                return (
                  <a key={threadId || email.subject} className={`email-card ${cls}`} href={url} target="_blank" rel="noopener noreferrer">
                    <div className="email-from">{email.from || email.senderName || ''}</div>
                    <div className="email-subj">{email.subject || email.snippet || ''}</div>
                    {email.snippet && email.subject && (
                      <div className="email-snippet">{email.snippet}</div>
                    )}
                    {cls && (
                      <span className={`badge badge-${cls}`}>{email.classification}</span>
                    )}
                  </a>
                );
              })
            )}

            {state.ts && (
              <div className="briefing-meta">
                UPDATED {state.ts} MT{state.cached ? ' · CACHED' : ''}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
