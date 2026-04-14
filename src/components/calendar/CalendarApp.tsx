import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useNavigate } from 'react-router-dom';
import { MonthView } from './MonthView';
import { YearView } from './YearView';
import { DayView } from './DayView';
import { TodayView } from './TodayView';
import { EventDialog } from './EventDialog';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { useProfiles } from '@/hooks/useProfiles';
import { useEventAttendees } from '@/hooks/useEventAttendees';
import { useNicknames } from '@/hooks/useNicknames';
import { useChildProfiles } from '@/hooks/useChildProfiles';
import { useAuth } from '@/hooks/useAuth';
import type { CalendarView, CalendarEvent } from '@/types/calendar';
// Extend CalendarView to include 'today'
type AppView = CalendarView | 'today';
import { USER_COLORS } from '@/types/calendar';
import { ChevronLeft, ChevronRight, Plus, LogOut, Baby, UserPlus, LogIn, Share2 } from 'lucide-react';
import { ChildProfileManager } from './ChildProfileManager';
import { useToast } from '@/hooks/use-toast';
import UserProfileDialog from './UserProfileDialog';
import type { ProfileData } from '@/hooks/useProfiles';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export function CalendarApp() {
  const today = new Date();
  const [view, setView] = useState<AppView>('month');
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDate, setDialogDate] = useState('');
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<ProfileData | null>(null);

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
  const { events, addEvent, updateEvent, deleteEvent, getEventsForDate, refresh } = useCalendarEvents();
  const { profiles, profileList, getDisplayName, updateDisplayName, updatePreferredColor } = useProfiles();
  const { fetchAttendees, fetchAllAttendees, addAttendee, removeAttendee, getAttendees } = useEventAttendees();
  const { nicknames, setNickname, getDisplayName: getNicknameDisplayName } = useNicknames();
  const { childProfiles, addChildProfile, updateChildProfile, deleteChildProfile, getChildProfileName } = useChildProfiles();
  const [showChildManager, setShowChildManager] = useState(false);

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

  const viewButtons: { value: AppView; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'day', label: 'Day' },
    { value: 'month', label: 'Month' },
    { value: 'year', label: 'Year' },
  ];

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
              {isAnonymous ? 'Personal Calendar' : 'Shared Calendar'}
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

          <div className="flex gap-3 sm:gap-6 items-center flex-wrap">
            {/* Child Profiles */}
            <button
              onClick={() => setShowChildManager(!showChildManager)}
              className={`flex items-center gap-2 min-h-[44px] min-w-[44px] px-3 py-2 text-sm rounded-lg transition-colors ${showChildManager ? 'text-foreground bg-foreground/10' : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'}`}
              title="Manage child profiles"
            >
              <Baby className="w-5 h-5" />
              <span className="hidden sm:inline">Family</span>
            </button>

            {/* Auth actions */}
            {isAnonymous ? (() => {
              const hasLoggedInBefore = localStorage.getItem('has_logged_in_before') === 'true';
              return (
                <button
                  onClick={() => navigate('/auth')}
                  className="flex items-center gap-2 min-h-[44px] min-w-[44px] px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-lg transition-colors"
                  title={hasLoggedInBefore ? 'Sign in to your account' : 'Create account to share with others'}
                >
                  {hasLoggedInBefore ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                  <span className="hidden sm:inline">{hasLoggedInBefore ? 'Sign In' : 'Sign Up'}</span>
                </button>
              );
            })() : (
              <>
                <button
                  onClick={() => {
                    const inviteUrl = `https://time-together-share.lovable.app/auth?invite=true`;
                    navigator.clipboard.writeText(inviteUrl).then(() => {
                      toast({
                        title: 'Invite link copied!',
                        description: 'Share this link with others so they can join your calendar.',
                      });
                    });
                  }}
                  className="flex items-center gap-2 min-h-[44px] min-w-[44px] px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-lg transition-colors"
                  title="Invite people to join calendar"
                >
                  <Share2 className="w-5 h-5" />
                  <span className="hidden sm:inline">Invite</span>
                </button>
                <button
                  onClick={signOut}
                  className="flex items-center gap-2 min-h-[44px] min-w-[44px] px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-lg transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </>
            )}

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
        {/* Members */}
        {!isAnonymous && profileList.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {profileList.map((p) => {
                const displayName = getNicknameDisplayName(p.userId, p.displayName);
                return (
                  <button
                    key={p.userId}
                    onClick={() => setSelectedProfile(p)}
                    className="size-8 rounded-full border-2 border-background flex items-center justify-center text-[11px] font-semibold text-white shrink-0 cursor-pointer hover:scale-110 transition-transform"
                    style={{ backgroundColor: USER_COLORS[p.preferredColor % USER_COLORS.length] }}
                    title={displayName}
                  >
                    {displayName[0]?.toUpperCase() || '?'}
                  </button>
                );
              })}
            </div>
            <span className="text-xs text-muted-foreground">
              {profileList.length} {profileList.length === 1 ? 'member' : 'members'}
            </span>
          </div>
        )}


        {showChildManager && (
          <div className="vellum-layer rounded-xl border border-foreground/5 p-4 sm:p-6 shadow-lg">
            <ChildProfileManager
              childProfiles={childProfiles}
              onAdd={addChildProfile}
              onUpdate={updateChildProfile}
              onDelete={deleteChildProfile}
              onClose={() => setShowChildManager(false)}
            />
          </div>
        )}

        {/* Views */}
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
            events={events}
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
            getDisplayName={mergedGetDisplayName}
            getChildProfileName={getChildProfileName}
            getAttendees={getAttendees}
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
      />
      <UserProfileDialog
        profile={selectedProfile}
        open={!!selectedProfile}
        onOpenChange={(open) => { if (!open) setSelectedProfile(null); }}
        nickname={selectedProfile ? nicknames[selectedProfile.userId] : undefined}
        onSetNickname={setNickname}
        onUpdateDisplayName={updateDisplayName}
        onUpdateColor={updatePreferredColor}
      />
    </div>
  );
}
