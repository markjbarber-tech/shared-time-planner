import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { CalendarEvent } from '@/types/calendar';
import { expandRecurringEvents } from '@/lib/recurrence';
import {
  getLocalEvents, addLocalEvent, updateLocalEvent, deleteLocalEvent, saveLocalEvents, getAnonymousUserId,
} from '@/lib/localStorageEvents';

export function useCalendarEvents(activeGroupId?: string | null) {
  const { user } = useAuth();
  const isAnonymous = !user;
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch events
  useEffect(() => {
    if (isAnonymous) {
      setEvents(getLocalEvents());
      setLoading(false);
      return;
    }

    const fetchEvents = async () => {
      let query = supabase.from('events').select('*');
      if (activeGroupId) {
        query = query.eq('calendar_group_id', activeGroupId);
      }
      const { data, error } = await query;
      if (!error && data) {
        setEvents(data.map(mapRow));
      }
      setLoading(false);
    };

    fetchEvents();

    const channel = supabase
      .channel('events-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        fetchEvents();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, activeGroupId]);

  const mapRow = (e: any): CalendarEvent => ({
    id: e.id,
    title: e.title,
    description: e.description ?? undefined,
    startDate: e.start_date,
    endDate: e.end_date,
    startTime: e.start_time,
    endTime: e.end_time,
    visibility: e.visibility as CalendarEvent['visibility'],
    userId: e.user_id,
    userColor: e.user_color,
    childProfileId: e.child_profile_id ?? null,
    reminder: e.reminder_type && e.reminder_timing
      ? { type: e.reminder_type as 'email' | 'push', timing: e.reminder_timing as '1hour' | '1day' | '1week' }
      : undefined,
    recurrenceType: e.recurrence_type ?? null,
    recurrenceInterval: e.recurrence_interval ?? 1,
    recurrenceEndDate: e.recurrence_end_date ?? null,
    calendarGroupId: e.calendar_group_id ?? null,
    createdAt: e.created_at,
  });
  const addEvent = useCallback(async (event: Omit<CalendarEvent, 'id' | 'createdAt'>) => {
    if (isAnonymous) {
      const newEvent = addLocalEvent({ ...event, userId: getAnonymousUserId() });
      setEvents(prev => [...prev, newEvent]);
      return newEvent;
    }

    if (!user) return null;
    const { data, error } = await supabase.from('events').insert({
      title: event.title,
      description: event.description ?? null,
      start_date: event.startDate,
      end_date: event.endDate,
      start_time: event.startTime,
      end_time: event.endTime,
      visibility: event.visibility,
      user_id: event.userId || user.id,
      user_color: event.userColor,
      child_profile_id: event.childProfileId ?? null,
      reminder_type: event.reminder?.type ?? null,
      reminder_timing: event.reminder?.timing ?? null,
      recurrence_type: event.recurrenceType ?? null,
      recurrence_interval: event.recurrenceInterval ?? 1,
      recurrence_end_date: event.recurrenceEndDate ?? null,
      calendar_group_id: event.calendarGroupId ?? activeGroupId ?? null,
    }).select().single();

    if (error) throw error;
    if (data) {
      setEvents(prev => [...prev, mapRow(data)]);
    }
    return data;
  }, [user, isAnonymous]);

  const updateEvent = useCallback(async (id: string, updates: Partial<CalendarEvent>) => {
    if (isAnonymous) {
      const updated = updateLocalEvent(id, updates);
      if (updated) {
        setEvents(prev => prev.map(e => e.id === id ? updated : e));
      }
      return;
    }

    const mapped: any = {};
    if (updates.title !== undefined) mapped.title = updates.title;
    if (updates.description !== undefined) mapped.description = updates.description ?? null;
    if (updates.startDate !== undefined) mapped.start_date = updates.startDate;
    if (updates.endDate !== undefined) mapped.end_date = updates.endDate;
    if (updates.startTime !== undefined) mapped.start_time = updates.startTime;
    if (updates.endTime !== undefined) mapped.end_time = updates.endTime;
    if (updates.visibility !== undefined) mapped.visibility = updates.visibility;
    if (updates.userColor !== undefined) mapped.user_color = updates.userColor;
    if (updates.childProfileId !== undefined) mapped.child_profile_id = updates.childProfileId ?? null;
    if (updates.userId !== undefined) mapped.user_id = updates.userId;
    if (updates.recurrenceType !== undefined) mapped.recurrence_type = updates.recurrenceType ?? null;
    if (updates.recurrenceInterval !== undefined) mapped.recurrence_interval = updates.recurrenceInterval;
    if (updates.recurrenceEndDate !== undefined) mapped.recurrence_end_date = updates.recurrenceEndDate ?? null;
    if (updates.calendarGroupId !== undefined) mapped.calendar_group_id = updates.calendarGroupId ?? null;

    const { data } = await supabase.from('events').update(mapped).eq('id', id).select().single();
    if (data) {
      setEvents(prev => prev.map(e => e.id === id ? mapRow(data) : e));
    }
  }, [isAnonymous]);

  const deleteEvent = useCallback(async (id: string) => {
    if (isAnonymous) {
      deleteLocalEvent(id);
      setEvents(prev => prev.filter(e => e.id !== id));
      return;
    }

    await supabase.from('events').delete().eq('id', id);
    setEvents(prev => prev.filter(e => e.id !== id));
  }, [isAnonymous]);

  const getEventsForDate = useCallback((date: string) => {
    const expanded = expandRecurringEvents(events, date, date);
    return expanded;
  }, [events]);

  const getEventsForMonth = useCallback((year: number, month: number) => {
    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return expandRecurringEvents(events, start, end);
  }, [events]);

  const hasEventsOnDate = useCallback((date: string) => {
    return expandRecurringEvents(events, date, date).length > 0;
  }, [events]);

  // Force refresh from localStorage (used after migration)
  const refreshFromLocal = useCallback(() => {
    setEvents(getLocalEvents());
  }, []);

  const refresh = useCallback(async () => {
    if (isAnonymous) {
      setEvents(getLocalEvents());
    } else {
      let query = supabase.from('events').select('*');
      if (activeGroupId) {
        query = query.eq('calendar_group_id', activeGroupId);
      }
      const { data, error } = await query;
      if (!error && data) {
        setEvents(data.map(mapRow));
      }
    }
  }, [isAnonymous, activeGroupId]);

  return { events, loading, addEvent, updateEvent, deleteEvent, getEventsForDate, getEventsForMonth, hasEventsOnDate, refreshFromLocal, refresh };
}
