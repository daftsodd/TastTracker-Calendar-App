import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '../../components/UI';
import { Icon } from '../../components/Icons';
import TaskRow from './TaskRow';
import RecurrenceModal from './RecurrenceModal';
import { rgba } from './color';
import {
  DEFAULT_LIST,
  Difficulty,
  Importance,
  Recurrence,
  Task,
} from './types';

export default function ListCard({
  name,
  color,
  tasks,
  onAdd,
  onToggleDone,
  onDeleteTask,
  onRename,
  onChangeColor,
  onDeleteList,
}: {
  name: string;
  color?: string;
  tasks: Task[];
  onAdd: (
    text: string,
    opts?: {
      date?: string | null;
      time?: string | null;
      recurrence?: Recurrence | null;
      difficulty?: Difficulty;
      importance?: Importance;
    }
  ) => void;
  onToggleDone: (t: Task, done: boolean) => void;
  onDeleteTask: (t: Task) => void;
  onRename: (newName: string) => void;
  onChangeColor: (hex: string) => void;
  onDeleteList: () => void;
}) {
  const [adding, setAdding] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(name);
  const [menuOpen, setMenuOpen] = useState(false);

  // composer state
  const [focused, setFocused] = useState(false);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [dueTime, setDueTime] = useState<string | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [recurrence, setRecurrence] = useState<Recurrence | null>(null);
  const [recurrenceOpen, setRecurrenceOpen] = useState(false);

  // attributes
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
  const [importance, setImportance] = useState<Importance>('Medium');

  // click-away: ignore clicks inside recurrence modal panel
  const composerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const insideRecurrencePanel = target.closest('[data-modal-panel="recurrence"]');
      if (insideRecurrencePanel) return;
      if (!composerRef.current) return;
      if (!composerRef.current.contains(target)) {
        setFocused(false);
        setDateOpen(false);
        setRecurrenceOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  const submit = () => {
    const v = adding.trim();
    if (!v) return;
    onAdd(v, { date: dueDate, time: dueTime, recurrence, difficulty, importance });
    // reset composer
    setAdding('');
    setFocused(false);
    setDueDate(null);
    setDueTime(null);
    setDateOpen(false);
    setRecurrence(null);
    setRecurrenceOpen(false);
    setDifficulty('Medium');
    setImportance('Medium');
  };

  const saveTitle = () => {
    const v = titleDraft.trim();
    if (!v || v === name) {
      setEditingTitle(false);
      setTitleDraft(name);
      return;
    }
    onRename(v);
    setEditingTitle(false);
  };

  const todayISO = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  };
  const tomorrowISO = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  };

  const tint = color ? rgba(color, 0.10) : undefined;
  const rowTint = color ? rgba(color, 0.08) : undefined;
  const borderTint = color ? rgba(color, 0.35) : undefined;

  return (
    <Card className="p-0 overflow-hidden relative">
      {tint && <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: tint }} />}

      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-surface-border bg-surface"
        style={borderTint ? { borderColor: borderTint } : undefined}
      >
        {!editingTitle ? (
          <div className="font-medium flex items-center gap-2">
            <label className="inline-flex items-center gap-2">
              <span
                className="inline-block w-3.5 h-3.5 rounded-full border border-surface-border"
                style={color ? { backgroundColor: color, borderColor: borderTint || undefined } : undefined}
                title="List color"
              />
              <span>{name}</span>
              <span className="text-text-muted text-xs">({tasks.length})</span>
            </label>
          </div>
        ) : (
          <input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
            onBlur={saveTitle}
            className="px-2 py-1 rounded-md border border-surface-border text-sm bg-white"
          />
        )}

        <div className="flex items-center gap-2 relative">
          <input
            type="color"
            value={color ?? '#ffffff'}
            onChange={(e) => onChangeColor(e.target.value)}
            className="w-6 h-6 p-0 rounded-md border border-surface-border cursor-pointer"
            title="Change list color"
          />

          {!editingTitle && (
            <button
              className="p-1 rounded-md hover:bg-surface-muted"
              title="Rename list"
              onClick={() => setEditingTitle(true)}
            >
              <Icon name="Pencil" />
            </button>
          )}

          <button
            className="p-1 rounded-md hover:bg-surface-muted"
            title="More"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Icon name="MoreHorizontal" />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-8 z-30 w-40 rounded-lg border border-surface-border bg-white shadow-card"
              onMouseLeave={() => setMenuOpen(false)}
            >
              <button
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                onClick={() => {
                  setMenuOpen(false);
                  onDeleteList();
                }}
              >
                Delete list
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div
        ref={composerRef}
        className="px-4 py-3 border-b border-surface-border"
        style={borderTint ? { borderColor: borderTint } : undefined}
      >
        <div className="flex items-center gap-2">
          <span className="shrink-0">
            <Icon name="Plus" />
          </span>
          <input
            value={adding}
            onChange={(e) => setAdding(e.target.value)}
            onFocus={() => setFocused(true)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Add a task"
            className="flex-1 bg-transparent outline-none text-sm"
          />
          <button
            onClick={submit}
            className="px-2 py-1 rounded-md border border-surface-border text-xs hover:bg-surface-muted"
          >
            Add
          </button>
        </div>

        {focused && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setDueDate(todayISO())}
              className={`px-3 py-1 rounded-full border text-xs ${
                dueDate === todayISO()
                  ? 'border-brand-200 bg-brand-50'
                  : 'border-surface-border hover:bg-surface-muted'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDueDate(tomorrowISO())}
              className={`px-3 py-1 rounded-full border text-xs ${
                dueDate === tomorrowISO()
                  ? 'border-brand-200 bg-brand-50'
                  : 'border-surface-border hover:bg-surface-muted'
              }`}
            >
              Tomorrow
            </button>

            {/* date/time pickers */}
            <div className="relative">
              <button
                onClick={() => setDateOpen((v) => !v)}
                className="px-2 py-1 rounded-full border border-surface-border text-xs hover:bg-surface-muted inline-flex items-center gap-1"
              >
                <Icon name="Calendar" />
                {dueDate ? dueDate : 'Pick date'}
              </button>
              {dateOpen && (
                <div className="absolute z-20 mt-2 rounded-lg border border-surface-border bg-white p-3 shadow-card">
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={dueDate ?? ''}
                      onChange={(e) => setDueDate(e.target.value || null)}
                      className="px-2 py-1 rounded-md border border-surface-border"
                    />
                    <input
                      type="time"
                      value={dueTime ?? ''}
                      onChange={(e) => setDueTime(e.target.value || null)}
                      className="px-2 py-1 rounded-md border border-surface-border"
                      placeholder="Set time"
                    />
                    <button
                      onClick={() => {
                        setDueDate(null);
                        setDueTime(null);
                      }}
                      className="px-2 py-1 rounded-md border border-surface-border text-xs hover:bg-surface-muted"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* recurrence */}
            <button
              onClick={() => setRecurrenceOpen(true)}
              className="px-2 py-1 rounded-full border border-surface-border text-xs hover:bg-surface-muted inline-flex items-center gap-1"
              title="Recurring"
            >
              <Icon name="RefreshCcw" />
              Recurring
            </button>

            {/* difficulty */}
            <div className="ml-2 inline-flex items-center gap-1 text-xs">
              <span className="text-text-muted">Difficulty</span>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                className="px-2 py-1 rounded-full border border-surface-border bg-white"
              >
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
            </div>

            {/* importance */}
            <div className="inline-flex items-center gap-1 text-xs">
              <span className="text-text-muted">Importance</span>
              <select
                value={importance}
                onChange={(e) => setImportance(e.target.value as Importance)}
                className="px-2 py-1 rounded-full border border-surface-border bg-white"
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>

            {recurrence && (
              <span className="text-[11px] px-2 py-0.5 rounded-full border border-surface-border text-text-muted">
                Every {recurrence.every} {recurrence.unit}
                {recurrence.every > 1 ? 's' : ''}{' '}
                {recurrence.ends.type === 'never'
                  ? '(never ends)'
                  : recurrence.ends.type === 'on'
                  ? `(until ${recurrence.ends.date})`
                  : `(after ${recurrence.ends.count}x)`}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Tasks */}
      <ul className="max-h-[50vh] overflow-auto">
        {tasks.length === 0 && (
          <li className="px-4 py-6 text-sm text-text-muted">No tasks yet.</li>
        )}
        {tasks.map((t) => (
          <li key={t.id} className="px-3">
            <TaskRow
              t={t}
              color={rowTint}
              onToggleDone={(d) => onToggleDone(t, d)}
              onDelete={() => onDeleteTask(t)}
            />
          </li>
        ))}
      </ul>

      {/* Recurrence modal */}
      {recurrenceOpen && (
        <RecurrenceModal
          initial={{
            every: 1,
            unit: 'day',
            starts: dueDate ?? todayISO(),
            time: dueTime ?? null,
            ends: { type: 'never' },
          }}
          onCancel={() => setRecurrenceOpen(false)}
          onDone={(r) => {
            setRecurrence(r);
            setDueDate(r.starts);
            setDueTime(r.time ?? null);
            setRecurrenceOpen(false);
          }}
        />
      )}
    </Card>
  );
}
