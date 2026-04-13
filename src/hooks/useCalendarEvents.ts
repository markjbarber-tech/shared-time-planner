import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { CalendarEvent } from '@/types/calendar';

export function useCalendarEvents() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch events from Supabase
  useEffect(() => {
    if (!user) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*');
      
      if (!error && data) {
        setEvents(data.map(e => ({
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
          reminder: e.reminder_type && e.reminder_timing
            ? { type: e.reminder_type as 'email' | 'push', timing: e.reminder_timing as '1hour' | '1day' | '1week' }
            : undefined,
          createdAt: e.created_at,
        })));
      }
      setLoading(false);
    };

    fetchEvents();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('events-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        fetchEvents();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const addEvent = useCallback(async (event: Omit<CalendarEvent, 'id' | 'createdAt'>) => {
    if (!user) return null;
    const { data, error } = await supabase.from('events').insert({
      title: event.title,
      description: event.description ?? null,
      start_date: event.startDate,
      end_date: event.endDate,
      start_time: event.startTime,
      end_time: event.endTime,
      visibility: event.visibility,
      user_id: user.id,
      user_color: event.userColor,
      reminder_type: event.reminder?.type ?? null,
      reminder_timing: event.reminder?.timing ?? null,
    }).select().single();
    
    if (error) throw error;
    return data;
  }, [user]);

  const updateEvent = useCallback(async (id: string, updates: Partial<CalendarEvent>) => {
    const mapped: {
      title?: string; description?: string | null; start_date?: string; end_date?: string;
      start_time?: string; end_time?: string; visibility?: string; user_color?: number;
    } = {};
    if (updates.title !== undefined) mapped.title = updates.title;
    if (updates.description !== undefined) mapped.description = updates.description ?? null;
    if (updates.startDate !== undefined) mapped.start_date = updates.startDate;
    if (updates.endDate !== undefined) mapped.end_date = updates.endDate;
    if (updates.startTime !== undefined) mapped.start_time = updates.startTime;
    if (updates.endTime !== undefined) mapped.end_time = updates.endTime;
    if (updates.visibility !== undefined) mapped.visibility = updates.visibility;
    if (updates.userColor !== undefined) mapped.user_color = updates.userColor;
    
    await supabase.from('events').update(mapped).eq('id', id);
  }, []);

  const deleteEvent = useCallback(async (id: string) => {
    await supabase.from('events').delete().eq('id', id);
  }, []);

  const getEventsForDate = useCallback((date: string) => {
    return events.filter(e => date >= e.startDate && date <= e.endDate);
  }, [events]);

  const getEventsForMonth = useCallback((year: number, month: number) => {
    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return events.filter(e => e.startDate <= end && e.endDate >= start);
  }, [events]);

  const hasEventsOnDate = useCallback((date: string) => {
    return events.some(e => date >= e.startDate && date <= e.endDate);
  }, [events]);

  return { events, loading, addEvent, updateEvent, deleteEvent, getEventsForDate, getEventsForMonth, hasEventsOnDate };
}
