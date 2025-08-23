import React from 'react';
import { cn } from '../lib/cn';

export const Card: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ className, children }) => (
  <div className={cn('bg-surface-card border border-surface-border rounded-xl2 shadow-card', className)}>{children}</div>
);

export const TopButton: React.FC<React.PropsWithChildren<{ icon?: React.ReactNode; active?: boolean; onClick?: () => void }>> =
({ icon, active, onClick, children }) => (
  <button
    onClick={onClick}
    className={cn(
      'inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition',
      active ? 'bg-brand-50 border-brand-200 text-text' : 'bg-surface border-surface-border hover:bg-surface-muted'
    )}
  >
    {icon}{children}
  </button>
);

export const SidebarItem: React.FC<{ icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }> =
({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition',
      active ? 'bg-brand-50 text-text' : 'text-text hover:bg-surface-muted'
    )}
  >
    <span className="shrink-0 text-text">{icon}</span>
    <span className="truncate">{label}</span>
  </button>
);
