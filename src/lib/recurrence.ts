import type { CalendarEvent } from '@/types/calendar';

/**
 * Expand recurring events into virtual instances within a date range.
 * Returns original non-recurring events plus generated instances for recurring ones.
 */
export function expandRecurringEvents(
  events: CalendarEvent[],
  rangeStart: string, // YYYY-MM-DD
  rangeEnd: string     // YYYY-MM-DD
): CalendarEvent[] {
  const result: CalendarEvent[] = [];

  for (const event of events) {
    if (!event.recurrenceType) {
      // Non-recurring: include if it overlaps the range
      if (event.startDate <= rangeEnd && event.endDate >= rangeStart) {
        result.push(event);
      }
      continue;
    }

    // Calculate event duration in days
    const eventStart = new Date(event.startDate + 'T00:00:00');
    const eventEnd = new Date(event.endDate + 'T00:00:00');
    const durationDays = Math.round((eventEnd.getTime() - eventStart.getTime()) / (1000 * 60 * 60 * 24));

    const interval = event.recurrenceInterval || 1;
    const recEnd = event.recurrenceEndDate || rangeEnd;
    const effectiveEnd = recEnd < rangeEnd ? recEnd : rangeEnd;

    // Generate instances
    let current = new Date(eventStart);
    let instanceIndex = 0;

    while (true) {
      const instStartStr = formatDate(current);
      
      // Stop if past effective end
      if (instStartStr > effectiveEnd) break;
      
      const instEnd = new Date(current);
      instEnd.setDate(instEnd.getDate() + durationDays);
      const instEndStr = formatDate(instEnd);

      // Include if overlaps range
      if (instEndStr >= rangeStart && instStartStr <= rangeEnd) {
        result.push({
          ...event,
          id: instanceIndex === 0 ? event.id : `${event.id}__recur_${instanceIndex}`,
          startDate: instStartStr,
          endDate: instEndStr,
        });
      }

      // Advance to next occurrence
      instanceIndex++;
      if (event.recurrenceType === 'weekly') {
        current.setDate(current.getDate() + 7 * interval);
      } else {
        // monthly
        current.setMonth(current.getMonth() + interval);
      }

      // Safety limit
      if (instanceIndex > 200) break;
    }
  }

  return result;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
