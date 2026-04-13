import { useMemo } from 'react';
import type { CalendarEvent } from '@/types/calendar';

interface YearViewProps {
  year: number;
  events: CalendarEvent[];
  onMonthClick: (month: number) => void;
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SHORT_DAYS = ['M','T','W','T','F','S','S'];

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getMiniMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const days: ({ day: number; date: string } | null)[] = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ day: d, date: formatDate(new Date(year, month, d)) });
  }
  return days;
}

export function YearView({ year, events, onMonthClick }: YearViewProps) {
  const today = formatDate(new Date());

  const eventDates = useMemo(() => {
    const dates = new Set<string>();
    events.forEach(e => {
      const start = new Date(e.startDate);
      const end = new Date(e.endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.add(formatDate(new Date(d)));
      }
    });
    return dates;
  }, [events]);

  return (
    <div className="vellum-layer rounded-xl border border-foreground/5 p-8 shadow-2xl">
      <div className="grid grid-cols-4 gap-8">
        {MONTH_NAMES.map((name, month) => {
          const grid = getMiniMonthGrid(year, month);
          return (
            <button
              key={name}
              className="text-left p-4 rounded-lg hover:bg-background/60 transition-colors cursor-pointer group"
              onClick={() => onMonthClick(month)}
            >
              <h3 className="font-serif text-lg italic mb-3 group-hover:text-blueprint transition-colors">
                {name}
              </h3>
              <div className="grid grid-cols-7 gap-px">
                {SHORT_DAYS.map((d, i) => (
                  <div key={i} className="text-[8px] text-center text-muted-foreground/50 font-medium pb-1">
                    {d}
                  </div>
                ))}
                {grid.map((item, i) => (
                  <div key={i} className="relative flex items-center justify-center h-5">
                    {item && (
                      <>
                        <span
                          className={`text-[10px] tabular-nums ${
                            item.date === today
                              ? 'text-blueprint font-bold'
                              : 'text-foreground/60'
                          }`}
                        >
                          {item.day}
                        </span>
                        {eventDates.has(item.date) && (
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blueprint" />
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
