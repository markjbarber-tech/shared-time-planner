import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mic, MicOff, ArrowRight, ArrowLeft, Check, Calendar as CalIcon, Clock, Users, Baby, UserPlus } from 'lucide-react';
import type { CalendarEvent, ChildProfile } from '@/types/calendar';
import { USER_COLORS } from '@/types/calendar';
import type { ProfileData } from '@/hooks/useProfiles';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface VoiceEventWizardProps {
  open: boolean;
  onClose: () => void;
  initialDate: string;
  onSave: (event: Omit<CalendarEvent, 'id' | 'createdAt'>) => Promise<any>;
  onAddAttendee?: (eventId: string, userId: string) => Promise<void>;
  profileList: ProfileData[];
  profiles: Record<string, string>;
  childProfiles: ChildProfile[];
  isAnonymous?: boolean;
  activeGroupId?: string | null;
  onPromptInvite?: () => void;
}

type StepId = 'title' | 'date' | 'startTime' | 'endTime' | 'people' | 'summary';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

function pad(n: number) { return String(n).padStart(2, '0'); }
function dateToStr(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function format12h(h24: string, m: string) {
  const h = parseInt(h24);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m} ${period}`;
}
function formatDateLong(s: string) {
  const [y,m,d] = s.split('-').map(Number);
  return new Date(y, m-1, d).toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });
}

/** Parse a spoken date phrase into YYYY-MM-DD. Returns null if not understood. */
function parseSpokenDate(input: string, baseDate: Date): string | null {
  const text = input.toLowerCase().trim().replace(/[.,!?]/g, '');
  if (!text) return null;
  const today = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());

  if (/\btoday\b/.test(text)) return dateToStr(today);
  if (/\btomorrow\b/.test(text)) { const d = new Date(today); d.setDate(d.getDate()+1); return dateToStr(d); }
  if (/\byesterday\b/.test(text)) { const d = new Date(today); d.setDate(d.getDate()-1); return dateToStr(d); }

  const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const dayMatch = text.match(/\b(?:next\s+|this\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (dayMatch) {
    const target = days.indexOf(dayMatch[1]);
    const isNext = /next\s+/.test(dayMatch[0]);
    const d = new Date(today);
    let diff = (target - d.getDay() + 7) % 7;
    if (diff === 0) diff = 7;
    if (isNext && diff < 7) diff += 7;
    d.setDate(d.getDate() + diff);
    return dateToStr(d);
  }

  // Match "12 March", "March 12", "12th of March", "March 12 2026"
  const monthRegex = `(${MONTHS_SHORT.join('|')}|${MONTHS.map(m=>m.toLowerCase()).join('|')})`;
  let m = text.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${monthRegex}(?:\\s+(\\d{4}))?\\b`));
  if (!m) m = text.match(new RegExp(`\\b${monthRegex}\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:\\s+(\\d{4}))?\\b`));
  if (m) {
    let day: number, monStr: string, yearStr: string | undefined;
    if (/^\d/.test(m[1])) { day = parseInt(m[1]); monStr = m[2]; yearStr = m[3]; }
    else { monStr = m[1]; day = parseInt(m[2]); yearStr = m[3]; }
    const monIdx = MONTHS.findIndex(M => M.toLowerCase().startsWith(monStr.toLowerCase())) ;
    const realIdx = monIdx >= 0 ? monIdx : MONTHS_SHORT.indexOf(monStr.toLowerCase().slice(0,3));
    if (realIdx >= 0 && day >= 1 && day <= 31) {
      let year = yearStr ? parseInt(yearStr) : today.getFullYear();
      const candidate = new Date(year, realIdx, day);
      if (!yearStr && candidate < today) candidate.setFullYear(year + 1);
      return dateToStr(candidate);
    }
  }

  // Numeric date dd/mm or yyyy-mm-dd
  const iso = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) return `${iso[1]}-${pad(parseInt(iso[2]))}-${pad(parseInt(iso[3]))}`;
  const slashed = text.match(/\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?\b/);
  if (slashed) {
    const d = parseInt(slashed[1]);
    const mo = parseInt(slashed[2]);
    let y = slashed[3] ? parseInt(slashed[3]) : today.getFullYear();
    if (y < 100) y += 2000;
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) return `${y}-${pad(mo)}-${pad(d)}`;
  }
  return null;
}

