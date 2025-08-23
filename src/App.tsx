import React, { useState } from 'react';
import Sidebar, { TabKey } from './components/Sidebar';
import { useAuthUser } from './lib/hooks';
import AgendaView from './views/Agenda';
import CalendarView from './views/Calendar';
import ProjectsView from './views/Projects';
import BudgetView from './views/Budget';
import { Card } from './components/UI';
import { Icon } from './components/Icons';
import RightRail from './components/RightRail';

export default function App() {
  const { user, signIn } = useAuthUser();
  const [tab, setTab] = useState<TabKey>('calendar');
  const [anchor, setAnchor] = useState<Date>(new Date());

  if (!user) {
    return (
      <div className="h-full grid place-items-center bg-surface-muted">
        <Card className="p-8 w-[420px]">
          <div className="text-xl font-semibold mb-2">Welcome to TaskTracker</div>
          <div className="text-text-muted mb-6">
            Sign in to see your agenda, calendar, projects, and budget.
          </div>
          <button
            onClick={signIn}
            className="px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 inline-flex items-center gap-2"
          >
            <Icon name="LogIn" /> Sign in with Google
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="h-full grid"
      style={{
        gridTemplateColumns: tab === 'calendar' ? 'var(--sidebar-w) 1fr 240px' : 'var(--sidebar-w) 1fr',
      }}
    >
      <Sidebar tab={tab} setTab={setTab} user={user} />

      {/* IMPORTANT: main should NOT scroll; let views control scrolling */}
      <main className="h-full overflow-hidden bg-surface">
        {tab === 'agenda' && <AgendaView user={user} />}
        {tab === 'calendar' && <CalendarView user={user} anchor={anchor} setAnchor={setAnchor} />}
        {tab === 'projects' && <ProjectsView user={user} />}
        {tab === 'budget' && <BudgetView user={user} />}
      </main>

      {tab === 'calendar' && <RightRail anchor={anchor} setAnchor={setAnchor} />}
    </div>
  );
}
