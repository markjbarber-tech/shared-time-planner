import { useState, useMemo, useEffect } from 'react';
import type { ProfileData } from '@/hooks/useProfiles';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DialPicker } from './DialPicker';
import { useAuth } from '@/hooks/useAuth';
import type { CalendarEvent, EventVisibility, ReminderType, ReminderTiming, ChildProfile } from '@/types/calendar';
import { USER_COLORS } from '@/types/calendar';
import { Eye, EyeOff, Users, Bell, X, UserPlus, Baby, Pencil, Clock, Calendar, MapPin, Link, Check } from 'lucide-react';
import type { EventAttendee } from '@/hooks/useEventAttendees';
import { useToast } from '@/hooks/use-toast';

interface EventDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (event: Omit<CalendarEvent, 'id' | 'createdAt'>) => Promise<any>;
  onUpdate?: (id: string, event: Omit<CalendarEvent, 'id' | 'createdAt'>) => void;
  onDelete?: (id: string) => void;
  initialDate: string;
  editingEvent?: CalendarEvent | null;
  profiles: Record<string, string>;
  profileList: ProfileData[];
  attendees: EventAttendee[];
  onAddAttendee?: (eventId: string, userId: string) => Promise<void>;
  onRemoveAttendee?: (eventId: string, attendeeId: string) => Promise<void>;
  childProfiles: ChildProfile[];
  isAnonymous?: boolean;
  onPromptSignup?: () => void;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const HOURS_12 = Array.from({ length: 12 }, (_, i) => String(i === 0 ? 12 : i));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

function to12h(h24: string): { hour12: string; period: 'AM' | 'PM' } {
  const h = parseInt(h24);
  const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? '12' : h > 12 ? String(h - 12) : String(h);
  return { hour12, period };
}

function to24h(hour12: string, period: 'AM' | 'PM'): string {
  let h = parseInt(hour12);
  if (period === 'AM') h = h === 12 ? 0 : h;
  else h = h === 12 ? 12 : h + 12;
  return String(h).padStart(2, '0');
}

