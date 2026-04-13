import type { CalendarEvent } from '@/types/calendar';
import { USER_COLORS, USER_COLOR_BGS } from '@/types/calendar';

interface DayViewProps {
  date: string;
  events: CalendarEvent[];
  onBack: () => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function DayView({ date, events, onBack }: DayViewProps) {
  const dayEvents = events.filter(e => date >= e.startDate && date <= e.endDate);
  const [year, month, day] = date.split('-');
  const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  const formatted = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const totalMinutes = 24 * 60;
  const hourHeight = 60; // px per hour
  const totalHeight = 24 * hourHeight;

  return (
    <div className="vellum-layer rounded-xl border border-foreground/5 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-foreground/5">
        <div>
          <button
            onClick={onBack}
            className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-1 block"
          >
            ← Back to month
          </button>
          <h2 className="font-serif text-2xl italic">{formatted}</h2>
        </div>
        <span className="text-sm text-muted-foreground">{dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Timeline */}
      <div className="relative overflow-y-auto max-h-[600px]" style={{ height: totalHeight + 40 }}>
        {/* Hour lines */}
        {HOURS.map(hour => (
          <div
            key={hour}
            className="absolute left-0 right-0 border-t border-foreground/5 flex"
            style={{ top: hour * hourHeight }}
          >
            <span className="w-16 text-right pr-3 text-[10px] text-muted-foreground tabular-nums -translate-y-2 select-none">
              {String(hour).padStart(2, '0')}:00
            </span>
          </div>
        ))}

        {/* Events */}
        {dayEvents.map((event, i) => {
          const startMin = timeToMinutes(event.startTime);
          const endMin = timeToMinutes(event.endTime);
          const duration = Math.max(endMin - startMin, 30); // min 30min display
          const top = (startMin / 60) * hourHeight;
          const height = (duration / 60) * hourHeight;
          const color = USER_COLORS[event.userColor % USER_COLORS.length];
          const bg = USER_COLOR_BGS[event.userColor % USER_COLOR_BGS.length];

          return (
            <div
              key={event.id}
              className="absolute left-20 right-4 rounded-lg px-3 py-2 border-l-3 overflow-hidden transition-all hover:shadow-md"
              style={{
                top,
                height: Math.max(height, 28),
                backgroundColor: bg,
                borderLeftColor: color,
                borderLeftWidth: 3,
                zIndex: 10 + i,
              }}
            >
              <div className="text-xs font-medium truncate" style={{ color }}>
                {event.title}
              </div>
              {height > 35 && (
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {event.startTime} — {event.endTime}
                </div>
              )}
              {height > 55 && event.description && (
                <div className="text-[10px] text-muted-foreground/70 mt-1 truncate">
                  {event.description}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
