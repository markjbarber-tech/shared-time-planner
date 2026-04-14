import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DialPicker } from './DialPicker';
import { useAuth } from '@/hooks/useAuth';
import type { CalendarEvent, EventVisibility, ReminderType, ReminderTiming, ChildProfile } from '@/types/calendar';
import { USER_COLORS } from '@/types/calendar';
import { Eye, EyeOff, Users, Bell, X, UserPlus, Baby } from 'lucide-react';
import type { EventAttendee } from '@/hooks/useEventAttendees';

interface EventDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (event: Omit<CalendarEvent, 'id' | 'createdAt'>) => Promise<any>;
  onUpdate?: (id: string, event: Omit<CalendarEvent, 'id' | 'createdAt'>) => void;
  onDelete?: (id: string) => void;
  initialDate: string;
  editingEvent?: CalendarEvent | null;
  profiles: Record<string, string>;
  attendees: EventAttendee[];
  onAddAttendee?: (eventId: string, userId: string) => Promise<void>;
  onRemoveAttendee?: (eventId: string, attendeeId: string) => Promise<void>;
  childProfiles: ChildProfile[];
  isAnonymous?: boolean;
  onPromptSignup?: () => void;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

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
      setEndTimeManuallySet(true); // don't auto-update end time when editing
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
    }
    setAttendeeSearch('');
    setShowAttendeePicker(false);
  }, [editingEvent, open, initialDate]);

  const years = useMemo(() => generateYears(), []);
  const startDays = useMemo(() => generateDays(parseInt(startYear), parseInt(startMonth)), [startYear, startMonth]);
  const endDays = useMemo(() => generateDays(parseInt(endYear), parseInt(endMonth)), [endYear, endMonth]);

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

  const canEdit = !isEditing || editingEvent.userId === user?.id;

  // Combined list of attendee user IDs to display
  const displayedAttendeeIds = isEditing
    ? attendees.map(a => a.userId)
    : pendingAttendees;

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="vellum-layer border-foreground/5 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-light italic">
            {isEditing ? 'Edit Entry' : 'New Entry'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Title */}
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Title</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Event title..."
              className="border-foreground/10 bg-background/50"
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
              className="border-foreground/10 bg-background/50 resize-none"
              rows={2}
              disabled={!canEdit}
            />
          </div>

          {/* Date & Time Pickers */}
          <div className="grid grid-cols-2 gap-6">
            {/* Start */}
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Start</Label>
              <div className="flex gap-1 bg-background/50 rounded-lg border border-foreground/5 p-2">
                <DialPicker items={startDays} value={startDay} onChange={setStartDay} className="w-10" />
                <DialPicker items={MONTHS} value={MONTHS[parseInt(startMonth)]} onChange={v => setStartMonth(String(MONTHS.indexOf(v)))} className="w-12" />
                <DialPicker items={years} value={startYear} onChange={setStartYear} className="w-14" />
              </div>
              <div className="flex gap-1 bg-background/50 rounded-lg border border-foreground/5 p-2">
                <DialPicker items={HOURS} value={startHour} onChange={setStartHour} className="w-12" />
                <span className="flex items-center text-muted-foreground font-bold self-center">:</span>
                <DialPicker items={MINUTES} value={startMinute} onChange={setStartMinute} className="w-12" />
              </div>
            </div>

            {/* End */}
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">End</Label>
              <div className="flex gap-1 bg-background/50 rounded-lg border border-foreground/5 p-2">
                <DialPicker items={endDays} value={endDay} onChange={setEndDay} className="w-10" />
                <DialPicker items={MONTHS} value={MONTHS[parseInt(endMonth)]} onChange={v => setEndMonth(String(MONTHS.indexOf(v)))} className="w-12" />
                <DialPicker items={years} value={endYear} onChange={setEndYear} className="w-14" />
              </div>
              <div className="flex gap-1 bg-background/50 rounded-lg border border-foreground/5 p-2">
                <DialPicker items={HOURS} value={endHour} onChange={setEndHour} className="w-12" />
                <span className="flex items-center text-muted-foreground font-bold self-center">:</span>
                <DialPicker items={MINUTES} value={endMinute} onChange={setEndMinute} className="w-12" />
              </div>
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
      </DialogContent>
    </Dialog>
  );
}
