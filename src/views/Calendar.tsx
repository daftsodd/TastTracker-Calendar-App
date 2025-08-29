import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '../components/UI';
import { Icon } from '../components/Icons';
import { useTasks } from '../lib/hooks';
import AllDayTasksBar from './calendar/AllDayTasksBar';
import TaskPopover from './calendar/TaskPopover';
import type { Task, ListDoc, Recurrence } from './projects/types';
import { db, appId } from '../lib/firebase';
import {
  collection, onSnapshot, orderBy, query,
  updateDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';

/* ---------- date helpers & recurrence expansion (unchanged) ---------- */
function startOfWeekMonday(d = new Date()) { const dt = new Date(d); const day = (dt.getDay() + 6) % 7; dt.setDate(dt.getDate() - day); dt.setHours(0,0,0,0); return dt; }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function fmtRangeLabel(weekStart: Date) { const ws = new Date(weekStart); const we = addDays(ws, 6); const fmt = (x: Date) => x.toLocaleDateString(undefined, { day: 'numeric', month: 'long' }); return `${fmt(ws)} – ${fmt(we)}`; }
function hoursArray() { return Array.from({ length: 24 }).map((_, i) => `${i.toString().padStart(2, '0')}:00`); }
function toISO(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x.toISOString().slice(0,10); }
function parseISODate(s: string) { const [y,m,dd] = s.split('-').map(Number); const d = new Date(y, m-1, dd); d.setHours(0,0,0,0); return d; }

function addInterval(d: Date, every: number, unit: Recurrence['unit']) {
  const x = new Date(d);
  if (unit === 'day') x.setDate(x.getDate() + every);
  if (unit === 'week') x.setDate(x.getDate() + 7 * every);
  if (unit === 'month') x.setMonth(x.getMonth() + every);
  if (unit === 'year') x.setFullYear(x.getFullYear() + every);
  return x;
}
function expandRecurrence(t: Task, weekStart: Date, weekEnd: Date, today = new Date()): string[] {
  const r = t.recurrence!;
  const starts = parseISODate(r.starts);
  const endByRule =
    r.ends.type === 'never' ? null :
    r.ends.type === 'on'   ? parseISODate(r.ends.date) :
    addInterval(starts, r.ends.count - 1, r.unit);

  const created = t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000) : starts;
  const maxFuture = new Date(created); maxFuture.setFullYear(maxFuture.getFullYear() + 2);
  const minPast = new Date(today);    minPast.setFullYear(minPast.getFullYear() - 1); minPast.setHours(0,0,0,0);

  const windowStart = new Date(Math.max(weekStart.getTime(), minPast.getTime(), starts.getTime()));
  const windowEnd   = new Date(Math.min(weekEnd.getTime(), (endByRule?.getTime() ?? Infinity), maxFuture.getTime()));
  if (windowStart > windowEnd) return [];

  let cur = new Date(starts);
  while (cur < windowStart) cur = addInterval(cur, r.every, r.unit);

  const out: string[] = [];
  while (cur <= windowEnd) { out.push(toISO(cur)); cur = addInterval(cur, r.every, r.unit); }
  return out;
}

/* ---------- main ---------- */
type Props = { user: any };