/** Parse a spoken time phrase into "HH:mm". */
function parseSpokenTime(input: string): string | null {
  const text = input.toLowerCase().trim().replace(/[.,!?]/g, '');
  if (!text) return null;
  if (/\b(noon|midday)\b/.test(text)) return '12:00';
  if (/\bmidnight\b/.test(text)) return '00:00';

  // Match "3 pm", "3:30 pm", "15:30", "half past 3", "quarter past 3", "quarter to 4"
  let m = text.match(/\b(\d{1,2})[:\s.](\d{2})\s*(am|pm|a\.m\.|p\.m\.)?\b/);
  if (m) {
    let h = parseInt(m[1]);
    const min = parseInt(m[2]);
    const period = m[3]?.replace(/\./g,'');
    if (period === 'pm' && h < 12) h += 12;
    if (period === 'am' && h === 12) h = 0;
    if (h <= 23 && min <= 59) return `${pad(h)}:${pad(min)}`;
  }
  m = text.match(/\b(\d{1,2})\s*(am|pm|a\.m\.|p\.m\.)\b/);
  if (m) {
    let h = parseInt(m[1]);
    const period = m[2].replace(/\./g,'');
    if (period === 'pm' && h < 12) h += 12;
    if (period === 'am' && h === 12) h = 0;
    if (h <= 23) return `${pad(h)}:00`;
  }
  m = text.match(/\bhalf past (\d{1,2})\s*(am|pm)?\b/);
  if (m) {
    let h = parseInt(m[1]);
    if (m[2] === 'pm' && h < 12) h += 12;
    if (m[2] === 'am' && h === 12) h = 0;
    return `${pad(h)}:30`;
  }
  m = text.match(/\bquarter past (\d{1,2})\s*(am|pm)?\b/);
  if (m) {
    let h = parseInt(m[1]);
    if (m[2] === 'pm' && h < 12) h += 12;
    if (m[2] === 'am' && h === 12) h = 0;
    return `${pad(h)}:15`;
  }
  m = text.match(/\bquarter to (\d{1,2})\s*(am|pm)?\b/);
  if (m) {
    let h = parseInt(m[1]) - 1;
    if (h < 0) h = 23;
    if (m[2] === 'pm' && h < 12) h += 12;
    if (m[2] === 'am' && h === 12) h = 0;
    return `${pad(h)}:45`;
  }
  // Bare number: treat as hour
  m = text.match(/^\s*(\d{1,2})\s*$/);
  if (m) {
    const h = parseInt(m[1]);
    if (h <= 23) return `${pad(h)}:00`;
  }
  return null;
}

/** Add one hour to "HH:mm". */
function addHour(t: string): string {
  const [h, m] = t.split(':').map(Number);
  return `${pad((h + 1) % 24)}:${pad(m)}`;
}

