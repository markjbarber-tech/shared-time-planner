import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DialPicker } from './DialPicker';
import { useAuth } from '@/hooks/useAuth';
import type { CalendarEvent, EventVisibility, ReminderType, ReminderTiming } from '@/types/calendar';
import { Eye, EyeOff, Users, Bell } from 'lucide-react';

interface EventDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (event: Omit<CalendarEvent, 'id' | 'createdAt'>) => void;
  onUpdate?: (id: string, event: Omit<CalendarEvent, 'id' | 'createdAt'>) => void;
  onDelete?: (id: string) => void;
  initialDate: string;
  editingEvent?: CalendarEvent | null;
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

export function EventDialog({ open, onClose, onSave, onUpdate, onDelete, initialDate, editingEvent }: EventDialogProps) {
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
    } else if (!editingEvent && open) {
      // Reset for new event
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
    }
  }, [editingEvent, open, initialDate]);

  const years = useMemo(() => generateYears(), []);
  const startDays = useMemo(() => generateDays(parseInt(startYear), parseInt(startMonth)), [startYear, startMonth]);
  const endDays = useMemo(() => generateDays(parseInt(endYear), parseInt(endMonth)), [endYear, endMonth]);

  const buildEventData = () => ({
    title: title.trim(),
    description: description.trim() || undefined,
    startDate: `${startYear}-${String(parseInt(startMonth) + 1).padStart(2, '0')}-${startDay}`,
    endDate: `${endYear}-${String(parseInt(endMonth) + 1).padStart(2, '0')}-${endDay}`,
    startTime: `${startHour}:${startMinute}`,
    endTime: `${endHour}:${endMinute}`,
    visibility,
    userId: user?.id ?? '',
    userColor: editingEvent?.userColor ?? 0,
    reminder: reminderEnabled ? { type: reminderType, timing: reminderTiming } : undefined,
  });

  const handleSave = () => {
    if (!title.trim()) return;
    const data = buildEventData();
    if (isEditing && onUpdate) {
      onUpdate(editingEvent.id, data);
    } else {
      onSave(data);
    }
    onClose();
  };

  const handleDelete = () => {
    if (isEditing && onDelete) {
      onDelete(editingEvent.id);
      onClose();
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
