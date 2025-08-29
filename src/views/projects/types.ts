export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type Importance = 'Low' | 'Medium' | 'High';

export type Recurrence = {
  every: number;
  unit: 'day' | 'week' | 'month' | 'year';
  starts: string;                    // YYYY-MM-DD
  time?: string | null;              // HH:MM (24h)
  ends:
    | { type: 'never' }
    | { type: 'on'; date: string }
    | { type: 'after'; count: number };
};

export type Task = {
  id: string;
  text?: string;
  title?: string;
  status?: 'active' | 'done' | string;    // for non-recurring single tasks
  difficulty?: Difficulty;
  importance?: Importance;
  date?: string | null;                   // for single tasks or recurrence start
  time?: string | null;                   // 24h HH:MM
  list?: string | null;                   // null = Inbox
  recurrence?: Recurrence | null;
  completedDates?: string[];              // ISO dates completed for recurring occurrences
  skippedDates?: string[];                // ISO dates to hide a single occurrence
  createdAt?: any;
};

export type ListDoc = {
  id: string;
  name: string;
  order?: number;
  color?: string | null;                  // hex like #4f46e5
  createdAt?: any;
};

export const DEFAULT_LIST = 'Inbox';
