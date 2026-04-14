import { useState } from 'react';
import type { CalendarEvent } from '@/types/calendar';
import { USER_COLORS, USER_COLOR_BGS } from '@/types/calendar';
import { useAuth } from '@/hooks/useAuth';
import { Pencil, Trash2 } from 'lucide-react';

interface DayViewProps {
  date: string;
  events: CalendarEvent[];
  onBack: () => void;
  onEditEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (id: string) => void;
  getDisplayName: (userId: string) => string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function DayView({ date, events, onBack, onEditEvent, onDeleteEvent, getDisplayName }: DayViewProps) {
  const { user } = useAuth();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const dayEvents = events.filter(e => date >= e.startDate && date <= e.endDate);
  const [year, month, day] = date.split('-');
  const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  const formatted = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const hourHeight = 60;
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
          const duration = Math.max(endMin - startMin, 30);
          const top = (startMin / 60) * hourHeight;
          const height = (duration / 60) * hourHeight;
          const color = USER_COLORS[event.userColor % USER_COLORS.length];
          const bg = USER_COLOR_BGS[event.userColor % USER_COLOR_BGS.length];
          const isOwner = event.userId === user?.id;

          return (
            <div
              key={event.id}
              className="absolute left-20 right-4 rounded-lg px-3 py-2 border-l-3 overflow-hidden transition-all hover:shadow-md group cursor-pointer"
              style={{
                top,
                height: Math.max(height, 28),
                backgroundColor: bg,
                borderLeftColor: color,
                borderLeftWidth: 3,
                zIndex: 10 + i,
              }}
              onClick={() => isOwner && onEditEvent(event)}
            >
              <div className="flex items-start justify-between gap-1">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate" style={{ color }}>
                    {event.title}
                  </div>
                  <div className="text-[10px] text-muted-foreground/60 truncate">
                    by {getDisplayName(event.userId)}
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
                {isOwner && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); onEditEvent(event); }}
                      className="size-6 rounded flex items-center justify-center hover:bg-foreground/10 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-3 h-3" style={{ color }} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirmDelete === event.id) {
                          onDeleteEvent(event.id);
                          setConfirmDelete(null);
                        } else {
                          setConfirmDelete(event.id);
                          setTimeout(() => setConfirmDelete(null), 3000);
                        }
                      }}
                      className={`size-6 rounded flex items-center justify-center transition-colors ${
                        confirmDelete === event.id ? 'bg-destructive/20' : 'hover:bg-destructive/10'
                      }`}
                      title={confirmDelete === event.id ? 'Click again to confirm' : 'Delete'}
                    >
                      <Trash2 className={`w-3 h-3 ${confirmDelete === event.id ? 'text-destructive' : ''}`} style={confirmDelete !== event.id ? { color } : {}} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
