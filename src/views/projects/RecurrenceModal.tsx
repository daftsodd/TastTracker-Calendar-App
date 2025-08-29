import React, { useState } from 'react';
import { Recurrence } from './types';

export default function RecurrenceModal({
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
      {/* Tag panel so outside click handler ignores inside clicks */}
      <div
        data-modal-panel="recurrence"
        className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-card"
        onMouseDown={(e) => e.stopPropagation()}
      >
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
