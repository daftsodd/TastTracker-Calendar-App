import React, { useMemo } from 'react';
import { TopButton } from '../components/UI';
import { useTasks } from '../lib/hooks';

type Props = {
  user: any;
  anchor: Date;
  setAnchor: React.Dispatch<React.SetStateAction<Date>>;
};

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 00..23
const ROW_PX = 64;
const DAY_MIN = 0;
const DAY_MAX = 24 * 60;

const LABEL_COLORS: Record<string, { fill: string; border: string }> = {
  mint: { fill: '#E8FAF1', border: '#AFECD5' },
  blue: { fill: '#EAF3FF', border: '#C7DDFF' },
  purple: { fill: '#F3EAFE', border: '#D7C8FD' },
  yellow: { fill: '#FFF8E5', border: '#FFE3A3' },
  orange: { fill: '#FFF0E6', border: '#FFD1B0' },
  pink: { fill: '#FFEAF5', border: '#FFC9E4' },
  teal: { fill: '#E6FAF9', border: '#B8F0EC' },
  gray: { fill: '#F2F4F7', border: '#E5E7EB' },
};
function colorFor(label?: string) {
  return LABEL_COLORS[label || 'mint'] || LABEL_COLORS.mint;
}

export default function CalendarView({ user, anchor, setAnchor }: Props) {
  const weekStart = startOfWeek(anchor);
  const tasks = useTasks(user, weekStart.toISOString());
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const byDay = useMemo(() => {
    const map = new Map(days.map((d) => [key(d), [] as any[]]));
    tasks.forEach((t) => {
      const k = t.date || (t.completedAtDate || '').slice(0, 10);
      if (map.has(k)) map.get(k)!.push(t);
    });
    return map;
  }, [tasks, weekStart.toISOString()]); // eslint-disable-line react-hooks/exhaustive-deps

  const now = new Date();
  const isThisWeek = now >= weekStart && now < addDays(weekStart, 7);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const moveWeek = (d: number) => setAnchor(addDays(anchor, d * 7));
  const dayHeight = HOURS.length * ROW_PX;

  return (
    <div className="h-full flex flex-col p-6 gap-4">
      {/* Top controls (outside the scroll area) */}
      <div className="flex items-center gap-2">
        <TopButton onClick={() => moveWeek(-1)} aria-label="Previous week">
          &lt;
        </TopButton>
        <div className="text-lg font-semibold">
          {weekStart.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })} – {fmt(addDays(weekStart, 6))}
        </div>
        <TopButton onClick={() => setAnchor(new Date())}>Today</TopButton>
        <TopButton onClick={() => moveWeek(1)} aria-label="Next week">
          &gt;
        </TopButton>
      </div>

      {/* Scrollable calendar with a sticky header row at the top of this panel */}
      <div className="flex-1 overflow-auto border border-surface-border rounded-xl2">
        {/* Sticky day header */}
        <div className="sticky top-0 z-20 grid grid-cols-[64px_repeat(7,1fr)] bg-white/90 backdrop-blur border-b border-surface-border rounded-t-xl2">
          <div className="h-11 border-r border-surface-border rounded-tl-xl2" />
          {days.map((d) => (
            <div
              key={d.toISOString()}
              className="h-11 px-2 flex items-center font-medium text-sm border-l border-surface-border"
            >
              {d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
          ))}
        </div>

        {/* Body grid (hours) */}
        <div className="grid grid-cols-[64px_repeat(7,1fr)]">
          {/* Hour gutter */}
          <div className="bg-surface-muted border-r border-surface-border">
            {HOURS.map((h) => (
              <div key={h} className="h-[64px] text-xs text-right pr-2 pt-2 text-text-muted">
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((d) => {
            const k = key(d);
            const events = byDay.get(k) || [];
            return (
              <div key={k} className="relative border-l border-surface-border bg-white/50">
                {/* grid lines */}
                <div className="absolute inset-0 pointer-events-none">
                  {HOURS.map((h, i) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-t border-surface-border"
                      style={{ top: `${i * ROW_PX}px` }}
                    />
                  ))}
                </div>

                {/* events area */}
                <div className="relative" style={{ height: `${dayHeight}px` }}>
                  {events.map((ev, idx) => {
                    const startM = toMinutes(ev.startTime) ?? 9 * 60;
                    const endM = toMinutes(ev.endTime) ?? startM + (ev.duration ?? 60);
                    const top = ((startM - DAY_MIN) / (DAY_MAX - DAY_MIN)) * dayHeight;
                    const height = Math.max(28, ((endM - startM) / (DAY_MAX - DAY_MIN)) * dayHeight);
                    const c = colorFor(ev.label);
                    return (
                      <div
                        key={ev.id || idx}
                        className="absolute left-2 right-2 rounded-lg border text-sm px-2 py-1"
                        style={{ top, height, background: c.fill, borderColor: c.border }}
                      >
                        <div className="font-medium truncate">{ev.text || ev.title || 'Task'}</div>
                        {ev.startTime && (
                          <div className="text-xs text-text-muted">
                            {ev.startTime}
                            {ev.endTime ? ` – ${ev.endTime}` : ''}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* now line */}
                  {isThisWeek && nowMinutes >= DAY_MIN && nowMinutes <= DAY_MAX && (
                    <div
                      className="absolute left-0 right-0"
                      style={{
                        top: `${((nowMinutes - DAY_MIN) / (DAY_MAX - DAY_MIN)) * dayHeight}px`,
                      }}
                    >
                      <div className="h-[2px] bg-brand-600/80" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function key(d: Date) {
  return d.toISOString().slice(0, 10);
}
function startOfWeek(d: Date) {
  const x = new Date(d);
  const diff = (x.getDay() + 6) % 7; // Monday=0
  x.setDate(x.getDate() - diff);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function toMinutes(hhmm?: string | null) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}
function fmt(d: Date) {
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
}
