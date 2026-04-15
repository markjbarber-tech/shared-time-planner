import type { CalendarEvent } from '@/types/calendar';
import { USER_COLORS, USER_COLOR_BGS } from '@/types/calendar';
import { useAuth } from '@/hooks/useAuth';
import { Clock, Calendar, Users, Repeat } from 'lucide-react';
import type { EventAttendee } from '@/hooks/useEventAttendees';
import { resolveEventColor } from '@/lib/eventColorResolver';

interface TodayViewProps {
  date: string;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  getDisplayName: (userId: string) => string;
  getChildProfileName?: (childProfileId: string) => string;
  getAttendees?: (eventId: string) => EventAttendee[];
  profileList: { userId: string; displayName: string; preferredColor: number }[];
}

function format12h(time: string): string {
  const [hStr, mStr] = time.split(':');
  const h = parseInt(hStr);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${mStr} ${period}`;
}

export function TodayView({ date, events, onEventClick, getDisplayName, getChildProfileName, getAttendees, profileList }: TodayViewProps) {
  const { user } = useAuth();
  const [year, month, day] = date.split('-');
  const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  const formatted = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const todayStr = (() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  })();
  const isToday = date === todayStr;

  const sorted = [...events].sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <span className="text-[10px] tracking-[0.2em] uppercase font-medium text-muted-foreground">
            {isToday ? "Today's Schedule" : 'Daily Schedule'}
          </span>
          <h2 className="font-serif text-xl sm:text-2xl italic mt-1">{formatted}</h2>
        </div>
        <span className="text-sm text-muted-foreground">
          {sorted.length} event{sorted.length !== 1 ? 's' : ''}
        </span>
      </div>

      {sorted.length === 0 ? (
        <div className="vellum-layer rounded-xl border border-foreground/5 p-8 sm:p-12 text-center">
          <p className="text-muted-foreground text-sm italic">No events scheduled</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(event => {
            const eventAttendees = getAttendees ? getAttendees(event.id) : [];
            const { color } = resolveEventColor(event, user?.id, eventAttendees, profileList);
            const spansMultipleDays = event.startDate !== event.endDate;

            const assignedPeople: { id: string; name: string; color: string }[] = [];
            const ownerProfile = profileList.find(p => p.userId === event.userId);
            const ownerName = event.childProfileId && getChildProfileName
              ? getChildProfileName(event.childProfileId)
              : getDisplayName(event.userId);
            const ownerColor = ownerProfile
              ? USER_COLORS[ownerProfile.preferredColor % USER_COLORS.length]
              : color;
            assignedPeople.push({ id: event.userId, name: ownerName, color: ownerColor });

            for (const att of eventAttendees) {
              if (att.userId === event.userId) continue;
              const attProfile = profileList.find(p => p.userId === att.userId);
              assignedPeople.push({
                id: att.userId,
                name: getDisplayName(att.userId),
                color: attProfile ? USER_COLORS[attProfile.preferredColor % USER_COLORS.length] : 'hsl(var(--muted-foreground))',
              });
            }

            const showAttendees = assignedPeople.length > 1;

            return (
              <button
                key={event.id}
                onClick={() => onEventClick(event)}
                className="w-full text-left vellum-layer rounded-xl border border-foreground/5 overflow-hidden transition-all hover:shadow-lg hover:border-foreground/10 active:scale-[0.99] group"
              >
                <div className="h-1" style={{ backgroundColor: color }} />
                <div className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-serif text-base sm:text-lg font-medium" style={{ color }}>
                      {event.title}
                    </h3>
                    {event.recurrenceType && <Repeat className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-1" />}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>{format12h(event.startTime)} — {format12h(event.endTime)}</span>
                  </div>

                  {spansMultipleDays && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {new Date(event.startDate + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {' — '}
                        {new Date(event.endDate + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  )}

                  {event.description && (
                    <p className="text-sm text-muted-foreground/80 line-clamp-2">{event.description}</p>
                  )}

                  {showAttendees ? (
                    <div className="flex items-center gap-2 pt-1">
                      <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <div className="flex flex-wrap gap-1.5">
                        {assignedPeople.map(person => (
                          <span key={person.id} className="inline-flex items-center gap-1.5 text-xs">
                            <span
                              className="size-5 rounded-full flex items-center justify-center text-[10px] font-semibold text-white shrink-0"
                              style={{ backgroundColor: person.color }}
                            >
                              {(person.name || 'U')[0]?.toUpperCase()}
                            </span>
                            <span className="text-muted-foreground">
                              {person.name}
                              {person.id === user?.id && ' (me)'}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 pt-1">
                      <span
                        className="size-5 rounded-full flex items-center justify-center text-[10px] font-semibold text-white shrink-0"
                        style={{ backgroundColor: ownerColor }}
                      >
                        {(ownerName || 'U')[0]?.toUpperCase()}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {ownerName}
                        {event.userId === user?.id && ' (me)'}
                      </span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