export default function CalendarView({ user }: Props) {
  const [cursor, setCursor] = useState<Date>(startOfWeekMonday());
  const tasksRaw = useTasks(user);
  const weekDays = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(cursor, i)), [cursor]);
  const weekStart = cursor;
  const weekEnd   = addDays(cursor, 6);

  // lists (colors + selector)
  const [lists, setLists] = useState<ListDoc[]>([]);
  useEffect(() => {
    if (!user?.uid) return;
    const colRef = collection(db, 'artifacts', appId, 'users', user.uid, 'lists');
    const qy = query(colRef, orderBy('createdAt', 'asc'));
    return onSnapshot(qy, snap => setLists(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))));
  }, [user?.uid]);

  const colorByList = useMemo<Record<string, string | undefined>>(() => {
    const m: Record<string, string | undefined> = {};
    for (const l of lists) if (l.name) m[l.name] = l.color || undefined;
    m['Inbox'] ??= undefined;
    return m;
  }, [lists]);

  // Visible-week tasks (skip 'skippedDates')
  const tasksExpanded: Task[] = useMemo(() => {
    const acc: Task[] = [];
    for (const t of tasksRaw) {
      if (t.recurrence) {
        const occ = expandRecurrence(t, weekStart, weekEnd);
        const skipped = new Set(t.skippedDates || []);
        for (const dayISO of occ) {
          if (!skipped.has(dayISO)) acc.push({ ...t, date: dayISO });
        }
      } else if (t.date) {
        acc.push(t);
      }
    }
    acc.sort((a, b) => {
      if (a.date !== b.date) return (a.date || '').localeCompare(b.date || '');
      const at = a.time || '99:99', bt = b.time || '99:99';
      if (at !== bt) return at < bt ? -1 : 1;
      const ac = a.createdAt?.seconds ?? 0, bc = b.createdAt?.seconds ?? 0;
      return ac - bc;
    });
    return acc;
  }, [tasksRaw, weekStart, weekEnd]);

  const tasksByDay: Record<string, Task[]> = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const t of tasksExpanded) if (t.date) (map[t.date] ||= []).push(t);
    return map;
  }, [tasksExpanded]);

  const hours = useMemo(() => hoursArray(), []);
  const [expandAll, setExpandAll] = useState(false);

  /* ----- occurrence completion helpers ----- */
  function isOccurrenceDone(t: Task): boolean {
    if (t.recurrence) return !!(t.date && (t.completedDates || []).includes(t.date));
    return (t.status ?? 'active') === 'done';
  }

  async function updateTask(id: string, patch: Partial<Task>) {
    if (!user?.uid) return;
    const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', id);
    await updateDoc(ref, { ...patch });
  }
  async function deleteTask(id: string) {
    if (!user?.uid) return;
    const ok = window.confirm('Delete this task?');
    if (!ok) return;
    const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', id);
    await deleteDoc(ref);
    setPop(null);
  }
  async function deleteOccurrence(task: Task) {
    if (!user?.uid || !task.recurrence || !task.date) return;
    const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', task.id);
    const skipped = new Set<string>(task.skippedDates || []);
    skipped.add(task.date);
    // also remove from completedDates if present
    const completed = new Set<string>(task.completedDates || []);
    completed.delete(task.date);
    await updateDoc(ref, { skippedDates: Array.from(skipped), completedDates: Array.from(completed) });
    setPop(null);
  }
  async function toggleDoneOccurrence(task: Task, done: boolean) {
    if (!user?.uid) return;
    const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', task.id);
    if (task.recurrence && task.date) {
      const set = new Set<string>(task.completedDates || []);
      if (done) set.add(task.date); else set.delete(task.date);
      await updateDoc(ref, { completedDates: Array.from(set) });
    } else {
      await updateDoc(ref, {
        status: done ? 'done' : 'active',
        completedAt: done ? serverTimestamp() : null,
      });
    }
  }

  /* ----- popover state + live sync ----- */
  const [pop, setPop] = useState<{ task: Task; x: number; y: number } | null>(null);
  function openTask(e: React.MouseEvent, task: Task) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPop({ task, x: rect.left, y: rect.bottom });
  }
  useEffect(() => {
    if (!pop) return;
    const updated = tasksExpanded.find(t => t.id === pop.task.id && t.date === pop.task.date);
    if (updated) setPop(prev => (prev ? { ...prev, task: updated } : prev));
  }, [tasksExpanded, pop?.task?.id, pop?.task?.date]);

  return (
    <div className="h-full overflow-hidden p-6">
      <Card className="h-full overflow-hidden">
        <div className="h-full overflow-y-auto">
          {/* Sticky header */}
          <div className="sticky z-30 top-0 flex items-center gap-2 bg-white border-b border-surface-border px-3 py-2">
            <div className="flex items-center gap-1">
              <button className="px-2 py-1 rounded-md border border-surface-border hover:bg-surface-muted"
                onClick={() => setCursor(addDays(cursor, -7))} title="Previous week">
                <Icon name="ChevronLeft" />
              </button>
              <button className="px-2 py-1 rounded-md border border-surface-border hover:bg-surface-muted"
                onClick={() => setCursor(startOfWeekMonday(new Date()))} title="Go to today">
                Today
              </button>
              <button className="px-2 py-1 rounded-md border border-surface-border hover:bg-surface-muted"
                onClick={() => setCursor(addDays(cursor, 7))} title="Next week">
                <Icon name="ChevronRight" />
              </button>
            </div>
            <div className="font-medium">{fmtRangeLabel(cursor)}</div>
          </div>

          {/* Sticky: dates + all-day bar */}
          <div className="sticky z-20 top-[40px] bg-white border-b border-surface-border">
            <div className="grid grid-cols-8 border-b border-surface-border">
              <div className="px-2 py-2 text-xs text-text-muted border-r border-surface-border"> </div>
              <div className="col-span-7 grid grid-cols-7">
                {weekDays.map((d, i) => {
                  const isToday = toISO(d) === toISO(new Date());
                  return (
                    <div key={i}
                      className={`px-2 py-2 text-sm font-medium border-r last:border-r-0 border-surface-border ${isToday ? 'text-brand-700' : ''}`}
                      title={d.toDateString()}
                    >
                      {d.toLocaleDateString(undefined, { weekday: 'short' })}{' '}
                      {d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                    </div>
                  );
                })}
              </div>
            </div>

            <AllDayTasksBar
              days={weekDays}
              tasksByDay={tasksByDay}
              colorByList={colorByList}
              expandAll={expandAll}
              onToggleAll={() => setExpandAll(v => !v)}
              onTaskClick={openTask}
              isDone={isOccurrenceDone}
            />
          </div>

          {/* Time grid */}
          <div className="grid grid-cols-8 min-h-[800px]">
            <div className="border-r border-surface-border bg-white">
              {hours.map((h) => (
                <div key={h} className="h-12 relative">
                  <div className="absolute -top-2 right-2 text-[11px] text-text-muted">{h}</div>
                </div>
              ))}
            </div>
            <div className="col-span-7 grid grid-cols-7">
              {weekDays.map((_, i) => (
                <div key={i} className="border-r last:border-r-0 border-surface-border">
                  {Array.from({ length: 24 }).map((__, hr) => (
                    <div key={hr} className="h-12 border-b border-surface-border/60" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Popover */}
      {pop && (
        <TaskPopover
          task={pop.task}
          anchor={{ x: pop.x, y: pop.y }}
          lists={lists}
          done={isOccurrenceDone(pop.task)}
          onClose={() => setPop(null)}
          onSave={updateTask}
          onDelete={deleteTask}
          onDeleteOccurrence={deleteOccurrence}
          onToggleDone={toggleDoneOccurrence}
        />
      )}
    </div>
  );
}
