import { useState } from 'react';
import Header          from './Header.jsx';
import Sidebar         from './Sidebar.jsx';
import MissionControl  from './MissionControl.jsx';
import KanbanBoard     from './KanbanBoard.jsx';
import BriefingPanel   from './BriefingPanel.jsx';
import GoalsPanel      from './GoalsPanel.jsx';
import NotesPanel      from './NotesPanel.jsx';
import GraphPanel      from './GraphPanel.jsx';
import StatusBar       from './StatusBar.jsx';
import SphereBackground from './SphereBackground.jsx';
import NetworkSphere    from './NetworkSphere.jsx';

function ViewShell({ title, sub, children, scroll }) {
  return (
    <div className={`view-shell${scroll ? ' view-scroll' : ''}`}>
      <div className="view-head">
        <div className="view-title">{title}</div>
        {sub && <div className="view-sub">{sub}</div>}
      </div>
      {children}
    </div>
  );
}

export default function Dashboard({ token, onLogout }) {
  const [view, setView] = useState('mission');

  return (
    <div className="dashboard">
      <SphereBackground />
      <Header onLogout={onLogout} />

      <div className="workspace">
        <Sidebar activeView={view} onNav={setView} />

        <div className="main-view">

          {view === 'mission' && (
            <MissionControl token={token} />
          )}

          {view === 'kanban' && (
            <ViewShell title="Operations Board" sub="Drag and drop · tasks tracked across Backlog → In Progress → Done">
              <KanbanBoard />
            </ViewShell>
          )}

          {view === 'briefing' && (
            <ViewShell title="Daily Briefing" sub="Calendar events and prioritized inbox from Gmail" scroll>
              <div className="panel-body">
                <BriefingPanel token={token} onUnauth={onLogout} />
              </div>
            </ViewShell>
          )}

          {view === 'goals' && (
            <ViewShell title="Goals" sub="Active goal tracking with progress" scroll>
              <div className="panel-body">
                <GoalsPanel />
              </div>
            </ViewShell>
          )}

          {view === 'notes' && (
            <ViewShell title="Notes & Open Loops" sub="Scratchpad and open task tracking" scroll>
              <div className="panel-body">
                <NotesPanel />
              </div>
            </ViewShell>
          )}

          {view === 'graph' && (
            <GraphPanel token={token} />
          )}

          {view === 'nexus' && (
            <div style={{ width: '100%', height: '100%', background: '#040608' }}>
              <NetworkSphere />
            </div>
          )}

        </div>
      </div>

      <StatusBar />
    </div>
  );
}
