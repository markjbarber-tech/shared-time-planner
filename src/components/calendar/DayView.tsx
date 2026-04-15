import { useState, useEffect, useRef } from 'react';
import type { CalendarEvent } from '@/types/calendar';
import { USER_COLORS, USER_COLOR_BGS } from '@/types/calendar';
import { useAuth } from '@/hooks/useAuth';
import { Pencil, Trash2, Users, Plus } from 'lucide-react';
import type { EventAttendee } from '@/hooks/useEventAttendees';
import type { ProfileData } from '@/hooks/useProfiles';
import { resolveEventColor } from '@/lib/eventColorResolver';

interface DayViewProps {
  date: string;
  events: CalendarEvent[];
  onBack: () => void;
  onAddEvent: () => void;
  onEditEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (id: string) => void;
  getDisplayName: (userId: string) => string;
  getChildProfileName?: (childProfileId: string) => string;
  getAttendees?: (eventId: string) => EventAttendee[];
  profileList: ProfileData[];
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function DayView({ date, events, onBack, onAddEvent, onEditEvent, onDeleteEvent, getDisplayName, getChildProfileName, getAttendees, profileList }: DayViewProps) {
  const { user } = useAuth();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const dayEvents = events.filter(e => date >= e.startDate && date <= e.endDate);
  const [year, month, day] = date.split('-');
  const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  const formatted = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const hourHeight = 60;
  const totalHeight = 24 * hourHeight;

  useEffect(() => {
    if (timelineRef.current && dayEvents.length > 0) {
      const earliestMin = Math.min(...dayEvents.map(e => timeToMinutes(e.startTime)));
      const scrollToMin = Math.max(earliestMin - 60, 0);
      const scrollTop = (scrollToMin / 60) * hourHeight;
      timelineRef.current.scrollTop = scrollTop;
    }
  }, [date]);

  return (
    <div className="vellum-layer rounded-xl border border-foreground/5 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 sm:p-6 border-b border-foreground/5">
        <div>
          <button
            onClick={onBack}
            className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-1 block"
          >
            ← Back to month
          </button>
          <h2 className="font-serif text-xl sm:text-2xl italic">{formatted}</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}</span>
          <button
            onClick={onAddEvent}
            className="size-9 rounded-full bg-foreground text-background flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
            title="Add event"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div ref={timelineRef} className="relative overflow-y-auto max-h-[600px]" style={{ height: totalHeight + 40 }}>
        {/* Hour lines */}
        {HOURS.map(hour => (
          <div
            key={hour}
            className="absolute left-0 right-0 border-t border-foreground/5 flex"
            style={{ top: hour * hourHeight }}
          >
            <span className="w-10 sm:w-16 text-right pr-2 sm:pr-3 text-[10px] text-muted-foreground tabular-nums -translate-y-2 select-none">
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
          const eventAttendees = getAttendees ? getAttendees(event.id) : [];
          const { color, bg } = resolveEventColor(event, user?.id, eventAttendees, profileList);
          const isOwner = event.userId === user?.id || event.userId === 'local-user';
          const isChild = !!event.childProfileId;

          return (
            <div
              key={event.id}
              className={`absolute left-12 sm:left-20 right-2 sm:right-4 rounded-lg px-2 sm:px-3 py-2 overflow-hidden transition-all hover:shadow-md group cursor-pointer ${
                isChild ? 'border border-dashed' : 'border-l-3'
              }`}
              style={{
                top,
                height: Math.max(height, 28),
                backgroundColor: bg,
                ...(isChild
                  ? { borderColor: color }
                  : { borderLeftColor: color, borderLeftWidth: 3 }),
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
                    by {event.childProfileId && getChildProfileName ? getChildProfileName(event.childProfileId) : getDisplayName(event.userId)}
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
                  {height > 45 && eventAttendees.length > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <Users className="w-2.5 h-2.5 text-muted-foreground/50 shrink-0" />
                      <div className="flex -space-x-1.5">
                        {eventAttendees.slice(0, 5).map(a => (
                          <span
                            key={a.id}
                            className="size-4 rounded-full bg-foreground/15 flex items-center justify-center text-[7px] font-semibold uppercase ring-1 ring-background"
                            title={getDisplayName(a.userId)}
                          >
                            {(getDisplayName(a.userId) || 'U')[0]}
                          </span>
                        ))}
                        {eventAttendees.length > 5 && (
                          <span className="text-[8px] text-muted-foreground/60 ml-1">
                            +{eventAttendees.length - 5}
                          </span>
                        )}
                      </div>
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
