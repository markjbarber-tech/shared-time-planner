import { useState, useCallback } from 'react';
import { MonthView } from './MonthView';
import { YearView } from './YearView';
import { DayView } from './DayView';
import { EventDialog } from './EventDialog';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { useAuth } from '@/hooks/useAuth';
import type { CalendarView, CalendarEvent } from '@/types/calendar';
import { ChevronLeft, ChevronRight, Plus, LogOut } from 'lucide-react';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export function CalendarApp() {
  const today = new Date();
  const [view, setView] = useState<CalendarView>('month');
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDate, setDialogDate] = useState('');
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const { user, signOut } = useAuth();
  const { events, addEvent, updateEvent, deleteEvent, getEventsForDate } = useCalendarEvents();

  const navigateMonth = (delta: number) => {
    let m = currentMonth + delta;
    let y = currentYear;
    if (m > 11) { m = 0; y++; }
    if (m < 0) { m = 11; y--; }
    setCurrentMonth(m);
    setCurrentYear(y);
  };

  const handleDateClick = useCallback((date: string) => {
    setEditingEvent(null);
    setDialogDate(date);
    setDialogOpen(true);
  }, []);

  const handleDayView = useCallback((date: string) => {
    setSelectedDate(date);
    setView('day');
  }, []);

  const handleMonthClick = useCallback((month: number) => {
    setCurrentMonth(month);
    setView('month');
  }, []);

  const handleBackToMonth = useCallback(() => {
    setView('month');
  }, []);

  const viewButtons: { value: CalendarView; label: string }[] = [
    { value: 'day', label: 'Day' },
    { value: 'month', label: 'Month' },
    { value: 'year', label: 'Year' },
  ];

  return (
    <div className="min-h-dvh light-table-glow text-foreground antialiased selection:bg-blueprint/10">
      {/* Subtle dot texture */}
      <div className="fixed inset-0 pointer-events-none -z-20 opacity-15">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(0,0,0,0.04) 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8 flex flex-col gap-8">
        {/* Navigation */}
        <nav className="flex justify-between items-end border-b border-foreground/5 pb-6">
          <div className="space-y-1">
            <span className="text-[10px] tracking-[0.2em] uppercase font-medium text-muted-foreground">
              Shared Calendar
            </span>
            <h1 className="text-4xl font-serif font-light italic tracking-tight">
              {view === 'year'
                ? currentYear
                : view === 'day' && selectedDate
                ? new Date(selectedDate + 'T00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
                : `${MONTH_NAMES[currentMonth]} ${currentYear}`}
            </h1>
          </div>

          <div className="flex gap-6 items-center">
            {/* Sign Out */}
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
            {/* View Switcher */}
            <div className="flex bg-foreground/5 p-1 rounded-full">
              {viewButtons.map(btn => (
                <button
                  key={btn.value}
                  onClick={() => {
                    if (btn.value === 'day' && !selectedDate) {
                      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                      setSelectedDate(todayStr);
                    }
                    setView(btn.value);
                  }}
                  className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all ${
                    view === btn.value
                      ? 'bg-background shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Nav arrows (month view) */}
            {view === 'month' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateMonth(-1)}
                  className="size-9 rounded-full border border-foreground/10 flex items-center justify-center hover:bg-background transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigateMonth(1)}
                  className="size-9 rounded-full border border-foreground/10 flex items-center justify-center hover:bg-background transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {view === 'year' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentYear(y => y - 1)}
                  className="size-9 rounded-full border border-foreground/10 flex items-center justify-center hover:bg-background transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentYear(y => y + 1)}
                  className="size-9 rounded-full border border-foreground/10 flex items-center justify-center hover:bg-background transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Views */}
        {view === 'month' && (
          <MonthView
            year={currentYear}
            month={currentMonth}
            events={events}
            onDateClick={handleDateClick}
            onDayView={handleDayView}
          />
        )}

        {view === 'year' && (
          <YearView
            year={currentYear}
            events={events}
            onMonthClick={handleMonthClick}
          />
        )}

        {view === 'day' && selectedDate && (
          <DayView
            date={selectedDate}
            events={getEventsForDate(selectedDate)}
            onBack={handleBackToMonth}
            onEditEvent={(event) => {
              setEditingEvent(event);
              setDialogDate(event.startDate);
              setDialogOpen(true);
            }}
            onDeleteEvent={deleteEvent}
          />
        )}
      </div>

      {/* FAB - Add Event */}
      {view !== 'day' && (
        <button
          onClick={() => {
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            setEditingEvent(null);
            setDialogDate(todayStr);
            setDialogOpen(true);
          }}
          className="fixed bottom-8 right-8 size-14 rounded-full bg-foreground text-background shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-50"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Event Dialog */}
      <EventDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingEvent(null); }}
        onSave={addEvent}
        onUpdate={(id, data) => updateEvent(id, data)}
        onDelete={deleteEvent}
        initialDate={dialogDate}
        editingEvent={editingEvent}
      />
    </div>
  );
}
