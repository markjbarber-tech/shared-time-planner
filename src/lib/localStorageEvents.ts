import type { CalendarEvent, ChildProfile } from '@/types/calendar';

const EVENTS_KEY = 'calendar_local_events';
const CHILD_PROFILES_KEY = 'calendar_local_child_profiles';
const ANONYMOUS_USER_ID = 'local-user';

export function getAnonymousUserId() {
  return ANONYMOUS_USER_ID;
}

// === Events ===

export function getLocalEvents(): CalendarEvent[] {
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalEvents(events: CalendarEvent[]) {
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
}

export function addLocalEvent(event: Omit<CalendarEvent, 'id' | 'createdAt'>): CalendarEvent {
  const newEvent: CalendarEvent = {
    ...event,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const events = getLocalEvents();
  events.push(newEvent);
  saveLocalEvents(events);
  return newEvent;
}

export function updateLocalEvent(id: string, updates: Partial<CalendarEvent>) {
  const events = getLocalEvents();
  const idx = events.findIndex(e => e.id === id);
  if (idx !== -1) {
    events[idx] = { ...events[idx], ...updates };
    saveLocalEvents(events);
    return events[idx];
  }
  return null;
}

export function deleteLocalEvent(id: string) {
  const events = getLocalEvents().filter(e => e.id !== id);
  saveLocalEvents(events);
}

// === Child Profiles ===

export function getLocalChildProfiles(): ChildProfile[] {
  try {
    const raw = localStorage.getItem(CHILD_PROFILES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalChildProfiles(profiles: ChildProfile[]) {
  localStorage.setItem(CHILD_PROFILES_KEY, JSON.stringify(profiles));
}

export function addLocalChildProfile(displayName: string, preferredColor: number = 0): ChildProfile {
  const profile: ChildProfile = {
    id: crypto.randomUUID(),
    parentUserId: ANONYMOUS_USER_ID,
    displayName,
    preferredColor,
    avatarUrl: null,
  };
  const profiles = getLocalChildProfiles();
  profiles.push(profile);
  saveLocalChildProfiles(profiles);
  return profile;
}

export function updateLocalChildProfile(id: string, updates: Partial<Pick<ChildProfile, 'displayName' | 'preferredColor'>>) {
  const profiles = getLocalChildProfiles();
  const idx = profiles.findIndex(p => p.id === id);
  if (idx !== -1) {
    if (updates.displayName !== undefined) profiles[idx].displayName = updates.displayName;
    if (updates.preferredColor !== undefined) profiles[idx].preferredColor = updates.preferredColor;
    saveLocalChildProfiles(profiles);
    return profiles[idx];
  }
  return null;
}

export function deleteLocalChildProfile(id: string) {
  saveLocalChildProfiles(getLocalChildProfiles().filter(p => p.id !== id));
}

// === Migration ===

export function getLocalDataForMigration() {
  return {
    events: getLocalEvents(),
    childProfiles: getLocalChildProfiles(),
  };
}

export function clearLocalData() {
  localStorage.removeItem(EVENTS_KEY);
  localStorage.removeItem(CHILD_PROFILES_KEY);
}
