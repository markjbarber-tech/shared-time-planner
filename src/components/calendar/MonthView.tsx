import { useMemo, useRef, useCallback } from 'react';
import type { CalendarEvent } from '@/types/calendar';
import { useAuth } from '@/hooks/useAuth';
import { resolveEventColor } from '@/lib/eventColorResolver';
import type { ProfileData } from '@/hooks/useProfiles';
import type { EventAttendee } from '@/hooks/useEventAttendees';

interface MonthViewProps {
  year: number;
  month: number;
  events: CalendarEvent[];
  onDateClick: (date: string) => void;
  onDayView: (date: string) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onSwipeMonth?: (direction: -1 | 1) => void;
  getDisplayName: (userId: string) => string;
  getChildProfileName?: (childProfileId: string) => string;
  profileList: ProfileData[];
  getAttendees: (eventId: string) => EventAttendee[];
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_NAMES_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface DayCell {
  date: string;
  day: number;
  isCurrentMonth: boolean;
}

function getMonthGrid(year: number, month: number): DayCell[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const days: DayCell[] = [];

  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({ date: formatDate(d), day: d.getDate(), isCurrentMonth: false });
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d);
    days.push({ date: formatDate(date), day: d, isCurrentMonth: true });
  }

  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      const date = new Date(year, month + 1, d);
      days.push({ date: formatDate(date), day: d, isCurrentMonth: false });
    }
  }

  return days;
}

interface SpanInfo {
  event: CalendarEvent;
  startCol: number; // 0-6
  span: number;     // number of columns
  lane: number;     // vertical slot index
  isStart: boolean; // does the bar start in this row
  isEnd: boolean;   // does the bar end in this row
}

function getMultiDaySpans(
  week: DayCell[],
  events: CalendarEvent[]
): SpanInfo[] {
  const weekStart = week[0].date;
  const weekEnd = week[6].date;

  // Find multi-day events overlapping this week
  const multiDay = events.filter(
    e => e.startDate !== e.endDate && e.startDate <= weekEnd && e.endDate >= weekStart
  );

  // Sort by start date then by duration (longer first) for stable lane assignment
  multiDay.sort((a, b) => {
    if (a.startDate !== b.startDate) return a.startDate < b.startDate ? -1 : 1;
    const aDur = a.endDate.localeCompare(a.startDate);
    const bDur = b.endDate.localeCompare(b.startDate);
    return bDur - aDur;
  });

  const spans: SpanInfo[] = [];
  const lanes: string[][] = []; // lanes[i] = array of dates occupied

  for (const event of multiDay) {
    const clippedStart = event.startDate < weekStart ? weekStart : event.startDate;
    const clippedEnd = event.endDate > weekEnd ? weekEnd : event.endDate;

    const startCol = week.findIndex(d => d.date === clippedStart);
    const endCol = week.findIndex(d => d.date === clippedEnd);
    if (startCol === -1 || endCol === -1) continue;

    const span = endCol - startCol + 1;
    const isStart = event.startDate >= weekStart;
    const isEnd = event.endDate <= weekEnd;

    // Find a lane
    const occupiedDates = week.slice(startCol, endCol + 1).map(d => d.date);
    let lane = -1;
    for (let l = 0; l < lanes.length; l++) {
      if (!occupiedDates.some(d => lanes[l].includes(d))) {
        lane = l;
        break;
      }
    }
    if (lane === -1) {
      lane = lanes.length;
      lanes.push([]);
    }
    lanes[lane].push(...occupiedDates);

    spans.push({ event, startCol, span, lane, isStart, isEnd });
  }

  return spans;
}

function getSingleDayEvents(events: CalendarEvent[], date: string): CalendarEvent[] {
  return events.filter(
    e => e.startDate === e.endDate && e.startDate === date
  );
}

