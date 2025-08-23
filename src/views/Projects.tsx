import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '../components/UI';
import { Icon } from '../components/Icons';
import { db, appId } from '../lib/firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  where,
  getDocs,
} from 'firebase/firestore';

type Props = { user: any };

type Task = {
  id: string;
  text?: string;
  title?: string;
  status?: 'active' | 'done' | string;
  difficulty?: string;
  date?: string | null;              // YYYY-MM-DD
  time?: string | null;              // HH:MM (24h)
  list?: string | null;              // list name; null = Inbox
  recurrence?: Recurrence | null;
  createdAt?: any;
};

type ListDoc = {
  id: string;
  name: string;
  order?: number;
  createdAt?: any;
};

type Recurrence = {
  every: number;                       // 1,2,3...
  unit: 'day' | 'week' | 'month' | 'year';
  starts: string;                      // YYYY-MM-DD
  time?: string | null;                // HH:MM optional
  ends:
    | { type: 'never' }
    | { type: 'on'; date: string }
    | { type: 'after'; count: number };
};

const DEFAULT_LIST = 'Inbox';

/* ===================================================================================== */
/*                                   MAIN VIEW                                           */
/* ===================================================================================== */

export default function ProjectsView({ user }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [lists, setLists] = useState<ListDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const listsPath = (uid: string) =>
    ['artifacts', appId, 'users', uid, 'lists'] as const;
  const tasksPath = (uid: string) =>
    ['artifacts', appId, 'users', uid, 'tasks'] as const;

  /* --------- LISTS --------- */
  useEffect(() => {
    if (!user?.uid) return;
    const colRef = collection(db, ...listsPath(user.uid));
    const qy = query(colRef, orderBy('createdAt', 'asc'));
    return onSnapshot(
      qy,
      (snap) => {
        const rows: ListDoc[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setLists(rows);
      },
      (e) => {
        console.error('lists snapshot error:', e);
        setErr(e?.message || 'Failed to load lists');
      }
    );
  }, [user?.uid]);

  /* --------- TASKS --------- */
  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);
    setErr(null);
    const colRef = collection(db, ...tasksPath(user.uid));
    const qy = query(colRef, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      qy,
      (snap) => {
        const rows: Task[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setTasks(rows);
        setLoading(false);
      },
      (e) => {
        console.error('tasks snapshot error:', e);
        setErr(e?.message || 'Failed to load tasks');
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user?.uid]);

  /* --------- list names to render (Inbox first) --------- */
  const listNames: string[] = useMemo(() => {
    const fromLists = lists.map((l) => l.name);
    const fromTasksExplicit = Array.from(
      new Set(tasks.map((t) => (t.list && t.list.trim()) || '').filter(Boolean))
    );
    const merged = Array.from(new Set([...fromLists, ...fromTasksExplicit]));
    const ordered = [
      ...merged.filter((x) => x === DEFAULT_LIST),
      ...merged
        .filter((x) => x !== DEFAULT_LIST)
        .sort((a, b) => {
          const ia = lists.findIndex((l) => l.name === a);
          const ib = lists.findIndex((l) => l.name === b);
          if (ia !== -1 && ib !== -1) return ia - ib;
          if (ia !== -1) return -1;
          if (ib !== -1) return 1;
          return a.localeCompare(b);
        }),
    ];
    const hasNullTasks = tasks.some((t) => !t.list);
    if (hasNullTasks && !ordered.includes(DEFAULT_LIST)) ordered.unshift(DEFAULT_LIST);
    if (ordered.length === 0) ordered.push(DEFAULT_LIST);
    return ordered;
  }, [lists, tasks]);

  /* --------- group tasks by list (active only) --------- */
  const groups = useMemo(() => {
    const m = new Map<string, Task[]>();
    listNames.forEach((L) => m.set(L, []));
    tasks
      .filter((t) => (t.status ?? 'active') !== 'done')
      .forEach((t) => {
        const L = t.list && t.list.trim() ? t.list.trim() : DEFAULT_LIST;
        if (!m.has(L)) m.set(L, []);
        m.get(L)!.push(t);
      });
    for (const [k, arr] of m) {
      arr.sort((a, b) => {
        const ad = a.date ? Date.parse(a.date) : Infinity;
        const bd = b.date ? Date.parse(b.date) : Infinity;
        if (ad !== bd) return ad - bd;
        const ac = a.createdAt?.seconds ?? 0;
        const bc = b.createdAt?.seconds ?? 0;
        return bc - ac;
      });
      m.set(k, arr);
    }
    return m;
  }, [tasks, listNames]);

  /* --------- actions --------- */

  async function createList(nameRaw: string) {
    const name = (nameRaw || '').trim();
    if (!user?.uid || !name) return;
    try {
      await addDoc(collection(db, ...listsPath(user.uid)), {
        name,
        createdAt: serverTimestamp(),
      });
    } catch (e: any) {
      console.error('createList error:', e);
      setErr(e?.message || 'Failed to create list');
    }
  }

  async function renameList(oldName: string, newNameRaw: string) {
    const newName = newNameRaw.trim();
    if (!user?.uid || !newName || newName === oldName) return;
    try {
      const ld = lists.find((l) => l.name === oldName);
      if (ld) await updateDoc(doc(db, ...listsPath(user.uid), ld.id), { name: newName });

      const toUpdate = tasks.filter((t) => (t.list || DEFAULT_LIST) === oldName);
      for (const t of toUpdate) {
        await updateDoc(doc(db, ...tasksPath(user.uid), t.id), { list: newName });
      }
    } catch (e: any) {
      console.error('renameList error:', e);
      setErr(e?.message || 'Failed to rename list');
    }
  }

  async function addTask(
    listName: string,
    textRaw: string,
    opts?: { date?: string | null; time?: string | null; recurrence?: Recurrence | null }
  ) {
    const text = (textRaw || '').trim();
    if (!user?.uid || !text) return;
    try {
      await addDoc(collection(db, ...tasksPath(user.uid)), {
        text,
        status: 'active',
        difficulty: 'Medium',
        date: opts?.date ?? null,
        time: opts?.time ?? null,
        list: listName === DEFAULT_LIST ? null : listName,
        recurrence: opts?.recurrence ?? null,
        createdAt: serverTimestamp(),
      });
    } catch (e: any) {
      console.error('addTask error:', e);
      setErr(e?.message || 'Failed to add task');
    }
  }

  async function toggleDone(t: Task, done: boolean) {
    if (!user?.uid || !t?.id) return;
    try {
      await updateDoc(doc(db, ...tasksPath(user.uid), t.id), {
        status: done ? 'done' : 'active',
        completedAt: done ? serverTimestamp() : null,
      });
    } catch (e: any) {
      console.error('toggleDone error:', e);
      setErr(e?.message || 'Failed to update task');
    }
  }

  async function deleteTask(t: Task) {
    if (!user?.uid || !t?.id) return;
    try {
      await deleteDoc(doc(db, ...tasksPath(user.uid), t.id));
    } catch (e: any) {
      console.error('deleteTask error:', e);
      setErr(e?.message || 'Failed to delete task');
    }
  }

  async function deleteList(listName: string) {
    if (!user?.uid) return;
    const ok = window.confirm(
      `Delete the list “${listName}” and all its tasks? This cannot be undone.`
    );
    if (!ok) return;
    try {
      const ld = lists.find((l) => l.name === listName);
      if (ld) await deleteDoc(doc(db, ...listsPath(user.uid), ld.id));

      const tasksCol = collection(db, ...tasksPath(user.uid));
      const snap1 = await getDocs(query(tasksCol, where('list', '==', listName)));
      for (const d of snap1.docs) await deleteDoc(d.ref);

      if (listName === DEFAULT_LIST) {
        const snapNull = await getDocs(query(tasksCol, where('list', '==', null)));
        for (const d of snapNull.docs) await deleteDoc(d.ref);
      }
    } catch (e: any) {
      console.error('deleteList error:', e);
      setErr(e?.message || 'Failed to delete list');
    }
  }

  /* create-list input */
  const [newListName, setNewListName] = useState('');
  const submitNewList = () => {
    const v = newListName.trim();
    if (!v) return;
    createList(v);
    setNewListName('');
  };

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-lg font-semibold">Projects &amp; Tasks</div>
        <div className="flex items-center gap-2">
          <input
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitNewList()}
            placeholder="New list name"
            className="px-3 py-2 rounded-lg border border-surface-border bg-white text-sm"
          />
          <button
            onClick={submitNewList}
            className="px-3 py-2 rounded-lg border border-surface-border bg-white hover:bg-surface-muted text-sm"
          >
            Create list
          </button>
        </div>
      </div>

      {err && <div className="mb-3 text-sm text-red-600">{err}</div>}
      {loading && <div className="text-text-muted text-sm">Loading your tasks…</div>}

      <div
        className="grid gap-6"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}
      >
        {listNames.map((listName) => (
          <ListCard
            key={listName}
            name={listName}
            tasks={groups.get(listName) || []}
            onAdd={(text, opts) => addTask(listName, text, opts)}
            onToggleDone={(t, done) => toggleDone(t, done)}
            onDeleteTask={(t) => deleteTask(t)}
            onRename={(nn) => renameList(listName, nn)}
            onDeleteList={() => deleteList(listName)}
          />
        ))}
      </div>
    </div>
  );
}

