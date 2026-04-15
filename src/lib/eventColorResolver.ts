import type { CalendarEvent } from '@/types/calendar';
import { USER_COLORS, USER_COLOR_BGS } from '@/types/calendar';
import type { ProfileData } from '@/hooks/useProfiles';
import type { EventAttendee } from '@/hooks/useEventAttendees';

const DEFAULT_COLOR = 'hsl(0, 0%, 65%)';
const DEFAULT_COLOR_BG = 'hsla(0, 0%, 65%, 0.12)';

/**
 * Resolve event display color based on priority:
 * 1. If the viewing user is assigned → their profile color
 * 2. If the event creator is assigned → creator's profile color
 * 3. First assigned user's profile color
 * 4. Default grey
 */
export function resolveEventColor(
  event: CalendarEvent,
  viewingUserId: string | undefined,
  attendees: EventAttendee[],
  profileList: ProfileData[],
): { color: string; bg: string; colorIndex: number } {
  const getProfile = (userId: string) => profileList.find(p => p.userId === userId);

  // Build the set of assigned user IDs from attendees only
  const assignedUserIds = attendees.map(a => a.userId);
  const uniqueAssigned = [...new Set(assignedUserIds)];

  if (uniqueAssigned.length === 0) {
    return { color: DEFAULT_COLOR, bg: DEFAULT_COLOR_BG, colorIndex: -1 };
  }

  // 1. Viewing user is assigned
  if (viewingUserId && uniqueAssigned.includes(viewingUserId)) {
    const profile = getProfile(viewingUserId);
    if (profile) {
      const idx = profile.preferredColor % USER_COLORS.length;
      return { color: USER_COLORS[idx], bg: USER_COLOR_BGS[idx], colorIndex: idx };
    }
  }

  // 2. Event creator is assigned
  if (uniqueAssigned.includes(event.userId)) {
    const profile = getProfile(event.userId);
    if (profile) {
      const idx = profile.preferredColor % USER_COLORS.length;
      return { color: USER_COLORS[idx], bg: USER_COLOR_BGS[idx], colorIndex: idx };
    }
  }

  // 3. First assigned user
  for (const uid of uniqueAssigned) {
    const profile = getProfile(uid);
    if (profile) {
      const idx = profile.preferredColor % USER_COLORS.length;
      return { color: USER_COLORS[idx], bg: USER_COLOR_BGS[idx], colorIndex: idx };
    }
  }

  // 4. Default grey
  return { color: DEFAULT_COLOR, bg: DEFAULT_COLOR_BG, colorIndex: -1 };
}
