export type EventVisibility = 'public' | 'shared' | 'private';
export type ReminderType = 'email' | 'push';
export type ReminderTiming = '1hour' | '1day' | '1week';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  visibility: EventVisibility;
  userId: string;
  userColor: number; // index 0-5
  reminder?: {
    type: ReminderType;
    timing: ReminderTiming;
  };
  createdAt: string;
}

export type CalendarView = 'month' | 'year' | 'day';

export const USER_COLORS = [
  'hsl(209, 24%, 49%)',
  'hsl(142, 40%, 45%)',
  'hsl(20, 70%, 55%)',
  'hsl(280, 40%, 55%)',
  'hsl(45, 80%, 50%)',
  'hsl(340, 60%, 55%)',
];

export const USER_COLOR_BGS = [
  'hsl(209, 24%, 49%, 0.12)',
  'hsl(142, 40%, 45%, 0.12)',
  'hsl(20, 70%, 55%, 0.12)',
  'hsl(280, 40%, 55%, 0.12)',
  'hsl(45, 80%, 50%, 0.12)',
  'hsl(340, 60%, 55%, 0.12)',
];
