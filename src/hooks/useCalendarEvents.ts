import { useState, useEffect, useCallback } from 'react';
import type { CalendarEvent } from '@/types/calendar';

const STORAGE_KEY = 'calendar-events';

export function useCalendarEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }, [events]);

  const addEvent = useCallback((event: Omit<CalendarEvent, 'id' | 'createdAt'>) => {
    const newEvent: CalendarEvent = {
      ...event,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setEvents(prev => [...prev, newEvent]);
    return newEvent;
  }, []);

  const updateEvent = useCallback((id: string, updates: Partial<CalendarEvent>) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  }, []);

  const deleteEvent = useCallback((id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  const getEventsForDate = useCallback((date: string) => {
    return events.filter(e => {
      return date >= e.startDate && date <= e.endDate;
    });
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

  return { events, addEvent, updateEvent, deleteEvent, getEventsForDate, getEventsForMonth, hasEventsOnDate };
}
