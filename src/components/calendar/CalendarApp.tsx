import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { expandRecurringEvents } from '@/lib/recurrence';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useNavigate } from 'react-router-dom';
import { MonthView } from './MonthView';
import { YearView } from './YearView';
import { DayView } from './DayView';
import { TodayView } from './TodayView';
import { EventDialog } from './EventDialog';
import { MemberSettings } from './MemberSettings';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { useCalendarGroups } from '@/hooks/useCalendarGroups';
import { useProfiles } from '@/hooks/useProfiles';
import { useEventAttendees } from '@/hooks/useEventAttendees';
import { useNicknames } from '@/hooks/useNicknames';
import { useChildProfiles } from '@/hooks/useChildProfiles';
import { useAuth } from '@/hooks/useAuth';
import type { CalendarView, CalendarEvent } from '@/types/calendar';
import { USER_COLORS } from '@/types/calendar';
import { ChevronLeft, ChevronRight, Plus, LogOut, LogIn, Menu } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ProfileData } from '@/hooks/useProfiles';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export function CalendarApp() {
  const today = new Date();
  type AppView = CalendarView | 'today';
  const [view, setView] = useState<AppView>('month');
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDate, setDialogDate] = useState('');
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  

  const { user, signOut, migrationResult } = useAuth();
  const navigate = useNavigate();
  const isAnonymous = !user;

  // Invited users must sign in — redirect if not authenticated
  useEffect(() => {
    if (isAnonymous && localStorage.getItem('invited_user') === 'true') {
      navigate('/auth?invite=true', { replace: true });
    }
  }, [isAnonymous, navigate]);
  const migrationToastShown = useRef(false);
  const { toast } = useToast();
  const {
    groups, activeGroupId, switchGroup, createGroup, addMemberToGroup,
    removeMemberFromGroup, updateGroupName, deleteGroup, getGroupMembers, isAdmin,
  } = useCalendarGroups();
  const { events, addEvent, updateEvent, deleteEvent, getEventsForDate, getEventsForMonth, refresh } = useCalendarEvents(activeGroupId);
  const { profiles, profileList, getDisplayName, updateDisplayName, updatePreferredColor } = useProfiles();
  const { fetchAttendees, fetchAllAttendees, addAttendee, removeAttendee, getAttendees } = useEventAttendees();
  const { nicknames, setNickname, getDisplayName: getNicknameDisplayName } = useNicknames();
  const { childProfiles, addChildProfile, updateChildProfile, deleteChildProfile, getChildProfileName } = useChildProfiles();
  const [menuOpen, setMenuOpen] = useState(false);

  // Merge nicknames into profiles map for display throughout the app
  const mergedProfiles = useMemo(() => {
    const merged = { ...profiles };
    for (const [uid, nick] of Object.entries(nicknames)) {
      if (merged[uid]) merged[uid] = nick;
    }
    return merged;
  }, [profiles, nicknames]);

  const mergedGetDisplayName = useCallback((userId: string) => {
    return nicknames[userId] || profiles[userId] || 'Unknown';
  }, [profiles, nicknames]);

  const handlePullRefresh = useCallback(async () => {
    // Refresh calendar data
    await refresh();

    // Check for app updates by fetching fresh index.html
    try {
      const res = await fetch('/', { cache: 'no-store' });
      const html = await res.text();
      // Look for a different set of script/asset hashes
      const currentScripts = Array.from(document.querySelectorAll('script[src]'))
        .map(s => s.getAttribute('src'))
        .join(',');
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const newScripts = Array.from(doc.querySelectorAll('script[src]'))
        .map(s => s.getAttribute('src'))
        .join(',');

      if (newScripts && currentScripts !== newScripts) {
        toast({
          title: 'Update available',
          description: 'A new version is available. Tap to update.',
          action: (
            <button
              onClick={() => window.location.reload()}
              className="text-sm font-medium text-blueprint hover:underline"
            >
              Update now
            </button>
          ),
          duration: 15000,
        });
      }
    } catch {
      // Silently ignore version check failures
    }
  }, [refresh, toast]);

  const { containerRef, pullDistance, refreshing } = usePullToRefresh({
    onRefresh: handlePullRefresh,
  });

  // Show migration toast when data is migrated (works for OAuth redirects too)
  useEffect(() => {
    if (migrationResult && !migrationToastShown.current) {
      migrationToastShown.current = true;
      toast({
        title: 'Data migrated',
        description: `${migrationResult.events} event(s) and ${migrationResult.profiles} profile(s) synced to your account.`,
      });
    }
  }, [migrationResult, toast]);


  useEffect(() => {
    if (!isAnonymous && events.length > 0) {
      fetchAllAttendees(events.map(e => e.id));
    }
  }, [events, fetchAllAttendees, isAnonymous]);

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

  type AppViewBtn = { value: AppView; label: string };
  const viewButtons: AppViewBtn[] = [
    { value: 'today', label: 'Today' },
    { value: 'day', label: 'Day' },
    { value: 'month', label: 'Month' },
    { value: 'year', label: 'Year' },
  ];

  const currentUserProfile = profileList.find(p => p.userId === user?.id);

  return (
    <div ref={containerRef} className="min-h-dvh light-table-glow text-foreground antialiased selection:bg-blueprint/10">
      {/* Pull to refresh indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-200 ease-out"
        style={{ height: pullDistance > 0 ? `${pullDistance}px` : '0px' }}
      >
        <div className={`flex items-center gap-2 text-muted-foreground text-sm ${refreshing ? 'animate-pulse' : ''}`}>
          <svg
            className={`w-5 h-5 transition-transform duration-200 ${refreshing ? 'animate-spin' : ''}`}
            style={{ transform: refreshing ? undefined : `rotate(${Math.min(pullDistance / 80 * 180, 180)}deg)` }}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            <polyline points="21 3 21 9 15 9" />
          </svg>
          <span>{refreshing ? 'Refreshing…' : pullDistance >= 80 ? 'Release to refresh' : 'Pull to refresh'}</span>
        </div>
      </div>

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

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 sm:py-8 flex flex-col gap-4 sm:gap-8">
        {/* Navigation */}
        <nav className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 border-b border-foreground/5 pb-4 sm:pb-6">
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] tracking-[0.2em] uppercase font-medium text-muted-foreground">
              {isAnonymous ? 'Personal Calendar' : (groups.find(g => g.id === activeGroupId)?.name || 'Shared Calendar')}
            </span>
            <div className="flex items-center gap-2">
              {view === 'month' && (
                <button
                  onClick={() => navigateMonth(-1)}
                  className="size-9 rounded-full border border-foreground/10 flex items-center justify-center hover:bg-background transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              <h1 className="text-2xl sm:text-4xl font-serif font-light italic tracking-tight truncate">
                {view === 'year'
                  ? currentYear
                  : view === 'today'
                  ? 'Today'
                  : view === 'day' && selectedDate
                  ? new Date(selectedDate + 'T00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
                  : `${MONTH_NAMES[currentMonth]} ${currentYear}`}
              </h1>
              {view === 'month' && (
                <button
                  onClick={() => navigateMonth(1)}
                  className="size-9 rounded-full border border-foreground/10 flex items-center justify-center hover:bg-background transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-3 sm:gap-4 items-center flex-wrap">
            {/* Hamburger Menu */}
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <button
                  className={`flex items-center ${user ? 'gap-1.5 pl-2 pr-1 py-1' : 'justify-center size-9'} rounded-full border border-foreground/10 hover:bg-background transition-all`}
                  title="Member Settings"
                >
                  <Menu className={user ? "w-4 h-4" : "w-5 h-5"} />
                  {user && (
                    <span
                      className="flex items-center justify-center size-7 rounded-full text-white text-xs font-bold shrink-0"
                      style={{ backgroundColor: currentUserProfile ? USER_COLORS[currentUserProfile.preferredColor] : USER_COLORS[0] }}
                    >
                      {(currentUserProfile?.displayName || user?.email || '?')[0].toUpperCase()}
                    </span>
                  )}
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[320px] sm:w-[380px] overflow-y-auto">
                <div className="pt-6 pb-8 px-1">
                  <MemberSettings
                    profileList={profileList}
                    currentUserProfile={currentUserProfile}
                    nicknames={nicknames}
                    onUpdateDisplayName={updateDisplayName}
                    onUpdateColor={updatePreferredColor}
                    onSetNickname={setNickname}
                    childProfiles={childProfiles}
                    onAddChild={addChildProfile}
                    onUpdateChild={updateChildProfile}
                    onDeleteChild={deleteChildProfile}
                    isAnonymous={isAnonymous}
                    onNavigateAuth={() => { setMenuOpen(false); navigate('/auth'); }}
                    groups={groups}
                    activeGroupId={activeGroupId}
                    onSwitchGroup={switchGroup}
                    onCreateGroup={createGroup}
                    onUpdateGroupName={updateGroupName}
                    onDeleteGroup={deleteGroup}
                    onAddMemberToGroup={addMemberToGroup}
                    onRemoveMemberFromGroup={removeMemberFromGroup}
                    getGroupMembers={getGroupMembers}
                    isGroupAdmin={isAdmin}
                  />

                  {/* Auth actions at bottom */}
                  <div className="mt-8 pt-4 border-t border-foreground/5">
                    {isAnonymous ? (
                      <button
                        onClick={() => { setMenuOpen(false); navigate('/auth'); }}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-foreground/5 transition-colors text-left text-sm"
                      >
                        <LogIn className="w-5 h-5 text-muted-foreground" />
                        <span>Sign In / Sign Up</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => { setMenuOpen(false); signOut(); }}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-foreground/5 transition-colors text-left text-sm text-muted-foreground"
                      >
                        <LogOut className="w-5 h-5" />
                        <span>Sign out</span>
                      </button>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>

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
                  className={`px-3 sm:px-5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${
                    view === btn.value
                      ? 'bg-background shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

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

        {view === 'today' && (() => {
          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          return (
            <TodayView
              date={todayStr}
              events={getEventsForDate(todayStr)}
              onEventClick={(event) => {
                setEditingEvent(event);
                setDialogDate(event.startDate);
                setDialogOpen(true);
              }}
              getDisplayName={mergedGetDisplayName}
              getChildProfileName={getChildProfileName}
              getAttendees={getAttendees}
              profileList={profileList}
            />
          );
        })()}

        {view === 'month' && (
          <MonthView
            year={currentYear}
            month={currentMonth}
            events={getEventsForMonth(currentYear, currentMonth)}
            onDateClick={handleDateClick}
            onDayView={handleDayView}
            onEventClick={(event) => {
              setEditingEvent(event);
              setDialogDate(event.startDate);
              setDialogOpen(true);
            }}
            onSwipeMonth={navigateMonth}
            getDisplayName={mergedGetDisplayName}
            getChildProfileName={getChildProfileName}
            profileList={profileList}
            getAttendees={getAttendees}
          />
        )}

        {view === 'year' && (
          <YearView
            year={currentYear}
            events={expandedYearEvents}
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
            getDisplayName={mergedGetDisplayName}
            getChildProfileName={getChildProfileName}
            getAttendees={getAttendees}
            profileList={profileList}
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
          className="fixed bottom-6 right-4 sm:bottom-8 sm:right-8 size-12 sm:size-14 rounded-full bg-foreground text-background shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-50"
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
        profiles={mergedProfiles}
        profileList={profileList}
        attendees={editingEvent ? getAttendees(editingEvent.id) : []}
        onAddAttendee={isAnonymous ? undefined : addAttendee}
        onRemoveAttendee={isAnonymous ? undefined : removeAttendee}
        childProfiles={childProfiles}
        isAnonymous={isAnonymous}
        onPromptSignup={() => navigate('/auth')}
        groups={groups}
        activeGroupId={activeGroupId}
      />
    </div>
  );
}
