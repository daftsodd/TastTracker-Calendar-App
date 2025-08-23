import React, { useMemo } from 'react';

function startOfWeekMonday(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Mon=0
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfMonth(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function sameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

export default function RightRail({
  anchor,
  setAnchor,
}: {
  anchor: Date;
  setAnchor: React.Dispatch<React.SetStateAction<Date>>;
}) {
  const today = new Date();
  const monthStart = startOfMonth(anchor);
  const gridStart = startOfWeekMonday(monthStart); // Monday-first
  const days = useMemo(
    () => Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [anchor.getFullYear(), anchor.getMonth()]
  );
  const selectedWeekStart = startOfWeekMonday(anchor);

  const goMonth = (delta: number) => {
    const next = new Date(anchor.getFullYear(), anchor.getMonth() + delta, 1);
    setAnchor(next);
  };
  const goToday = () => setAnchor(new Date());
  const inMonth = (d: Date) => d.getMonth() === anchor.getMonth();

  return (
    <aside className="h-full border-l border-surface-border bg-[#F1F3F5]" style={{ width: 240 }}>
      <div className="p-2">
        <div className="rounded-xl bg-[#F1F3F5] p-2">
          {/* Header */}
          <div className="flex items-center justify-between px-2 pt-2">
            <div className="font-medium">
              {anchor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-2 py-1 rounded-md border border-surface-border text-[11px] bg-white/80 hover:bg-white"
                onClick={goToday}
              >
                Today
              </button>
              <div className="flex">
                <button
                  className="px-2 py-1 rounded-md border border-surface-border bg-white/80 hover:bg-white"
                  aria-label="Previous month"
                  onClick={() => goMonth(-1)}
                >
                  ‹
                </button>
                <button
                  className="ml-2 px-2 py-1 rounded-md border border-surface-border bg-white/80 hover:bg-white"
                  aria-label="Next month"
                  onClick={() => goMonth(1)}
                >
                  ›
                </button>
              </div>
            </div>
          </div>

          {/* Weekday labels (Mon-first) */}
          <div className="px-2 mt-2 grid grid-cols-7 text-[11px] text-text-muted">
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
              <div key={d} className="text-center py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Grid — smaller tiles (28px) */}
          <div className="px-2 pb-2 grid grid-cols-7 gap-1">
            {days.map((d) => {
              const isInMonth = inMonth(d);
              const isToday = sameDay(d, today);
              const isSelectedDay = sameDay(d, anchor);
              const isInSelectedWeek = d >= selectedWeekStart && d < addDays(selectedWeekStart, 7);

              const tileBase = 'w-7 h-7 rounded-md text-[12px] grid place-items-center transition relative';

              if (isToday) {
                // Black pill & very bold 14px numeral
                return (
                  <button
                    key={d.toISOString()}
                    onClick={() => setAnchor(d)}
                    title={d.toDateString()}
                    className={[
                      tileBase,
                      'bg-black text-white font-black tracking-tighter hover:brightness-95',
                      'text-[14px]',
                    ].join(' ')}
                  >
                    <span>{d.getDate()}</span>
                  </button>
                );
              }

              return (
                <button
                  key={d.toISOString()}
                  onClick={() => setAnchor(d)}
                  title={d.toDateString()}
                  className={[
                    tileBase,
                    isInMonth ? 'text-text' : 'text-text-muted/60',
                    'hover:bg-white/70',
                    // thin black ring for selected day
                    isSelectedDay ? 'ring-1 ring-black/80' : '',
                  ].join(' ')}
                >
                  {/* faint selected-week wash */}
                  {isInSelectedWeek && <span className="absolute inset-0 rounded-md bg-black/[0.03] -z-[1]" />}
                  <span>{d.getDate()}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
