import React from 'react';
import { SidebarItem } from './UI';
import { Icon } from './Icons';

export type TabKey = 'agenda' | 'calendar' | 'projects' | 'budget';

export default function Sidebar({
  tab,
  setTab,
  user,
}: {
  tab: TabKey;
  setTab: (k: TabKey) => void;
  user: any;
}) {
  const items = [
    { key: 'agenda', label: "Today's Agenda", icon: <Icon name="NotebookText" /> },
    { key: 'calendar', label: 'Calendar', icon: <Icon name="Calendar" /> },
    { key: 'projects', label: 'Projects & Tasks', icon: <Icon name="PanelsTopLeft" /> },
    { key: 'budget', label: 'Budget', icon: <Icon name="Wallet" /> },
  ] as const;

  const photo = user?.photoURL as string | undefined;

  return (
    <aside className="h-full border-r border-surface-border bg-surface" style={{ width: 'var(--sidebar-w)' }}>
      {/* Profile + menu + settings */}
      <div className="px-4 py-4 flex items-center justify-between">
        <button className="flex items-center gap-2">
          <img
            src={photo || 'https://ui-avatars.com/api/?name=U&background=12B886&color=fff'}
            className="w-8 h-8 rounded-full object-cover"
            alt="Profile"
          />
          <Icon name="ChevronDown" />
        </button>
        <button className="p-2 rounded-md hover:bg-surface-muted" title="Settings (coming soon)">
          <Icon name="Settings" />
        </button>
      </div>

      {/* Nav items */}
      <div className="px-3 space-y-1">
        {items.map((it) => (
          <SidebarItem
            key={it.key}
            icon={it.icon}
            label={it.label}
            active={tab === it.key}
            onClick={() => setTab(it.key as TabKey)}
          />
        ))}
      </div>
    </aside>
  );
}