/* ===================================================================================== */
/*                                   LIST CARD                                           */
/* ===================================================================================== */

function ListCard({
  name,
  tasks,
  onAdd,
  onToggleDone,
  onDeleteTask,
  onRename,
  onDeleteList,
}: {
  name: string;
  tasks: Task[];
  onAdd: (text: string, opts?: { date?: string | null; time?: string | null; recurrence?: Recurrence | null }) => void;
  onToggleDone: (t: Task, done: boolean) => void;
  onDeleteTask: (t: Task) => void;
  onRename: (newName: string) => void;
  onDeleteList: () => void;
}) {
  const [adding, setAdding] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(name);
  const [menuOpen, setMenuOpen] = useState(false);

  // expanded composer state
  const [focused, setFocused] = useState(false);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [dueTime, setDueTime] = useState<string | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [recurrence, setRecurrence] = useState<Recurrence | null>(null);
  const [recurrenceOpen, setRecurrenceOpen] = useState(false);

  const submit = () => {
    const v = adding.trim();
    if (!v) return;
    onAdd(v, { date: dueDate, time: dueTime, recurrence });
    // reset composer
    setAdding('');
    setFocused(false);
    setDueDate(null);
    setDueTime(null);
    setDateOpen(false);
    setRecurrence(null);
    setRecurrenceOpen(false);
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

  return (
    <Card className="p-0 overflow-hidden relative">
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border bg-surface">
        {!editingTitle ? (
          <div className="font-medium flex items-center gap-2">
            <span>{name}</span>
            <span className="text-text-muted text-xs">({tasks.length})</span>
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

        <div className="flex items-center gap-1 relative">
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

          {/* Menu with ONLY Delete list */}
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

      {/* Add box */}
      <div className="px-4 py-3 border-b border-surface-border">
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

        {/* Expanded composer (like Google Tasks) */}
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

            {/* Calendar popover */}
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

            {/* Recurring button */}
            <button
              onClick={() => setRecurrenceOpen(true)}
              className="px-2 py-1 rounded-full border border-surface-border text-xs hover:bg-surface-muted inline-flex items-center gap-1"
              title="Recurring"
            >
              <Icon name="RefreshCcw" />
              Recurring
            </button>

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

/* ===================================================================================== */
/*                                   TASK ROW                                            */
/* ===================================================================================== */

function TaskRow({
  t,
  onToggleDone,
  onDelete,
}: {
  t: Task;
  onToggleDone: (done: boolean) => void;
  onDelete: () => void;
}) {
  const title = t.text || t.title || 'Untitled';
  const due = t.date ? new Date(t.date) : null;

  return (
    <div className="flex items-center gap-3 py-2 border-b border-surface-border/60">
      {/* checkbox */}
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

      {/* main */}
      <div className="flex-1">
        <div className="text-sm">{title}</div>
        <div className="flex items-center gap-2 mt-0.5">
          {due && (
            <span className="text-[11px] px-2 py-0.5 rounded-full border border-surface-border text-text-muted">
              {due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              {t.time ? ` • ${t.time}` : ''}
            </span>
          )}
          {t.difficulty && (
            <span className="text-[11px] px-2 py-0.5 rounded-full border border-surface-border text-text-muted">
              {t.difficulty}
            </span>
          )}
          {t.recurrence && (
            <span className="text-[11px] px-2 py-0.5 rounded-full border border-surface-border text-text-muted">
              Repeats
            </span>
          )}
        </div>
      </div>

      {/* actions */}
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

/* ===================================================================================== */
/*                               RECURRENCE MODAL                                        */
/* ===================================================================================== */

function RecurrenceModal({
  initial,
  onCancel,
  onDone,
}: {
  initial: Recurrence;
  onCancel: () => void;
  onDone: (r: Recurrence) => void;
}) {
  const [every, setEvery] = useState<number>(initial.every);
  const [unit, setUnit] = useState<Recurrence['unit']>(initial.unit);
  const [starts, setStarts] = useState<string>(initial.starts);
  const [time, setTime] = useState<string | ''>(initial.time ?? '');
  const [endsType, setEndsType] = useState<'never' | 'on' | 'after'>(initial.ends.type);
  const [endsOn, setEndsOn] = useState<string>(
    initial.ends.type === 'on' ? (initial.ends as any).date : ''
  );
  const [afterCount, setAfterCount] = useState<number>(
    initial.ends.type === 'after' ? (initial.ends as any).count : 30
  );

  function closeDone() {
    const ends =
      endsType === 'never'
        ? { type: 'never' as const }
        : endsType === 'on'
        ? { type: 'on' as const, date: endsOn }
        : { type: 'after' as const, count: Math.max(1, Number(afterCount) || 1) };

    onDone({
      every: Math.max(1, Number(every) || 1),
      unit,
      starts,
      time: time || null,
      ends,
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-card">
        <div className="text-sm font-medium mb-3">Repeats every</div>

        <div className="flex items-center gap-2 mb-3">
          <input
            type="number"
            min={1}
            value={every}
            onChange={(e) => setEvery(parseInt(e.target.value || '1', 10))}
            className="w-16 px-2 py-1 rounded-md border border-surface-border"
          />
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as Recurrence['unit'])}
            className="px-2 py-1 rounded-md border border-surface-border"
          >
            <option value="day">day</option>
            <option value="week">week</option>
            <option value="month">month</option>
            <option value="year">year</option>
          </select>
        </div>

        <div className="text-sm font-medium mb-1">Starts</div>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="date"
            value={starts}
            onChange={(e) => setStarts(e.target.value)}
            className="px-2 py-1 rounded-md border border-surface-border"
          />
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            placeholder="Set time"
            className="px-2 py-1 rounded-md border border-surface-border"
          />
        </div>

        <div className="text-sm font-medium mb-2">Ends</div>
        <div className="space-y-2 mb-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={endsType === 'never'}
              onChange={() => setEndsType('never')}
            />
            Never
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={endsType === 'on'}
              onChange={() => setEndsType('on')}
            />
            On
            <input
              type="date"
              disabled={endsType !== 'on'}
              value={endsOn}
              onChange={(e) => setEndsOn(e.target.value)}
              className="ml-2 px-2 py-1 rounded-md border border-surface-border disabled:opacity-50"
            />
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={endsType === 'after'}
              onChange={() => setEndsType('after')}
            />
            After
            <input
              type="number"
              min={1}
              disabled={endsType !== 'after'}
              value={afterCount}
              onChange={(e) => setAfterCount(parseInt(e.target.value || '1', 10))}
              className="ml-2 w-20 px-2 py-1 rounded-md border border-surface-border disabled:opacity-50"
            />
            occurrences
          </label>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-2 rounded-lg border border-surface-border text-sm hover:bg-surface-muted"
          >
            Cancel
          </button>
          <button
            onClick={closeDone}
            className="px-3 py-2 rounded-lg bg-brand-600 text-white text-sm hover:opacity-90"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