export function MonthView({ year, month, events, onDateClick, onDayView, onEventClick, onSwipeMonth, getDisplayName, getChildProfileName, profileList, getAttendees }: MonthViewProps) {
  const { user } = useAuth();
  const grid = useMemo(() => getMonthGrid(year, month), [year, month]);
  const today = formatDate(new Date());

  const weeks = useMemo(() => {
    const w: DayCell[][] = [];
    for (let i = 0; i < grid.length; i += 7) {
      w.push(grid.slice(i, i + 7));
    }
    return w;
  }, [grid]);

  const touchStartY = useRef(0);
  const touchStartX = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!onSwipeMonth) return;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(deltaY) > 60 && Math.abs(deltaY) > Math.abs(deltaX) * 1.5) {
      onSwipeMonth(deltaY < 0 ? 1 : -1);
    }
  }, [onSwipeMonth]);

  const SPAN_HEIGHT = 18; // px per spanning bar lane
  const MAX_SPAN_LANES = 3;

  return (
    <div
      className="vellum-layer rounded-none sm:rounded-xl border-x-0 sm:border-x border border-foreground/5 p-0 sm:p-1 shadow-2xl overflow-hidden -mx-4 sm:mx-0"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-foreground/5">
        {DAY_NAMES.map((d, i) => (
          <div key={d} className="py-1.5 sm:py-3 text-center text-[9px] sm:text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
            <span className="hidden sm:inline">{d}</span>
            <span className="sm:hidden">{DAY_NAMES_SHORT[i]}</span>
          </div>
        ))}
      </div>

      {/* Weeks */}
      {weeks.map((week, wi) => {
        const spans = getMultiDaySpans(week, events);
        const numLanes = Math.min(
          spans.length > 0 ? Math.max(...spans.map(s => s.lane)) + 1 : 0,
          MAX_SPAN_LANES
        );
        const spanAreaHeight = numLanes * SPAN_HEIGHT;

        return (
          <div key={wi} className="relative">
            {/* Spanning bars overlay */}
            {spans
              .filter(s => s.lane < MAX_SPAN_LANES)
              .map(({ event, startCol, span, lane, isStart, isEnd }) => {
                const isChild = !!event.childProfileId;
                const eventAttendees = getAttendees(event.id);
                const { color, bg } = resolveEventColor(event, user?.id, eventAttendees, profileList);

                const leftPct = (startCol / 7) * 100;
                const widthPct = (span / 7) * 100;

                return (
                  <div
                    key={`${event.id}-${wi}`}
                    className="absolute z-10 flex items-center cursor-pointer"
                    style={{
                      top: 28 + lane * SPAN_HEIGHT, // below the day number
                      left: `calc(${leftPct}% + ${isStart ? 4 : 0}px)`,
                      width: `calc(${widthPct}% - ${(isStart ? 4 : 0) + (isEnd ? 4 : 0)}px)`,
                      height: SPAN_HEIGHT - 2,
                    }}
                    onClick={e => {
                      e.stopPropagation();
                      if (onEventClick) onEventClick(event);
                    }}
                  >
                    <div
                      className={`w-full h-full flex items-center px-1.5 text-[10px] sm:text-[11px] font-medium truncate ${
                        isStart ? 'rounded-l-sm' : ''
                      } ${isEnd ? 'rounded-r-sm' : ''} ${
                        isChild ? 'border border-dashed' : ''
                      }`}
                      style={{
                        backgroundColor: bg,
                        borderColor: isChild ? color : undefined,
                        borderLeft: !isChild && isStart ? `2px solid ${color}` : undefined,
                        color: color,
                      }}
                    >
                      {isStart && <span className="truncate">{event.title}</span>}
                    </div>
                  </div>
                );
              })}

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {week.map(({ date, day, isCurrentMonth }) => {
                const dayEvents = getSingleDayEvents(events, date);
                const isToday = date === today;

                // Count multi-day events on this date for overflow
                const multiDayOnDate = spans.filter(
                  s => {
                    const sStart = week[s.startCol].date;
                    const sEnd = week[s.startCol + s.span - 1].date;
                    return date >= sStart && date <= sEnd;
                  }
                );
                const hiddenMultiDay = multiDayOnDate.filter(s => s.lane >= MAX_SPAN_LANES).length;

                return (
                  <div
                    key={date}
                    className={`calendar-cell min-h-[105px] sm:min-h-[165px] ${isToday ? 'bg-blueprint/10' : ''}`}
                    onClick={() => onDateClick(date)}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDayView(date);
                      }}
                      className={`text-xs tabular-nums min-w-[28px] min-h-[28px] rounded-full flex items-center justify-center -ml-1 hover:bg-foreground/10 active:bg-foreground/15 transition-colors ${
                        isToday
                          ? 'text-blueprint font-bold bg-blueprint/10'
                          : isCurrentMonth
                          ? 'text-foreground/90'
                          : 'text-foreground/25'
                      }`}
                    >
                      {day}
                    </button>

                    {/* Spacer for multi-day bar area */}
                    {spanAreaHeight > 0 && (
                      <div style={{ height: spanAreaHeight }} />
                    )}

                    {/* Single-day events */}
                    <div className="flex flex-col gap-0.5 mt-0.5 overflow-hidden flex-1">
                      {dayEvents.slice(0, 3).map(event => {
                        const isChild = !!event.childProfileId;
                        const eventAttendees = getAttendees(event.id);
                        const { color, bg } = resolveEventColor(event, user?.id, eventAttendees, profileList);
                        return (
                          <div
                            key={event.id}
                            className={`event-pill truncate cursor-pointer ${isChild ? 'border-l-0 border border-dashed' : ''}`}
                            style={{
                              backgroundColor: bg,
                              ...(isChild
                                ? { borderColor: color }
                                : { borderLeftColor: color }),
                            }}
                            onClick={e => {
                              e.stopPropagation();
                              if (onEventClick) {
                                onEventClick(event);
                              } else {
                                onDayView(date);
                              }
                            }}
                          >
                            <span className="truncate">{event.title}</span>
                          </div>
                        );
                      })}
                      {(dayEvents.length > 3 || hiddenMultiDay > 0) && (
                        <span className="text-[10px] text-muted-foreground px-2">
                          +{dayEvents.length - 3 + hiddenMultiDay} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
