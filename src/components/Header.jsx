import { useState, useEffect } from 'react';

const DAYS   = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

function getMT() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Denver' }));
}

export default function Header({ onLogout }) {
  const [now, setNow] = useState(getMT());

  useEffect(() => {
    const id = setInterval(() => setNow(getMT()), 1000);
    return () => clearInterval(id);
  }, []);

  const dateStr = `${DAYS[now.getDay()]} · ${MONTHS[now.getMonth()]} ${now.getDate()} · ${now.getFullYear()}`;
  const timeStr = now.toLocaleTimeString('en-US', { hour12: false });

  return (
    <div className="header">
      <div className="logo-wrap">
        <div className="logo-stack">
          <div className="logo-row">
            <div className="logo">Skynet</div>
            <div className="logo-tag">OS v2.0</div>
          </div>
          <div className="logo-sub">Caffeine Free</div>
        </div>
      </div>
      <div className="clock-wrap">
        <div className="clock-date">{dateStr}</div>
        <div className="clock-time">{timeStr}</div>
      </div>
      <div className="header-right">
        <div className="status-pill">
          <div className="pill-dot" />
          <div className="pill-text">ONLINE</div>
        </div>
        <button className="btn-logout" onClick={onLogout} title="Sign out">LOGOUT</button>
      </div>
    </div>
  );
}
