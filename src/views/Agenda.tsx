import React, { useMemo, useState } from 'react'
import { TopButton, Card } from '../components/UI'
import { Icon } from '../components/Icons'
import { useTasks } from '../lib/hooks'
import { db, appId } from '../lib/firebase'
import { doc, setDoc } from 'firebase/firestore'

export default function AgendaView({user}:{user:any}) {
  const [date] = useState(new Date())
  const dayKey = date.toISOString().slice(0,10)
  const tasks = useTasks(user, dayKey)
  const todays = useMemo(()=>tasks.filter(t => t.date === dayKey), [tasks, dayKey])

  const toggle = async (t:any) => {
    const ref = doc(db, `artifacts/${appId}/users/${user.uid}/tasks/${t.id}`)
    await setDoc(ref, {
      completed: !t.completed,
      completedAtDate: !t.completed ? dayKey : null,
      status: !t.completed ? 'done' : 'active'
    }, { merge:true })
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-text-muted">Today</div>
          <div className="text-2xl font-semibold">{date.toLocaleDateString(undefined,{weekday:'long', month:'short', day:'numeric'})}</div>
        </div>
        <div className="flex items-center gap-2">
          <TopButton icon={<Icon name="RefreshCw" />} onClick={()=>location.reload()}>Refresh</TopButton>
          <TopButton icon={<Icon name="Plus" />} onClick={()=>alert('New task TBD')}>New Task</TopButton>
        </div>
      </div>

      <Card className="p-4">
        <div className="text-sm font-semibold mb-3">Today's tasks</div>
        <div className="divide-y">
          {todays.length === 0 && <div className="text-text-muted text-sm py-6">No tasks for today.</div>}
          {todays.map(t => (
            <div key={t.id} className="py-3 flex items-center gap-3">
              <input type="checkbox" className="w-4 h-4" checked={!!t.completed} onChange={()=>toggle(t)} />
              <div className={(t.completed ? 'line-through text-text-muted ' : '') + 'flex-1'}>{t.text || t.title || '(untitled task)'}</div>
              {t.duration && <div className="text-xs text-text-muted flex items-center gap-1"><Icon name="Clock" />{t.duration}m</div>}
              {t.difficulty && <span className="text-xs px-2 py-1 rounded-full border border-surface-border">{t.difficulty}</span>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
