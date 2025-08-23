import React, { useMemo, useState } from 'react'
import { Card } from '../components/UI'
import { useSettings, useTasks } from '../lib/hooks'

export default function BudgetView({user}:{user:any}) {
  const { settings, save } = useSettings(user)
  const [month] = useState(new Date())
  const tasks = useTasks(user, month.toISOString())

  const valuePerPoint = useMemo(() => {
    const goal = Number(settings.monthlyGoal || 0)
    const est = Number(settings.estimatedMonthlyPoints || 0)
    return (goal === 0 || est === 0) ? 0 : (goal / est)
  }, [settings.monthlyGoal, settings.estimatedMonthlyPoints])

  const DIFFICULTY_POINTS: Record<string, number> = { Easy:1, Medium:2, Hard:4 }

  const visibleMonth = month.getMonth()
  const visibleYear = month.getFullYear()

  const monthTasks = tasks.filter(t => {
    const d = t.completedAtDate || t.date
    if (!d) return false
    const dt = new Date(d + 'T00:00:00')
    return dt.getMonth() === visibleMonth && dt.getFullYear() === visibleYear
  })

  const completed = monthTasks.filter(t => t.completed || t.status === 'done')
  const failed = monthTasks.filter(t => t.status === 'failed')
  const pointsFrom = (arr:any[]) => arr.reduce((sum, t) => sum + (t.points ?? DIFFICULTY_POINTS[t.difficulty] ?? 1), 0)

  const moneyEarned = Math.max(0, pointsFrom(completed) * valuePerPoint)
  const savings = Math.max(0, pointsFrom(failed) * valuePerPoint)

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat title="Money Earned" value={`${moneyEarned.toFixed(2)} NOK`} sub={`in ${month.toLocaleString('en-US',{month:'long'})}`} />
        <Stat title="Savings Pool" value={`${savings.toFixed(2)} NOK`} sub="From missed tasks" tone="warn" />
        <Stat title="Value per Point" value={`${valuePerPoint.toFixed(2)} NOK`} sub={`${settings.estimatedMonthlyPoints || 0} est. points`} tone="accent" />
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-4">
          <Field label="Monthly Goal (NOK)">
            <input type="number" defaultValue={settings.monthlyGoal || 0}
              onBlur={(e)=>save({monthlyGoal:Number(e.target.value)})}
              className="px-3 py-2 border rounded-lg w-48 focus:outline-none focus:ring-2 focus:ring-brand-300" />
          </Field>
          <Field label="Estimated Monthly Points">
            <input type="number" defaultValue={settings.estimatedMonthlyPoints || 0}
              onBlur={(e)=>save({estimatedMonthlyPoints:Number(e.target.value)})}
              className="px-3 py-2 border rounded-lg w-48 focus:outline-none focus:ring-2 focus:ring-brand-300" />
          </Field>
          <div className="ml-auto text-sm text-text-muted">Changes are saved automatically</div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-sm font-semibold mb-3">This Month's Activity</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="text-text-muted">Completed tasks: <span className="font-medium text-text">{completed.length}</span></div>
          <div className="text-text-muted">Missed tasks: <span className="font-medium text-text">{failed.length}</span></div>
          <div className="text-text-muted">Points from completed: <span className="font-medium text-text">{pointsFrom(completed)}</span></div>
          <div className="text-text-muted">Points from missed: <span className="font-medium text-text">{pointsFrom(failed)}</span></div>
        </div>
      </Card>
    </div>
  )
}

function Stat({title, value, sub, tone}:{title:string, value:string, sub?:string, tone?:'warn'|'accent'}){
  return (
    <Card className="p-4">
      <div className="text-xs text-text-muted uppercase tracking-wide">{title}</div>
      <div className={"mt-1 text-2xl font-semibold " + (tone==='warn'?'text-yellow-600': tone==='accent'?'text-orange-600':'text-brand-600')}>{value}</div>
      {sub && <div className="mt-1 text-xs text-text-muted">{sub}</div>}
    </Card>
  )
}

function Field({label, children}:{label:string, children:any}){
  return (
    <div>
      <div className="text-xs text-text-muted mb-1">{label}</div>
      {children}
    </div>
  )
}
