import { useMemo } from 'react';
import type { CalendarEvent } from '@/types/calendar';
import { USER_COLORS, USER_COLOR_BGS } from '@/types/calendar';

interface MonthViewProps {
  year: number;
  month: number;
  events: CalendarEvent[];
  onDateClick: (date: string) => void;
  onDayView: (date: string) => void;
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function getMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  // Monday = 0
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;
  
  const days: { date: string; day: number; isCurrentMonth: boolean }[] = [];

  // Previous month padding
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({
      date: formatDate(d),
      day: d.getDate(),
      isCurrentMonth: false,
    });
  }

  // Current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d);
    days.push({
      date: formatDate(date),
      day: d,
      isCurrentMonth: true,
    });
  }

  // Next month padding
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      const date = new Date(year, month + 1, d);
      days.push({
        date: formatDate(date),
        day: d,
        isCurrentMonth: false,
      });
    }
  }

  return days;
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getEventsForDate(events: CalendarEvent[], date: string) {
  return events.filter(e => date >= e.startDate && date <= e.endDate);
}

export function MonthView({ year, month, events, onDateClick, onDayView }: MonthViewProps) {
  const grid = useMemo(() => getMonthGrid(year, month), [year, month]);
  const today = formatDate(new Date());

  return (
    <div className="vellum-layer rounded-xl border border-foreground/5 p-1 shadow-2xl overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-foreground/5">
        {DAY_NAMES.map(d => (
          <div key={d} className="py-4 text-center text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7">
        {grid.map(({ date, day, isCurrentMonth }) => {
          const dayEvents = getEventsForDate(events, date);
          const isToday = date === today;

          return (
            <div
              key={date}
              className="calendar-cell min-h-[130px]"
              onClick={() => onDateClick(date)}
              onDoubleClick={() => onDayView(date)}
            >
              <span
                className={`text-xs tabular-nums ${
                  isToday
                    ? 'text-blueprint font-semibold'
                    : isCurrentMonth
                    ? 'text-foreground/90'
                    : 'text-foreground/25'
                }`}
              >
                {day}
                {isToday && (
                  <span className="ml-1.5 text-[10px] uppercase tracking-tighter font-medium text-blueprint">
                    Today
                  </span>
                )}
              </span>

              {/* Events */}
              <div className="flex flex-col gap-0.5 mt-1 overflow-hidden flex-1">
                {dayEvents.slice(0, 3).map(event => (
                  <div
                    key={event.id}
                    className="event-pill truncate"
                    style={{
                      backgroundColor: USER_COLOR_BGS[event.userColor % USER_COLOR_BGS.length],
                      borderLeftColor: USER_COLORS[event.userColor % USER_COLORS.length],
                    }}
                    onClick={e => {
                      e.stopPropagation();
                      onDayView(date);
                    }}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-[10px] text-muted-foreground px-2">
                    +{dayEvents.length - 3} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