/** Split a spoken people phrase into candidate names. */
function splitNames(input: string): string[] {
  let text = input.toLowerCase().trim();
  // Strip common leading filler phrases
  text = text.replace(/^(it'?s\s+|its\s+|just\s+|only\s+|with\s+|for\s+|attending(?:\s+is|\s+are)?\s+|attendees?\s+(?:is|are)\s+)/, '');
  // Normalize separators: punctuation, "&", "plus", "as well as", "along with", "together with", "and"
  text = text
    .replace(/[.,!?;]/g, ',')
    .replace(/\s*&\s*/g, ',')
    .replace(/\bas well as\b/g, ',')
    .replace(/\b(?:along|together)\s+with\b/g, ',')
    .replace(/\bplus\b/g, ',')
    .replace(/\band\b/g, ',');
  return text
    .split(',')
    .map(s => s.trim())
    .map(s => s.replace(/^(just\s+|only\s+|also\s+)+/, ''))
    .map(s => (s === 'myself' || s === 'i' ? 'me' : s))
    .filter(Boolean);
}

// Browser SpeechRecognition (with webkit fallback)
function getSpeechRecognition(): any | null {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

interface PersonResolution {
  candidate: string;
  matched: boolean;
  userId?: string;
  childId?: string;
  displayName?: string;
}

export function VoiceEventWizard({
  open, onClose, initialDate, onSave, onAddAttendee,
  profileList, profiles, childProfiles, isAnonymous, activeGroupId, onPromptInvite,
}: VoiceEventWizardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const SR = useMemo(() => getSpeechRecognition(), []);
  const recognitionRef = useRef<any>(null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [step, setStep] = useState<StepId>('title');

  // Captured fields
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(initialDate);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);
  const [assignedChildIds, setAssignedChildIds] = useState<string[]>([]);

  // Disambiguation state
  const [pendingResolutions, setPendingResolutions] = useState<PersonResolution[]>([]);
  const [resolutionIndex, setResolutionIndex] = useState(0);

  const stopListening = useCallback(() => {
    const r = recognitionRef.current;
    if (r) {
      try { r.stop(); } catch {}
      try { r.abort?.(); } catch {}
    }
    setListening(false);
  }, []);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep('title');
      setTitle('');
      setStartDate(initialDate);
      setStartTime('09:00');
      setEndTime('10:00');
      setAssignedUserIds(user?.id ? [user.id] : []);
      setAssignedChildIds([]);
      setTranscript('');
      setPendingResolutions([]);
      setResolutionIndex(0);
    } else {
      stopListening();
    }
  }, [open, initialDate, user?.id, stopListening]);

  const startListening = useCallback(() => {
    if (!SR) {
      toast({ title: 'Voice not supported', description: 'Your browser does not support speech recognition. Use the text box instead.' });
      return;
    }
    try {
      const recog = new SR();
      recog.lang = 'en-US';
      recog.interimResults = true;
      recog.continuous = false;
      recog.maxAlternatives = 1;
      recog.onresult = (e: any) => {
        let text = '';
        for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
        setTranscript(text);
      };
      recog.onerror = () => setListening(false);
      recog.onend = () => setListening(false);
      recognitionRef.current = recog;
      setTranscript('');
      recog.start();
      setListening(true);
    } catch (e) {
      console.error('Speech start failed', e);
      setListening(false);
    }
  }, [SR, toast]);

  const goNext = (next: StepId) => { stopListening(); setTranscript(''); setStep(next); };

  const handleConfirmTitle = (value?: string) => {
    const v = (value ?? transcript).trim();
    if (!v) return;
    setTitle(v);
    goNext('date');
  };

  const handleConfirmDate = (value?: string) => {
    const raw = (value ?? transcript).trim();
    if (!raw) return;
    const parsed = parseSpokenDate(raw, new Date(initialDate + 'T00:00')) || (/^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null);
    if (!parsed) {
      toast({ title: "I didn't catch that date", description: 'Try "tomorrow", "next Friday", or "12 March".' });
      return;
    }
    setStartDate(parsed);
    goNext('startTime');
  };

  const handleConfirmStartTime = (value?: string) => {
    const raw = (value ?? transcript).trim();
    if (!raw) return;
    const parsed = parseSpokenTime(raw);
    if (!parsed) {
      toast({ title: "I didn't catch that time", description: 'Try "3 pm" or "9:30 am".' });
      return;
    }
    setStartTime(parsed);
    setEndTime(addHour(parsed));
    goNext('endTime');
  };

  const handleConfirmEndTime = (value?: string) => {
    const raw = (value ?? transcript).trim();
    if (!raw) return;
    const parsed = parseSpokenTime(raw);
    if (!parsed) {
      toast({ title: "I didn't catch that time", description: 'Try "4 pm" or "10:30 am".' });
      return;
    }
    setEndTime(parsed);
    goNext('people');
  };

  const resolvePeople = (raw: string) => {
    const candidates = splitNames(raw);
    if (candidates.length === 0) { goNext('summary'); return; }
    const resolutions: PersonResolution[] = [];
    for (const cand of candidates) {
      if (cand === 'me' || cand === 'myself' || cand === 'i') {
        if (user?.id) {
          resolutions.push({ candidate: cand, matched: true, userId: user.id, displayName: 'Me' });
        }
        continue;
      }
      // Try users
      const userMatch = profileList.find(p => {
        const name = (profiles[p.userId] || p.displayName || '').toLowerCase();
        return name && (name === cand || name.split(' ')[0] === cand);
      });
      if (userMatch) {
        resolutions.push({ candidate: cand, matched: true, userId: userMatch.userId, displayName: profiles[userMatch.userId] || userMatch.displayName });
        continue;
      }
      // Try children
      const childMatch = childProfiles.find(c => {
        const name = c.displayName.toLowerCase();
        return name === cand || name.split(' ')[0] === cand;
      });
      if (childMatch) {
        resolutions.push({ candidate: cand, matched: true, childId: childMatch.id, displayName: childMatch.displayName });
        continue;
      }
      resolutions.push({ candidate: cand, matched: false });
    }
    // Apply matched ones immediately
    const newUserIds = new Set(assignedUserIds);
    const newChildIds = new Set(assignedChildIds);
    for (const r of resolutions) {
      if (r.matched && r.userId) newUserIds.add(r.userId);
      if (r.matched && r.childId) newChildIds.add(r.childId);
    }
    setAssignedUserIds(Array.from(newUserIds));
    setAssignedChildIds(Array.from(newChildIds));

    const unresolved = resolutions.filter(r => !r.matched);
    if (unresolved.length > 0) {
      setPendingResolutions(unresolved);
      setResolutionIndex(0);
    } else {
      goNext('summary');
    }
  };

  const handleConfirmPeople = (value?: string) => {
    const raw = (value ?? transcript).trim();
    if (!raw) { goNext('summary'); return; }
    stopListening();
    setTranscript('');
    resolvePeople(raw);
  };

  const resolveCurrentUnresolved = (action: { userId?: string; childId?: string; skip?: boolean; invite?: boolean }) => {
    if (action.userId) setAssignedUserIds(prev => prev.includes(action.userId!) ? prev : [...prev, action.userId!]);
    if (action.childId) setAssignedChildIds(prev => prev.includes(action.childId!) ? prev : [...prev, action.childId!]);
    if (action.invite && onPromptInvite) {
      onPromptInvite();
    }
    const nextIdx = resolutionIndex + 1;
    if (nextIdx >= pendingResolutions.length) {
      setPendingResolutions([]);
      setResolutionIndex(0);
      goNext('summary');
    } else {
      setResolutionIndex(nextIdx);
    }
  };

  const buildEvent = (): Omit<CalendarEvent, 'id' | 'createdAt'> => {
    const creatorId = user?.id || 'local-user';
    const primary = assignedUserIds[0] || creatorId;
    const primaryProfile = profileList.find(p => p.userId === primary);
    const childPrimary = childProfiles.find(c => c.id === assignedChildIds[0]);
    return {
      title: title.trim(),
      description: undefined,
      startDate,
      endDate: startDate,
      startTime,
      endTime,
      visibility: 'public',
      userId: creatorId,
      userColor: childPrimary ? childPrimary.preferredColor : (primaryProfile?.preferredColor ?? 0),
      childProfileId: assignedChildIds[0] ?? null,
      childProfileIds: assignedChildIds,
      reminder: undefined,
      recurrenceType: null,
      recurrenceInterval: 1,
      recurrenceEndDate: null,
      calendarGroupId: activeGroupId ?? null,
    };
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    const data = buildEvent();
    const result = await onSave(data);
    if (result?.id && onAddAttendee && !isAnonymous) {
      for (const uid of assignedUserIds) {
        try { await onAddAttendee(result.id, uid); } catch (e) { console.error('attendee add failed', e); }
      }
    }
    onClose();
  };

  // ----- Render helpers -----
  const QUESTIONS: Record<StepId, string> = {
    title: 'What do you want to call the event?',
    date: 'What date is the event?',
    startTime: 'When does the event start?',
    endTime: 'When does the event end?',
    people: 'Who is attending this event?',
    summary: 'Here are the event details',
  };

  const stepIndex = ['title','date','startTime','endTime','people','summary'].indexOf(step);

  const handleSubmitCurrent = () => {
    if (step === 'title') return handleConfirmTitle();
    if (step === 'date') return handleConfirmDate();
    if (step === 'startTime') return handleConfirmStartTime();
    if (step === 'endTime') return handleConfirmEndTime();
    if (step === 'people') return handleConfirmPeople();
  };

  const goBack = () => {
    stopListening(); setTranscript('');
    if (step === 'date') setStep('title');
    else if (step === 'startTime') setStep('date');
    else if (step === 'endTime') setStep('startTime');
    else if (step === 'people') setStep('endTime');
    else if (step === 'summary') setStep('people');
  };

  const placeholder: Record<StepId, string> = {
    title: 'e.g. Soccer practice',
    date: 'e.g. tomorrow, next Friday, 12 March',
    startTime: 'e.g. 3 pm, 9:30 am',
    endTime: 'e.g. 4 pm, 10:30 am',
    people: 'e.g. me, Sarah and Tom',
    summary: '',
  };

  const currentUnresolved = pendingResolutions[resolutionIndex];

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="vellum-layer border-foreground/5 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-light italic">
            {step === 'summary' ? 'Review Event' : 'New Entry'}
          </DialogTitle>
        </DialogHeader>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 pt-1">
          {[0,1,2,3,4,5].map(i => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${i <= stepIndex ? 'bg-foreground' : 'bg-foreground/10'}`}
            />
          ))}
        </div>

        {step !== 'summary' ? (
          <div className="space-y-6 pt-4">
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Question {stepIndex + 1} of 5
              </p>
              <h3 className="font-serif text-xl font-light italic leading-snug">{QUESTIONS[step]}</h3>
            </div>

            {/* Show unresolved name flow within People step */}
            {step === 'people' && currentUnresolved ? (
              <div className="space-y-4 rounded-lg border border-foreground/10 bg-background/50 p-4">
                <p className="text-sm">
                  I didn't recognize <span className="font-semibold">"{currentUnresolved.candidate}"</span>.
                  Is it one of these?
                </p>
                <div className="flex flex-col gap-2 max-h-[240px] overflow-y-auto">
                  {profileList.map(p => (
                    <button
                      key={p.userId}
                      onClick={() => resolveCurrentUnresolved({ userId: p.userId })}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-foreground/5 border border-foreground/10 text-left"
                    >
                      <span
                        className="size-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-white"
                        style={{ backgroundColor: USER_COLORS[p.preferredColor % USER_COLORS.length] }}
                      >
                        {(profiles[p.userId] || p.displayName || '?')[0]?.toUpperCase()}
                      </span>
                      <span className="text-sm">{profiles[p.userId] || p.displayName}</span>
                    </button>
                  ))}
                  {childProfiles.map(c => (
                    <button
                      key={c.id}
                      onClick={() => resolveCurrentUnresolved({ childId: c.id })}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-foreground/5 border border-foreground/10 border-dashed text-left"
                    >
                      <Baby className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{c.displayName}</span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" className="flex-1" onClick={() => resolveCurrentUnresolved({ skip: true })}>
                    Skip
                  </Button>
                  {onPromptInvite && (
                    <Button variant="outline" className="flex-1" onClick={() => resolveCurrentUnresolved({ invite: true })}>
                      <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                      Invite new
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Mic button */}
                <div className="flex flex-col items-center gap-3 py-2">
                  <button
                    type="button"
                    onClick={() => listening ? stopListening() : startListening()}
                    className={`size-20 rounded-full flex items-center justify-center transition-all shadow-lg ${
                      listening
                        ? 'bg-destructive text-destructive-foreground animate-pulse scale-105'
                        : 'bg-foreground text-background hover:scale-105 active:scale-95'
                    }`}
                    aria-label={listening ? 'Stop recording' : 'Start recording'}
                  >
                    {listening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                  </button>
                  {listening ? (
                    <button
                      type="button"
                      onClick={stopListening}
                      className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                    >
                      Listening… tap to stop
                    </button>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {SR ? 'Tap the mic to answer' : 'Voice not available — type below'}
                    </p>
                  )}
                </div>

                {/* Transcript / text input */}
                <div className="space-y-2">
                  <Input
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSubmitCurrent(); } }}
                    placeholder={placeholder[step]}
                    className="text-base border-foreground/10 bg-background/50"
                    style={{ fontSize: '16px' }}
                  />
                </div>
              </>
            )}

            {/* Nav buttons */}
            {!(step === 'people' && currentUnresolved) && (
              <div className="flex gap-3 pt-2">
                {stepIndex > 0 ? (
                  <Button variant="outline" onClick={goBack} className="border-foreground/10">
                    <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back
                  </Button>
                ) : (
                  <Button variant="outline" onClick={onClose} className="border-foreground/10">
                    Cancel
                  </Button>
                )}
                <Button onClick={handleSubmitCurrent} className="flex-1 bg-foreground text-background hover:bg-foreground/90">
                  {step === 'people' && !transcript.trim() ? 'Skip' : 'Next'} <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* Summary step */
          <div className="space-y-5 pt-4">
            <div className="space-y-3 rounded-lg border border-foreground/10 bg-background/50 p-4">
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Title</p>
                <p className="font-serif text-lg italic">{title || '(untitled)'}</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CalIcon className="w-4 h-4 text-muted-foreground" />
                <span>{formatDateLong(startDate)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{format12h(startTime.split(':')[0], startTime.split(':')[1])} — {format12h(endTime.split(':')[0], endTime.split(':')[1])}</span>
              </div>
              {(assignedUserIds.length > 0 || assignedChildIds.length > 0) && (
                <div className="flex items-start gap-2 text-sm">
                  <Users className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div className="flex flex-wrap gap-1.5">
                    {assignedUserIds.map(uid => (
                      <span key={uid} className="inline-flex items-center px-2 py-0.5 rounded-full bg-foreground/5 text-xs">
                        {profiles[uid] || profileList.find(p => p.userId === uid)?.displayName || 'Unknown'}
                        {uid === user?.id && ' (me)'}
                      </span>
                    ))}
                    {assignedChildIds.map(cid => {
                      const c = childProfiles.find(cp => cp.id === cid);
                      return c ? (
                        <span key={cid} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-foreground/5 text-xs">
                          <Baby className="w-3 h-3" /> {c.displayName}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Need anything more advanced (description, reminder, recurrence)? Save first, then tap the event to edit.
            </p>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={goBack} className="border-foreground/10">
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back
              </Button>
              <Button onClick={handleSave} disabled={!title.trim()} className="flex-1 bg-foreground text-background hover:bg-foreground/90">
                <Check className="w-3.5 h-3.5 mr-1.5" /> Save event
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
