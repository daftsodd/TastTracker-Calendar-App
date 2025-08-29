import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '../../components/Icons';
import type { Task } from '../projects/types';
import { rgba } from '../projects/color';

type Props = {
  days: Date[];                                      // 7 days, Monday -> Sunday
  tasksByDay: Record<string, Task[]>;                // key = YYYY-MM-DD
  colorByList?: Record<string, string | undefined>;  // list name -> hex
  expandAll: boolean;
  onToggleAll: () => void;
  onTaskClick: (e: React.MouseEvent, task: Task) => void;
  isDone?: (t: Task) => boolean;                     // per-occurrence done
};

function fmtISO(d: Date) {
  const z = new Date(d); z.setHours(0,0,0,0);
  return z.toISOString().slice(0,10);
}

const ROW_H = 26;
const GAP_Y = 4;

export default function AllDayTasksBar({
  days, tasksByDay, colorByList, expandAll, onToggleAll, onTaskClick, isDone,
}: Props) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!barRef.current) return;
      const t = e.target as HTMLElement;
      if (!barRef.current.contains(t)) setOpenKey(null);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  return (
    <div ref={barRef} className="grid grid-cols-8 bg-white">
      {/* left gutter: expand/collapse ALL days */}
      <div className="border-r border-surface-border bg-white flex items-start justify-center px-1 py-2">
        <button
          onClick={onToggleAll}
          title={expandAll ? 'Collapse all' : 'Expand all'}
          className="w-7 h-7 rounded-md border border-surface-border hover:bg-surface-muted inline-flex items-center justify-center"
        >
          <Icon name={expandAll ? 'ChevronUp' : 'ChevronDown'} />
        </button>
      </div>

      {/* days */}
      <div className="col-span-7 grid grid-cols-7">
        {days.map((d) => {
          const key = fmtISO(d);
          const tasks = (tasksByDay[key] || []);
          const isOpen = expandAll || openKey === key;

          const total = tasks.length;
          const visibleCount = isOpen ? total : Math.min(total, 2);
          const hiddenCount  = Math.max(0, total - visibleCount);

          const collapsedH = Math.max(0, visibleCount) * ROW_H + Math.max(0, visibleCount - 1) * GAP_Y;
          const expandedH  = total * ROW_H + Math.max(0, total - 1) * GAP_Y;

          return (
            <div key={key} className="relative border-r last:border-r-0 border-surface-border px-2 py-2">
              <div
                className="space-y-1 overflow-hidden transition-[max-height] duration-200 ease-out"
                style={{ maxHeight: (isOpen ? expandedH : collapsedH) + 'px' }}
              >
                {tasks.map((t) => {
                  const hex = colorByList?.[(t.list || 'Inbox')] || undefined;
                  const baseStyle = hex
                    ? { backgroundColor: rgba(hex, 0.22), borderColor: rgba(hex, 0.4) }
                    : undefined;
                  const done = isDone ? isDone(t) : ((t.status ?? 'active') === 'done');

                  return (
                    <button
                      key={`${t.id}-${t.date || ''}`}
                      onClick={(e) => onTaskClick(e, t)}
                      className={`w-full text-left truncate text-xs px-2 py-1 rounded-md border border-surface-border hover:bg-surface-muted ${
                        done ? 'line-through opacity-60' : ''
                      }`}
                      style={baseStyle}
                      title={t.text || t.title || 'Task'}
                    >
                      {t.text || t.title || 'Task'}
                    </button>
                  );
                })}
              </div>

              {!expandAll && hiddenCount > 0 && (
                <button
                  onClick={() => setOpenKey(isOpen ? null : key)}
                  className="mt-1 text-xs px-2 py-1 rounded-md border border-surface-border bg-white hover:bg-surface-muted"
                  title="Show more"
                >
                  {isOpen ? 'Show less' : `+${hiddenCount} more`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
