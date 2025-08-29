import React, { useEffect, useMemo, useState } from 'react';
import { db, appId } from '../../lib/firebase';
import { useTasks } from '../../lib/hooks';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import ListCard from './ListCard';
import type { ListDoc, Recurrence, Task } from './types';
import { DEFAULT_LIST } from './types';

type Props = { user: any };

/* ===================================================================================== */
/*                                   MAIN VIEW                                           */
/* ===================================================================================== */

export default function ProjectsView({ user }: Props) {
  const [lists, setLists] = useState<ListDoc[]>([]);
  const [err, setErr] = useState<string | null>(null);

  // ✅ Tasks now come from the same place as the calendar
  const tasks = useTasks(user);

  /* --------- LISTS --------- */
  useEffect(() => {
    if (!user?.uid) return;
    const colRef = collection(db, 'artifacts', appId, 'users', user.uid, 'lists');
    const qy = query(colRef, orderBy('createdAt', 'asc'));
    return onSnapshot(
      qy,
      (snap) => {
        const rows: ListDoc[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setLists(rows);
      },
      (e) => setErr(e?.message || 'Failed to load lists')
    );
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

  /* --------- group tasks by list (ACTIVE only for the main list view) --------- */
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
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'lists'), {
        name,
        createdAt: serverTimestamp(),
      });
    } catch (e: any) {
      setErr(e?.message || 'Failed to create list');
    }
  }

  async function renameList(oldName: string, newNameRaw: string) {
    const newName = newNameRaw.trim();
    if (!user?.uid || !newName || newName === oldName) return;
    try {
      const ld = lists.find((l) => l.name === oldName);
      if (ld) {
        await updateDoc(
          doc(db, 'artifacts', appId, 'users', user.uid, 'lists', ld.id),
          { name: newName }
        );
      }

      const toUpdate = tasks.filter((t) => (t.list || DEFAULT_LIST) === oldName);
      for (const t of toUpdate) {
        await updateDoc(
          doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', t.id),
          { list: newName }
        );
      }
    } catch (e: any) {
      setErr(e?.message || 'Failed to rename list');
    }
  }

  async function changeListColor(listName: string, hex: string | null) {
    if (!user?.uid) return;
    try {
      const ld = lists.find((l) => l.name === listName);
      if (!ld) return;
      await updateDoc(
        doc(db, 'artifacts', appId, 'users', user.uid, 'lists', ld.id),
        { color: hex ?? null }
      );
    } catch (e: any) {
      setErr(e?.message || 'Failed to update list color');
    }
  }

  async function addTask(
    listName: string,
    textRaw: string,
    opts?: {
      date?: string | null;
      time?: string | null;
      recurrence?: Recurrence | null;
      difficulty?: Task['difficulty'];
      importance?: Task['importance'];
    }
  ) {
    const text = (textRaw || '').trim();
    if (!user?.uid || !text) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'tasks'), {
        text,
        status: 'active',
        difficulty: opts?.difficulty ?? 'Medium',
        importance: opts?.importance ?? 'Medium',
        date: opts?.date ?? null,
        time: opts?.time ?? null,
        list: listName === DEFAULT_LIST ? null : listName,
        recurrence: opts?.recurrence ?? null,
        completedDates: [],
        skippedDates: [],
        createdAt: serverTimestamp(),
      });
    } catch (e: any) {
      setErr(e?.message || 'Failed to add task');
    }
  }

  async function toggleDone(t: Task, done: boolean) {
    if (!user?.uid || !t?.id) return;
    try {
      await updateDoc(
        doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', t.id),
        {
          status: done ? 'done' : 'active',
          completedAt: done ? serverTimestamp() : null,
        }
      );
    } catch (e: any) {
      setErr(e?.message || 'Failed to update task');
    }
  }

  async function deleteTask(t: Task) {
    if (!user?.uid || !t?.id) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', t.id));
    } catch (e: any) {
      setErr(e?.message || 'Failed to delete task');
    }
  }

  async function deleteList(listName: string) {
    if (!user?.uid) return;
    const confirm = window.confirm(
      `Delete the list “${listName}” and all its tasks? This cannot be undone.`
    );
    if (!confirm) return;
    try {
      const ld = lists.find((l) => l.name === listName);
      if (ld) {
        await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'lists', ld.id));
      }

      const tasksCol = collection(db, 'artifacts', appId, 'users', user.uid, 'tasks');

      // list == listName
      const snap1 = await getDocs(query(tasksCol, where('list', '==', listName)));
      for (const d of snap1.docs) await deleteDoc(d.ref);

      // if deleting Inbox => also list == null
      if (listName === DEFAULT_LIST) {
        const snapNull = await getDocs(query(tasksCol, where('list', '==', null)));
        for (const d of snapNull.docs) await deleteDoc(d.ref);
      }
    } catch (e: any) {
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

      <div
        className="grid gap-6"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}
      >
        {listNames.map((listName) => (
          <ListCard
            key={listName}
            name={listName}
            color={lists.find((l) => l.name === listName)?.color || undefined}
            tasks={groups.get(listName) || []}
            onAdd={(text, opts) => addTask(listName, text, opts)}
            onToggleDone={(t, done) => toggleDone(t, done)}
            onDeleteTask={(t) => deleteTask(t)}
            onRename={(nn) => renameList(listName, nn)}
            onChangeColor={(hex) => changeListColor(listName, hex)}
            onDeleteList={() => deleteList(listName)}
          />
        ))}
      </div>
    </div>
  );
}
