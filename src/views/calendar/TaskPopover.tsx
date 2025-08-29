import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../../components/Icons';
import type { ListDoc, Task, Recurrence } from '../projects/types';
import RecurrenceModal from '../projects/RecurrenceModal';

export default function TaskPopover({
  task,
  anchor,
  lists,
  done,
  onClose,
  onSave,
  onDelete,
  onDeleteOccurrence,
  onToggleDone,
}: {
  task: Task;
  anchor: { x: number; y: number };
  lists: ListDoc[];
  done: boolean;
  onClose: () => void;
  onSave: (id: string, patch: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onDeleteOccurrence: (task: Task) => void;
  onToggleDone: (task: Task, done: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.text || task.title || '');
  const [listName, setListName] = useState<string>(task.list || 'Inbox');

  const [date, setDate] = useState<string>(task.recurrence ? task.recurrence.starts : (task.date ?? ''));
  const [time, setTime] = useState<string>(task.recurrence ? (task.recurrence.time ?? '') : (task.time ?? ''));

  const [difficulty, setDifficulty] = useState(task.difficulty ?? 'Medium');
  const [importance, setImportance] = useState(task.importance ?? 'Medium');

  const [recurrence, setRecurrence] = useState<Recurrence | null>(task.recurrence ?? null);
  const [recOpen, setRecOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!ref.current) return;
      const t = e.target as HTMLElement;
      if (!ref.current.contains(t)) onClose();
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onEsc);
    };
  }, [onClose]);

  const listOptions = useMemo(() => {
    const names = lists.map(l => l.name).filter(Boolean) as string[];
    return ['Inbox', ...names.filter(n => n !== 'Inbox')];
  }, [lists]);

  function save() {
    const patch: Partial<Task> = {
      text: title.trim(),
      list: (listName === 'Inbox' ? null : listName) as any,
      difficulty,
      importance,
    };
    if (recurrence) {
      patch.recurrence = recurrence;
      patch.date = recurrence.starts;
      patch.time = recurrence.time ?? null;
    } else {
      patch.recurrence = null;
      patch.date = date || null;
      patch.time = time || null;
    }
    onSave(task.id, patch);
    setEditing(false);
  }

  const top = Math.min(anchor.y + 8, window.innerHeight - 360);
  const left = Math.min(anchor.x + 8, window.innerWidth - 380);

  return (
    <div
      ref={ref}
      className="fixed z-[100] rounded-2xl bg-white border border-surface-border shadow-card w-[340px]"
      style={{ top, left }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="p-3 border-b border-surface-border">
        {!editing ? (
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className={`text-sm font-medium ${done ? 'line-through opacity-60' : ''}`}>
                {task.text || task.title || 'Untitled'}
              </div>
              <div className="text-xs text-text-muted mt-1">
                {task.date
                  ? new Date(task.date).toLocaleDateString(undefined, {
                      weekday: 'long', day: 'numeric', month: 'long',
                    })
                  : (task.recurrence ? 'Repeating task' : 'No date')}
              </div>
              <div className="text-xs text-text-muted">List: {task.list || 'Inbox'}</div>
            </div>
            <div className="relative shrink-0 flex items-center gap-1">
              <button
                className="p-1 rounded-md hover:bg-surface-muted"
                title="Edit"
                onClick={() => setEditing(true)}
              >
                <Icon name="Pencil" />
              </button>

              {/* Delete menu (reliable controlled dropdown) */}
              <button
                className="p-1 rounded-md hover:bg-surface-muted"
                title="Delete"
                onClick={() => setDelOpen((v) => !v)}
              >
                <Icon name="Trash" />
              </button>
              {delOpen && (
                <div
                  className="absolute right-0 top-8 w-56 rounded-lg border border-surface-border bg-white shadow-card p-1 z-10"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {task.recurrence && task.date && (
                    <button
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-surface-muted text-sm"
                      onClick={() => onDeleteOccurrence(task)}
                    >
                      Delete this occurrence
                    </button>
                  )}
                  <button
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-red-50 text-sm text-red-600"
                    onClick={() => onDelete(task.id)}
                  >
                    Delete {task.recurrence ? 'entire series' : 'task'}
                  </button>
                </div>
              )}

              <button
                className="p-1 rounded-md hover:bg-surface-muted"
                title="Close"
                onClick={onClose}
              >
                <Icon name="X" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              className="w-full text-sm px-2 py-1 rounded-md border border-surface-border"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
            />

            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">List</span>
              <select
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                className="text-sm px-2 py-1 rounded-md border border-surface-border bg-white"
              >
                {listOptions.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">Date</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={!!recurrence}
                className="text-sm px-2 py-1 rounded-md border border-surface-border disabled:opacity-50"
              />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                disabled={!!recurrence}
                className="text-sm px-2 py-1 rounded-md border border-surface-border disabled:opacity-50"
              />
              {!recurrence && (
                <button
                  className="px-2 py-1 rounded-md border border-surface-border text-xs hover:bg-surface-muted"
                  onClick={() => { setDate(''); setTime(''); }}
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center gap-4">
              <label className="text-xs text-text-muted inline-flex items-center gap-2">
                Difficulty
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="text-sm px-2 py-1 rounded-md border border-surface-border bg-white"
                >
                  <option>Easy</option>
                  <option>Medium</option>
                  <option>Hard</option>
                </select>
              </label>

              <label className="text-xs text-text-muted inline-flex items-center gap-2">
                Importance
                <select
                  value={importance}
                  onChange={(e) => setImportance(e.target.value as any)}
                  className="text-sm px-2 py-1 rounded-md border border-surface-border bg-white"
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                className="px-2 py-1 rounded-md border border-surface-border text-xs hover:bg-surface-muted"
                onClick={() => setRecOpen(true)}
              >
                {recurrence ? 'Edit recurrence' : 'Add recurrence'}
              </button>
              {recurrence && (
                <button
                  className="px-2 py-1 rounded-md border border-surface-border text-xs hover:bg-surface-muted"
                  onClick={() => { setRecurrence(null); }}
                >
                  Remove recurrence
                </button>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                className="px-3 py-1.5 rounded-lg border border-surface-border text-sm hover:bg-surface-muted"
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-sm hover:opacity-90"
                onClick={save}
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="px-3 py-2 flex justify-end">
        <button
          className="px-3 py-1.5 rounded-lg border border-surface-border text-sm hover:bg-surface-muted"
          onClick={() => onToggleDone(task, !done)}
        >
          {done ? 'Mark Uncomplete' : 'Mark completed'}
        </button>
      </div>

      {recOpen && (
        <RecurrenceModal
          initial={
            recurrence ?? {
              every: 1,
              unit: 'day',
              starts: date || new Date().toISOString().slice(0, 10),
              time: time || null,
              ends: { type: 'never' },
            }
          }
          onCancel={() => setRecOpen(false)}
          onDone={(r) => {
            setRecurrence(r);
            setDate(r.starts);
            setTime(r.time ?? '');
            setRecOpen(false);
          }}
        />
      )}
    </div>
  );
}
