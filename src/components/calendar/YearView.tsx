import { useMemo } from 'react';
import type { CalendarEvent } from '@/types/calendar';

interface YearViewProps {
  year: number;
  events: CalendarEvent[];
  onMonthClick: (month: number) => void;
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export function YearView({ year, events, onMonthClick }: YearViewProps) {
  const eventCountByMonth = useMemo(() => {
    const counts = new Array(12).fill(0);
    events.forEach(e => {
      const start = new Date(e.startDate);
      const end = new Date(e.endDate);
      for (let m = start.getMonth(); m <= end.getMonth() || start.getFullYear() < end.getFullYear(); m++) {
        if (m >= 0 && m < 12) counts[m]++;
        if (m >= 11) break;
      }
    });
    return counts;
  }, [events]);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  return (
    <div className="vellum-layer rounded-xl border border-foreground/5 p-6 sm:p-8 shadow-2xl">
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-4">
        {MONTH_NAMES.map((name, month) => {
          const isCurrentMonth = year === currentYear && month === currentMonth;
          const count = eventCountByMonth[month];
          return (
            <button
              key={name}
              className={`p-4 sm:p-6 rounded-xl border transition-all cursor-pointer group text-center ${
                isCurrentMonth
                  ? 'border-blueprint/30 bg-blueprint/5'
                  : 'border-foreground/5 hover:border-foreground/10 hover:bg-background/60'
              }`}
              onClick={() => onMonthClick(month)}
            >
              <h3 className={`font-serif text-base sm:text-lg italic group-hover:text-blueprint transition-colors ${
                isCurrentMonth ? 'text-blueprint' : ''
              }`}>
                {name}
              </h3>
              {count > 0 && (
                <span className="text-[10px] text-muted-foreground mt-1 inline-block">
                  {count} {count === 1 ? 'event' : 'events'}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
