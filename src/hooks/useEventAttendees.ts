import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface EventAttendee {
  id: string;
  eventId: string;
  userId: string;
  status: string;
}

export function useEventAttendees() {
  const [attendeesByEvent, setAttendeesByEvent] = useState<Record<string, EventAttendee[]>>({});

  const fetchAttendees = useCallback(async (eventId: string) => {
    const { data } = await supabase
      .from('event_attendees')
      .select('*')
      .eq('event_id', eventId);
    if (data) {
      const mapped = data.map((a: any) => ({
        id: a.id,
        eventId: a.event_id,
        userId: a.user_id,
        status: a.status,
      }));
      setAttendeesByEvent(prev => ({ ...prev, [eventId]: mapped }));
      return mapped;
    }
    return [];
  }, []);

  const fetchAllAttendees = useCallback(async (eventIds: string[]) => {
    if (eventIds.length === 0) return;
    const { data } = await supabase
      .from('event_attendees')
      .select('*')
      .in('event_id', eventIds);
    if (data) {
      const grouped: Record<string, EventAttendee[]> = {};
      data.forEach((a: any) => {
        const mapped = { id: a.id, eventId: a.event_id, userId: a.user_id, status: a.status };
        if (!grouped[a.event_id]) grouped[a.event_id] = [];
        grouped[a.event_id].push(mapped);
      });
      setAttendeesByEvent(prev => ({ ...prev, ...grouped }));
    }
  }, []);

  const addAttendee = useCallback(async (eventId: string, userId: string) => {
    const { data, error } = await supabase
      .from('event_attendees')
      .insert({ event_id: eventId, user_id: userId })
      .select()
      .single();
    if (error) throw error;
    if (data) {
      const mapped = { id: data.id, eventId: data.event_id, userId: data.user_id, status: data.status };
      setAttendeesByEvent(prev => ({
        ...prev,
        [eventId]: [...(prev[eventId] || []), mapped],
      }));
    }
  }, []);

  const removeAttendee = useCallback(async (eventId: string, attendeeId: string) => {
    await supabase.from('event_attendees').delete().eq('id', attendeeId);
    setAttendeesByEvent(prev => ({
      ...prev,
      [eventId]: (prev[eventId] || []).filter(a => a.id !== attendeeId),
    }));
  }, []);

  const getAttendees = useCallback((eventId: string) => {
    return attendeesByEvent[eventId] || [];
  }, [attendeesByEvent]);

  return { attendeesByEvent, fetchAttendees, fetchAllAttendees, addAttendee, removeAttendee, getAttendees };
}
