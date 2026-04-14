import { useState } from 'react';
import { USER_COLORS } from '@/types/calendar';
import type { ChildProfile } from '@/types/calendar';
import type { ProfileData } from '@/hooks/useProfiles';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ChildProfileManager } from './ChildProfileManager';
import {
  User, Users, Baby, Share2, Check, X, Pencil, ChevronRight, ArrowLeft, Copy,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MemberSettingsProps {
  profileList: ProfileData[];
  currentUserProfile?: ProfileData;
  nicknames: Record<string, string>;
  onUpdateDisplayName: (userId: string, newName: string) => Promise<void>;
  onUpdateColor: (userId: string, colorIndex: number) => Promise<void>;
  onSetNickname: (targetUserId: string, nickname: string) => Promise<void>;
  childProfiles: ChildProfile[];
  onAddChild: (name: string, color: number) => Promise<any>;
  onUpdateChild: (id: string, updates: Partial<Pick<ChildProfile, 'displayName' | 'preferredColor'>>) => Promise<void>;
  onDeleteChild: (id: string) => Promise<void>;
  isAnonymous: boolean;
  onNavigateAuth: () => void;
}

type Section = 'main' | 'my-profile' | 'members' | 'children';

export function MemberSettings({
  profileList,
  currentUserProfile,
  nicknames,
  onUpdateDisplayName,
  onUpdateColor,
  onSetNickname,
  childProfiles,
  onAddChild,
  onUpdateChild,
  onDeleteChild,
  isAnonymous,
  onNavigateAuth,
}: MemberSettingsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [section, setSection] = useState<Section>('main');
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [editingNicknameFor, setEditingNicknameFor] = useState<string | null>(null);
  const [nicknameValue, setNicknameValue] = useState('');

  const otherMembers = profileList.filter(p => p.userId !== user?.id);

  if (section === 'my-profile' && currentUserProfile) {
    const color = USER_COLORS[currentUserProfile.preferredColor % USER_COLORS.length];
    const displayName = currentUserProfile.displayName;

    return (
      <div className="space-y-6">
        <button
          onClick={() => setSection('main')}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>

        <div className="flex flex-col items-center gap-3">
          <div
            className="size-16 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg"
            style={{ backgroundColor: color }}
          >
            {displayName[0]?.toUpperCase() || '?'}
          </div>
          <p className="text-lg font-semibold">{displayName}</p>
        </div>

        {/* Display Name */}
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Display Name</Label>
          {editingName ? (
            <div className="flex gap-2">
              <Input
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                placeholder="Your display name"
                className="border-foreground/10 bg-background/50 text-sm flex-1"
                style={{ fontSize: '16px' }}
                autoFocus
              />
              <Button size="icon" variant="ghost" onClick={async () => {
                if (nameValue.trim()) await onUpdateDisplayName(currentUserProfile.userId, nameValue.trim());
                setEditingName(false);
              }} className="shrink-0"><Check className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => setEditingName(false)} className="shrink-0"><X className="w-4 h-4" /></Button>
            </div>
          ) : (
            <button
              onClick={() => { setNameValue(displayName); setEditingName(true); }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-foreground/10 hover:border-foreground/20 transition-colors text-sm"
            >
              <span>{displayName}</span>
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
          <p className="text-[10px] text-muted-foreground">This is how other members see you.</p>
        </div>

        {/* Color */}
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Calendar Color</Label>
          <div className="flex gap-3">
            {USER_COLORS.map((c, i) => (
              <button
                key={i}
                onClick={() => onUpdateColor(currentUserProfile.userId, i)}
                className={`size-8 rounded-full transition-all ${
                  currentUserProfile.preferredColor === i ? 'ring-2 ring-offset-2 ring-foreground/30 scale-110' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">This color applies to all your events for everyone.</p>
        </div>
      </div>
    );
  }

  if (section === 'members') {
    return (
      <div className="space-y-4">
        <button
          onClick={() => { setSection('main'); setEditingNicknameFor(null); }}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>

        <h3 className="font-serif text-lg italic">Members</h3>

        {otherMembers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No other members yet. Invite someone to get started!</p>
        ) : (
          <div className="space-y-3">
            {otherMembers.map(p => {
              const color = USER_COLORS[p.preferredColor % USER_COLORS.length];
              const nickname = nicknames[p.userId];
              const display = nickname || p.displayName;
              const isEditingThis = editingNicknameFor === p.userId;

              return (
                <div key={p.userId} className="rounded-xl border border-foreground/5 overflow-hidden">
                  <div className="p-3 flex items-center gap-3">
                    <span
                      className="size-9 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0"
                      style={{ backgroundColor: color }}
                    >
                      {display[0]?.toUpperCase() || '?'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{display}</p>
                      {nickname && (
                        <p className="text-[10px] text-muted-foreground">Original: {p.displayName}</p>
                      )}
                    </div>
                  </div>

                  {/* Local color override */}
                  <div className="px-3 pb-2">
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Color (local)</Label>
                    <div className="flex gap-2 mt-1.5">
                      {USER_COLORS.map((c, i) => (
                        <button
                          key={i}
                          onClick={() => onUpdateColor(p.userId, i)}
                          className={`size-6 rounded-full transition-all ${
                            p.preferredColor === i ? 'ring-2 ring-offset-1 ring-foreground/30 scale-110' : 'hover:scale-110'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Nickname */}
                  <div className="px-3 pb-3 pt-1">
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Nickname (only you see this)</Label>
                    {isEditingThis ? (
                      <div className="flex gap-2 mt-1.5">
                        <Input
                          value={nicknameValue}
                          onChange={e => setNicknameValue(e.target.value)}
                          placeholder={p.displayName}
                          className="h-8 text-xs border-foreground/10 bg-background/50 flex-1"
                          style={{ fontSize: '16px' }}
                          autoFocus
                        />
                        <Button size="icon" variant="ghost" className="size-8 shrink-0" onClick={async () => {
                          await onSetNickname(p.userId, nicknameValue);
                          setEditingNicknameFor(null);
                        }}><Check className="w-3.5 h-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="size-8 shrink-0" onClick={() => setEditingNicknameFor(null)}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingNicknameFor(p.userId); setNicknameValue(nickname || ''); }}
                        className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Pencil className="w-3 h-3" />
                        {nickname ? 'Edit nickname' : 'Set nickname'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (section === 'children') {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSection('main')}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>

        <ChildProfileManager
          childProfiles={childProfiles}
          onAdd={onAddChild}
          onUpdate={onUpdateChild}
          onDelete={onDeleteChild}
        />
      </div>
    );
  }

  // Main menu
  return (
    <div className="space-y-2">
      <h3 className="font-serif text-lg italic mb-4">Member Settings</h3>

      {isAnonymous ? (
        <button
          onClick={onNavigateAuth}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-foreground/5 transition-colors text-left"
        >
          <User className="w-5 h-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium">Sign in or create account</p>
            <p className="text-[10px] text-muted-foreground">Access member features</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      ) : (
        <>
          {/* My Profile */}
          <button
            onClick={() => setSection('my-profile')}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-foreground/5 transition-colors text-left"
          >
            {currentUserProfile && (
              <span
                className="size-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
                style={{ backgroundColor: USER_COLORS[currentUserProfile.preferredColor % USER_COLORS.length] }}
              >
                {currentUserProfile.displayName[0]?.toUpperCase() || '?'}
              </span>
            )}
            {!currentUserProfile && <User className="w-5 h-5 text-muted-foreground" />}
            <div className="flex-1">
              <p className="text-sm font-medium">My Profile</p>
              <p className="text-[10px] text-muted-foreground">Name, color &amp; how others see you</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Members */}
          <button
            onClick={() => setSection('members')}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-foreground/5 transition-colors text-left"
          >
            <Users className="w-5 h-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">Members</p>
              <p className="text-[10px] text-muted-foreground">{otherMembers.length} member{otherMembers.length !== 1 ? 's' : ''} — colors &amp; nicknames</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Child Profiles */}
          <button
            onClick={() => setSection('children')}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-foreground/5 transition-colors text-left"
          >
            <Baby className="w-5 h-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">Child Profiles</p>
              <p className="text-[10px] text-muted-foreground">{childProfiles.length} profile{childProfiles.length !== 1 ? 's' : ''}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Invite */}
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
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-foreground/5 transition-colors text-left"
          >
            <Share2 className="w-5 h-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">Invite New Members</p>
              <p className="text-[10px] text-muted-foreground">Copy invite link to share</p>
            </div>
            <Copy className="w-4 h-4 text-muted-foreground" />
          </button>
        </>
      )}
    </div>
  );
}
