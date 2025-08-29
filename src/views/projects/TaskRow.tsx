import React from 'react';
import { Icon } from '../../components/Icons';
import { Task } from './types';

export default function TaskRow({
  t,
  color,
  onToggleDone,
  onDelete,
}: {
  t: Task;
  color?: string;
  onToggleDone: (done: boolean) => void;
  onDelete: () => void;
}) {
  const title = t.text || t.title || 'Untitled';
  const due = t.date ? new Date(t.date) : null;

  return (
    <div
      className="flex items-center gap-3 py-2 border-b border-surface-border/60"
      style={color ? { backgroundColor: color } : undefined}
    >
      <label className="inline-flex items-center justify-center w-5 h-5 rounded-md border border-surface-border bg-white cursor-pointer hover:bg-surface-muted">
        <input
          type="checkbox"
          className="hidden"
          checked={(t.status ?? 'active') === 'done'}
          onChange={(e) => onToggleDone(e.target.checked)}
        />
        {(t.status ?? 'active') === 'done' ? (
          <Icon name="Check" />
        ) : (
          <span className="w-2 h-2 rounded-full border border-surface-border" />
        )}
      </label>

      <div className="flex-1">
        <div className="text-sm">{title}</div>
        <div className="flex flex-wrap items-center gap-2 mt-0.5">
          {due && (
            <span className="text-[11px] px-2 py-0.5 rounded-full border border-surface-border text-text-muted">
              {due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              {t.time ? ` • ${t.time}` : ''}
            </span>
          )}
          {t.difficulty && (
            <span className="text-[11px] px-2 py-0.5 rounded-full border border-surface-border">
              {t.difficulty}
            </span>
          )}
          {t.importance && (
            <span className="text-[11px] px-2 py-0.5 rounded-full border border-surface-border">
              {t.importance}
            </span>
          )}
          {t.recurrence && (
            <span className="text-[11px] px-2 py-0.5 rounded-full border border-surface-border text-text-muted">
              Repeats
            </span>
          )}
        </div>
      </div>

      <button
        className="p-1 rounded-md hover:bg-surface-muted"
        title="Delete task"
        onClick={onDelete}
      >
        <Icon name="Trash" />
      </button>
    </div>
  );
}