function format12h(h24: string, min: string): string {
  const { hour12, period } = to12h(h24);
  return `${hour12}:${min} ${period}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function generateDays(year: number, month: number) {
  const count = getDaysInMonth(year, month);
  return Array.from({ length: count }, (_, i) => String(i + 1).padStart(2, '0'));
}

function generateYears() {
  const current = new Date().getFullYear();
  return Array.from({ length: 10 }, (_, i) => String(current - 2 + i));
}

export function EventDialog({ open, onClose, onSave, onUpdate, onDelete, initialDate, editingEvent, profiles, attendees, onAddAttendee, onRemoveAttendee, childProfiles, isAnonymous, onPromptSignup }: EventDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);
  const now = new Date();
  const [year, month, day] = initialDate.split('-');
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startYear, setStartYear] = useState(year);
  const [startMonth, setStartMonth] = useState(String(parseInt(month) - 1));
  const [startDay, setStartDay] = useState(day);
  const [endYear, setEndYear] = useState(year);
  const [endMonth, setEndMonth] = useState(String(parseInt(month) - 1));
  const [endDay, setEndDay] = useState(day);
  const [startHour, setStartHour] = useState(String(now.getHours()).padStart(2, '0'));
  const [startMinute, setStartMinute] = useState(String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, '0'));
  const endHourDefault = String((now.getHours() + 1) % 24).padStart(2, '0');
  const [endHour, setEndHour] = useState(endHourDefault);
  const [endMinute, setEndMinute] = useState(String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, '0'));
  const [visibility, setVisibility] = useState<EventVisibility>('public');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderType, setReminderType] = useState<ReminderType>('push');
  const [reminderTiming, setReminderTiming] = useState<ReminderTiming>('1hour');
  const [pendingAttendees, setPendingAttendees] = useState<string[]>([]);
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [showAttendeePicker, setShowAttendeePicker] = useState(false);
  const [selectedChildProfileId, setSelectedChildProfileId] = useState<string | null>(null);
  const [endTimeManuallySet, setEndTimeManuallySet] = useState(false);
  const [viewMode, setViewMode] = useState(true); // true = read-only detail view for existing events
  const [editingStartDate, setEditingStartDate] = useState(false);
  const [editingStartTime, setEditingStartTime] = useState(false);
  const [editingEndDate, setEditingEndDate] = useState(false);
  const [editingEndTime, setEditingEndTime] = useState(false);

  const isEditing = !!editingEvent;

  // Pre-fill when editing
  useEffect(() => {
    if (editingEvent && open) {
      setTitle(editingEvent.title);
      setDescription(editingEvent.description ?? '');
      const [sy, sm, sd] = editingEvent.startDate.split('-');
      const [ey, em, ed] = editingEvent.endDate.split('-');
      setStartYear(sy); setStartMonth(String(parseInt(sm) - 1)); setStartDay(sd);
      setEndYear(ey); setEndMonth(String(parseInt(em) - 1)); setEndDay(ed);
      const [sh, smin] = editingEvent.startTime.split(':');
      const [eh, emin] = editingEvent.endTime.split(':');
      setStartHour(sh); setStartMinute(smin);
      setEndHour(eh); setEndMinute(emin);
      setVisibility(editingEvent.visibility);
      setReminderEnabled(!!editingEvent.reminder);
      if (editingEvent.reminder) {
        setReminderType(editingEvent.reminder.type);
        setReminderTiming(editingEvent.reminder.timing);
      }
      setPendingAttendees([]);
      setSelectedChildProfileId(editingEvent.childProfileId ?? null);
      setEndTimeManuallySet(true);
      setViewMode(true); // start in detail view when opening existing event
      setEditingStartDate(false); setEditingStartTime(false);
      setEditingEndDate(false); setEditingEndTime(false);
    } else if (!editingEvent && open) {
      const [y, m, d] = initialDate.split('-');
      setTitle(''); setDescription('');
      setStartYear(y); setStartMonth(String(parseInt(m) - 1)); setStartDay(d);
      setEndYear(y); setEndMonth(String(parseInt(m) - 1)); setEndDay(d);
      setStartHour(String(now.getHours()).padStart(2, '0'));
      setStartMinute(String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, '0'));
      setEndHour(String((now.getHours() + 1) % 24).padStart(2, '0'));
      setEndMinute(String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, '0'));
      setVisibility('public');
      setReminderEnabled(false);
      setPendingAttendees([]);
      setSelectedChildProfileId(null);
      setEndTimeManuallySet(false);
      setViewMode(false); // new events go straight to edit mode
      setEditingStartDate(false); setEditingStartTime(false);
      setEditingEndDate(false); setEditingEndTime(false);
    }
    setAttendeeSearch('');
    setShowAttendeePicker(false);
  }, [editingEvent, open, initialDate]);

  const years = useMemo(() => generateYears(), []);
  const startDays = useMemo(() => generateDays(parseInt(startYear), parseInt(startMonth)), [startYear, startMonth]);
  const endDays = useMemo(() => generateDays(parseInt(endYear), parseInt(endMonth)), [endYear, endMonth]);

  // Auto-update end time to 1 hour after start time when start changes (new events only)
  useEffect(() => {
    if (endTimeManuallySet) return;
    const h = parseInt(startHour);
    const m = parseInt(startMinute);
    const newEndH = (h + 1) % 24;
    setEndHour(String(newEndH).padStart(2, '0'));
    setEndMinute(String(m).padStart(2, '0'));
    // If hour wraps past midnight, advance end date by 1 day
    if (newEndH < h) {
      const startDateObj = new Date(parseInt(startYear), parseInt(startMonth), parseInt(startDay));
      startDateObj.setDate(startDateObj.getDate() + 1);
      setEndYear(String(startDateObj.getFullYear()));
      setEndMonth(String(startDateObj.getMonth()));
      setEndDay(String(startDateObj.getDate()).padStart(2, '0'));
    } else {
      setEndYear(startYear);
      setEndMonth(startMonth);
      setEndDay(startDay);
    }
  }, [startHour, startMinute, startYear, startMonth, startDay, endTimeManuallySet]);

  const selectedChildProfile = childProfiles.find(cp => cp.id === selectedChildProfileId);

  const buildEventData = () => ({
    title: title.trim(),
    description: description.trim() || undefined,
    startDate: `${startYear}-${String(parseInt(startMonth) + 1).padStart(2, '0')}-${startDay}`,
    endDate: `${endYear}-${String(parseInt(endMonth) + 1).padStart(2, '0')}-${endDay}`,
    startTime: `${startHour}:${startMinute}`,
    endTime: `${endHour}:${endMinute}`,
    visibility,
    userId: user?.id ?? 'local-user',
    userColor: selectedChildProfile ? selectedChildProfile.preferredColor : (editingEvent?.userColor ?? 0),
    childProfileId: selectedChildProfileId,
    reminder: reminderEnabled ? { type: reminderType, timing: reminderTiming } : undefined,
  });

  const handleSave = async () => {
    if (!title.trim()) return;
    const data = buildEventData();
    if (isEditing && onUpdate) {
      onUpdate(editingEvent.id, data);
    } else {
      const result = await onSave(data);
      // Add pending attendees to newly created event
      if (result?.id && onAddAttendee && pendingAttendees.length > 0) {
        for (const userId of pendingAttendees) {
          await onAddAttendee(result.id, userId);
        }
      }
    }
    onClose();
  };

  const handleDelete = () => {
    if (isEditing && onDelete) {
      onDelete(editingEvent.id);
      onClose();
    }
  };

  // Attendee helpers
  const currentAttendeeUserIds = new Set(attendees.map(a => a.userId));
  const pendingSet = new Set(pendingAttendees);
  const allTaggedUserIds = new Set([...currentAttendeeUserIds, ...pendingSet]);

  const availableUsers = Object.entries(profiles).filter(([uid]) => {
    if (uid === user?.id) return false; // don't show self
    if (allTaggedUserIds.has(uid)) return false;
    if (attendeeSearch) {
      const name = profiles[uid]?.toLowerCase() || '';
      return name.includes(attendeeSearch.toLowerCase());
    }
    return true;
  });

  const handleAddExistingAttendee = async (userId: string) => {
    if (isEditing && editingEvent && onAddAttendee) {
      await onAddAttendee(editingEvent.id, userId);
    } else {
      setPendingAttendees(prev => [...prev, userId]);
    }
    setAttendeeSearch('');
    setShowAttendeePicker(false);
  };

  const handleRemoveAttendee = async (userId: string) => {
    if (isEditing && editingEvent && onRemoveAttendee) {
      const attendee = attendees.find(a => a.userId === userId);
      if (attendee) await onRemoveAttendee(editingEvent.id, attendee.id);
    } else {
      setPendingAttendees(prev => prev.filter(id => id !== userId));
    }
  };

  const visibilityOptions: { value: EventVisibility; label: string; icon: typeof Eye }[] = [
    { value: 'public', label: 'Public', icon: Eye },
    { value: 'shared', label: 'Shared', icon: Users },
    { value: 'private', label: 'Private', icon: EyeOff },
  ];

  const timingOptions: { value: ReminderTiming; label: string }[] = [
    { value: '1hour', label: '1 hour before' },
    { value: '1day', label: '1 day before' },
    { value: '1week', label: '1 week before' },
  ];

  const canEdit = !isEditing || editingEvent.userId === (user?.id ?? 'local-user');

  // Combined list of attendee user IDs to display
  const displayedAttendeeIds = isEditing
    ? attendees.map(a => a.userId)
    : pendingAttendees;

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="vellum-layer border-foreground/5 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-light italic">
            {isEditing && viewMode ? title || 'Event Details' : isEditing ? 'Edit Entry' : 'New Entry'}
          </DialogTitle>
        </DialogHeader>

        {isEditing && viewMode ? (
          /* Read-only detail view */
          <div className="space-y-5 pt-2">
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>
                  {parseInt(startDay)} {MONTHS[parseInt(startMonth)]} {startYear}
                  {(startYear !== endYear || startMonth !== endMonth || startDay !== endDay) &&
                    ` — ${parseInt(endDay)} ${MONTHS[parseInt(endMonth)]} ${endYear}`}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{format12h(startHour, startMinute)} — {format12h(endHour, endMinute)}</span>
              </div>

              {selectedChildProfile && (
                <div className="flex items-center gap-2 text-sm">
                  <Baby className="w-4 h-4 text-muted-foreground" />
                  <span>{selectedChildProfile.displayName}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm">
                {visibility === 'public' ? <Eye className="w-4 h-4 text-muted-foreground" /> :
                 visibility === 'shared' ? <Users className="w-4 h-4 text-muted-foreground" /> :
                 <EyeOff className="w-4 h-4 text-muted-foreground" />}
                <span className="capitalize">{visibility}</span>
              </div>

              {editingEvent?.reminder && (
                <div className="flex items-center gap-2 text-sm">
                  <Bell className="w-4 h-4 text-muted-foreground" />
                  <span className="capitalize">
                    {editingEvent.reminder.type} — {
                      editingEvent.reminder.timing === '1hour' ? '1 hour before' :
                      editingEvent.reminder.timing === '1day' ? '1 day before' : '1 week before'
                    }
                  </span>
                </div>
              )}

              {displayedAttendeeIds.length > 0 && (
                <div className="flex items-start gap-2 text-sm">
                  <Users className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div className="flex flex-wrap gap-1.5">
                    {displayedAttendeeIds.map(uid => (
                      <span key={uid} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-foreground/5 text-xs">
                        {profiles[uid] || 'Unknown'}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              {canEdit && (
                <Button
                  variant="outline"
                  onClick={handleDelete}
                  className="border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  Delete
                </Button>
              )}
              <Button variant="outline" onClick={onClose} className="flex-1 border-foreground/10">
                Close
              </Button>
              {canEdit && (
                <Button
                  onClick={() => setViewMode(false)}
                  className="flex-1 bg-foreground text-background hover:bg-foreground/90"
                >
                  <Pencil className="w-3.5 h-3.5 mr-1.5" />
                  Edit Event
                </Button>
              )}
            </div>
          </div>
        ) : (

        <div className="space-y-6 pt-2">
          {/* Title */}
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Title</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Event title..."
              className="border-foreground/10 bg-background/50 text-base"
              disabled={!canEdit}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Description</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional details..."
              className="border-foreground/10 bg-background/50 resize-none text-base"
              rows={2}
              disabled={!canEdit}
            />
          </div>

          {/* Date & Time Pickers */}
          <div className="grid grid-cols-2 gap-4">
            {/* Start */}
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Start</Label>
              {editingStartDate ? (
                <div className="flex gap-0.5 bg-background/50 rounded-md border border-foreground/5 p-1">
                  <DialPicker items={startDays} value={startDay} onChange={setStartDay} className="w-8" />
                  <DialPicker items={MONTHS} value={MONTHS[parseInt(startMonth)]} onChange={v => setStartMonth(String(MONTHS.indexOf(v)))} className="w-10" />
                  <DialPicker items={years} value={startYear} onChange={setStartYear} className="w-11" />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingStartDate(true)}
                  className="w-full text-left px-2.5 py-2 rounded-md border border-foreground/5 bg-background/50 text-sm hover:border-foreground/15 transition-colors"
                >
                  {parseInt(startDay)} {MONTHS[parseInt(startMonth)]} {startYear}
                </button>
              )}
              {editingStartTime ? (() => {
                const { hour12: sh12, period: sPeriod } = to12h(startHour);
                return (
                  <div className="flex gap-0.5 bg-background/50 rounded-md border border-foreground/5 p-1 items-center">
                    <DialPicker items={HOURS_12} value={sh12} onChange={v => setStartHour(to24h(v, sPeriod))} className="w-8" />
                    <span className="text-muted-foreground font-bold text-xs">:</span>
                    <DialPicker items={MINUTES} value={startMinute} onChange={setStartMinute} className="w-8" />
                    <div className="flex flex-col gap-0.5 ml-1">
                      {(['AM', 'PM'] as const).map(p => (
                        <button key={p} type="button" onClick={() => setStartHour(to24h(sh12, p))}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-semibold transition-all ${sPeriod === p ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}
                        >{p}</button>
                      ))}
                    </div>
                  </div>
                );
              })() : (
                <button
                  type="button"
                  onClick={() => setEditingStartTime(true)}
                  className="w-full text-left px-2.5 py-2 rounded-md border border-foreground/5 bg-background/50 text-sm hover:border-foreground/15 transition-colors"
                >
                  {format12h(startHour, startMinute)}
                </button>
              )}
            </div>

            {/* End */}
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">End</Label>
              {editingEndDate ? (
                <div className="flex gap-0.5 bg-background/50 rounded-md border border-foreground/5 p-1">
                  <DialPicker items={endDays} value={endDay} onChange={v => { setEndTimeManuallySet(true); setEndDay(v); }} className="w-8" />
                  <DialPicker items={MONTHS} value={MONTHS[parseInt(endMonth)]} onChange={v => { setEndTimeManuallySet(true); setEndMonth(String(MONTHS.indexOf(v))); }} className="w-10" />
                  <DialPicker items={years} value={endYear} onChange={v => { setEndTimeManuallySet(true); setEndYear(v); }} className="w-11" />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingEndDate(true)}
                  className="w-full text-left px-2.5 py-2 rounded-md border border-foreground/5 bg-background/50 text-sm hover:border-foreground/15 transition-colors"
                >
                  {parseInt(endDay)} {MONTHS[parseInt(endMonth)]} {endYear}
                </button>
              )}
              {editingEndTime ? (() => {
                const { hour12: eh12, period: ePeriod } = to12h(endHour);
                return (
                  <div className="flex gap-0.5 bg-background/50 rounded-md border border-foreground/5 p-1 items-center">
                    <DialPicker items={HOURS_12} value={eh12} onChange={v => { setEndTimeManuallySet(true); setEndHour(to24h(v, ePeriod)); }} className="w-8" />
                    <span className="text-muted-foreground font-bold text-xs">:</span>
                    <DialPicker items={MINUTES} value={endMinute} onChange={v => { setEndTimeManuallySet(true); setEndMinute(v); }} className="w-8" />
                    <div className="flex flex-col gap-0.5 ml-1">
                      {(['AM', 'PM'] as const).map(p => (
                        <button key={p} type="button" onClick={() => { setEndTimeManuallySet(true); setEndHour(to24h(eh12, p)); }}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-semibold transition-all ${ePeriod === p ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}
                        >{p}</button>
                      ))}
                    </div>
                  </div>
                );
              })() : (
                <button
                  type="button"
                  onClick={() => setEditingEndTime(true)}
                  className="w-full text-left px-2.5 py-2 rounded-md border border-foreground/5 bg-background/50 text-sm hover:border-foreground/15 transition-colors"
                >
                  {format12h(endHour, endMinute)}
                </button>
              )}
            </div>
          </div>

          {/* Assign to (self or child profile) */}
          {childProfiles.length > 0 && (
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Assign To</Label>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => canEdit && setSelectedChildProfileId(null)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                    !selectedChildProfileId
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-background/50 border-foreground/10 hover:border-foreground/20'
                  } ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!canEdit}
                >
                  Me
                </button>
                {childProfiles.map(cp => (
                  <button
                    key={cp.id}
                    onClick={() => canEdit && setSelectedChildProfileId(cp.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                      selectedChildProfileId === cp.id
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-background/50 border-foreground/10 hover:border-foreground/20'
                    } ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={!canEdit}
                  >
                    <Baby className="w-3.5 h-3.5" />
                    {cp.displayName}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Attendees */}
          <div className="space-y-3">
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Attendees</Label>
            
            {isAnonymous && (
              <button
                onClick={onPromptSignup}
                className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors border border-dashed border-foreground/15 rounded-lg px-3 py-2.5 w-full justify-center"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Create an account to add other users
              </button>
            )}
            
            {!isAnonymous && <>
            {/* Current attendees */}
            {displayedAttendeeIds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {displayedAttendeeIds.map(uid => (
                  <span
                    key={uid}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-foreground/5 text-xs font-medium"
                  >
                    <span className="size-5 rounded-full bg-foreground/10 flex items-center justify-center text-[10px] font-semibold uppercase">
                      {(profiles[uid] || 'U')[0]}
                    </span>
                    {profiles[uid] || 'Unknown'}
                    {canEdit && (
                      <button
                        onClick={() => handleRemoveAttendee(uid)}
                        className="ml-0.5 size-4 rounded-full hover:bg-foreground/10 flex items-center justify-center transition-colors"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}

            {/* Add attendee */}
            {canEdit && (
              <div className="relative">
                <button
                  onClick={() => setShowAttendeePicker(!showAttendeePicker)}
                  className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Add attendee
                </button>

                {showAttendeePicker && (
                  <div className="mt-2 border border-foreground/10 rounded-lg bg-background shadow-lg overflow-hidden">
                    <div className="p-2 border-b border-foreground/5">
                      <Input
                        value={attendeeSearch}
                        onChange={e => setAttendeeSearch(e.target.value)}
                        placeholder="Search users..."
                        className="h-8 text-xs border-foreground/10 bg-background/50"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-[150px] overflow-y-auto">
                      {availableUsers.length === 0 ? (
                        <div className="p-3 text-xs text-muted-foreground text-center">
                          No users found
                        </div>
                      ) : (
                        availableUsers.map(([uid, name]) => (
                          <button
                            key={uid}
                            onClick={() => handleAddExistingAttendee(uid)}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-foreground/5 transition-colors text-left"
                          >
                            <span className="size-6 rounded-full bg-foreground/10 flex items-center justify-center text-[10px] font-semibold uppercase shrink-0">
                              {(name || 'U')[0]}
                            </span>
                            <span className="text-xs truncate">{name}</span>
                          </button>
                        ))
                      )}
                    </div>
                    {/* Invite new user via link */}
                    <div className="border-t border-foreground/5 p-2">
                      <button
                        onClick={() => {
                          const baseUrl = 'https://markjbarber-tech.github.io/shared-time-planner';
                          const eventRef = isEditing && editingEvent ? editingEvent.id : 'new';
                          const inviteUrl = `${baseUrl}/auth?invite=true&event=${eventRef}`;
                          navigator.clipboard.writeText(inviteUrl).then(() => {
                            setInviteLinkCopied(true);
                            toast({
                              title: 'Invite link copied',
                              description: 'Share this link with someone to invite them to join and view this event.',
                            });
                            setTimeout(() => setInviteLinkCopied(false), 3000);
                          });
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-foreground/5 transition-colors text-left rounded-md"
                      >
                        {inviteLinkCopied ? (
                          <Check className="w-4 h-4 text-green-500 shrink-0" />
                        ) : (
                          <Link className="w-4 h-4 text-muted-foreground shrink-0" />
                        )}
                        <span className="text-xs font-medium">
                          {inviteLinkCopied ? 'Link copied!' : 'Copy invite link for new user'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            </>}
          </div>

          {/* Visibility */}
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Visibility</Label>
            <div className="flex gap-2">
              {visibilityOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => canEdit && setVisibility(opt.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                    visibility === opt.value
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-background/50 border-foreground/10 hover:border-foreground/20'
                  } ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!canEdit}
                >
                  <opt.icon className="w-3.5 h-3.5" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reminder */}
          <div className="space-y-3">
            <button
              onClick={() => canEdit && setReminderEnabled(!reminderEnabled)}
              className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              disabled={!canEdit}
            >
              <Bell className="w-3.5 h-3.5" />
              {reminderEnabled ? 'Reminder enabled' : 'Add reminder'}
            </button>
            {reminderEnabled && (
              <div className="flex gap-2 flex-wrap">
                <div className="flex gap-1 p-1 bg-background/50 rounded-lg border border-foreground/5">
                  {(['push', 'email'] as ReminderType[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setReminderType(t)}
                      className={`px-3 py-1 rounded text-[11px] font-medium transition-all ${
                        reminderType === t ? 'bg-foreground text-background' : 'text-muted-foreground'
                      }`}
                    >
                      {t === 'push' ? 'Push' : 'Email'}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1 p-1 bg-background/50 rounded-lg border border-foreground/5">
                  {timingOptions.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setReminderTiming(t.value)}
                      className={`px-3 py-1 rounded text-[11px] font-medium transition-all ${
                        reminderTiming === t.value ? 'bg-foreground text-background' : 'text-muted-foreground'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {isEditing && canEdit && (
              <Button
                variant="outline"
                onClick={handleDelete}
                className="border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                Delete
              </Button>
            )}
            <Button variant="outline" onClick={onClose} className="flex-1 border-foreground/10">
              Cancel
            </Button>
            {canEdit && (
              <Button
                onClick={handleSave}
                disabled={!title.trim()}
                className="flex-1 bg-foreground text-background hover:bg-foreground/90"
              >
                {isEditing ? 'Save Changes' : 'Create Entry'}
              </Button>
            )}
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
