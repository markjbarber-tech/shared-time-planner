import { useState } from 'react';
import { USER_COLORS } from '@/types/calendar';
import type { ChildProfile, CalendarGroup, CalendarGroupMember } from '@/types/calendar';
import type { ProfileData } from '@/hooks/useProfiles';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ChildProfileManager } from './ChildProfileManager';
import {
  User, Users, Baby, Share2, Check, X, Pencil, ChevronRight, ArrowLeft, Copy,
  FolderOpen, Plus, Trash2,
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
  // Group props
  groups: CalendarGroup[];
  activeGroupId: string | null;
  onSwitchGroup: (groupId: string) => void;
  onCreateGroup: (name: string) => Promise<CalendarGroup | null>;
  onUpdateGroupName: (groupId: string, name: string) => Promise<void>;
  onDeleteGroup: (groupId: string) => Promise<void>;
  onAddMemberToGroup: (groupId: string, userId: string) => Promise<void>;
  onRemoveMemberFromGroup: (groupId: string, userId: string) => Promise<void>;
  getGroupMembers: (groupId: string) => CalendarGroupMember[];
  isGroupAdmin: (groupId: string) => boolean;
}

type Section = 'main' | 'my-profile' | 'members' | 'children' | 'groups' | 'group-detail';

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
  groups,
  activeGroupId,
  onSwitchGroup,
  onCreateGroup,
  onUpdateGroupName,
  onDeleteGroup,
  onAddMemberToGroup,
  onRemoveMemberFromGroup,
  getGroupMembers,
  isGroupAdmin,
}: MemberSettingsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [section, setSection] = useState<Section>('main');
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [editingNicknameFor, setEditingNicknameFor] = useState<string | null>(null);
  const [nicknameValue, setNicknameValue] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState(false);
  const [groupNameValue, setGroupNameValue] = useState('');

  const otherMembers = profileList.filter(p => p.userId !== user?.id);
  const activeGroup = groups.find(g => g.id === activeGroupId);

  // ─── My Profile ──────────────────────────────
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

  // ─── Members ─────────────────────────────────
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

  // ─── Children ────────────────────────────────
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

  // ─── Groups List ─────────────────────────────
  if (section === 'groups') {
    return (
      <div className="space-y-4">
        <button
          onClick={() => { setSection('main'); setCreatingGroup(false); }}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>

        <h3 className="font-serif text-lg italic">Calendar Groups</h3>

        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No groups yet. Create one to organise your calendars by family, work, etc.
          </p>
        ) : (
          <div className="space-y-2">
            {groups.map(g => (
              <button
                key={g.id}
                onClick={() => { setSelectedGroupId(g.id); setSection('group-detail'); }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors text-left ${
                  g.id === activeGroupId ? 'bg-foreground/5 ring-1 ring-foreground/10' : 'hover:bg-foreground/5'
                }`}
              >
                <FolderOpen className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{g.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {getGroupMembers(g.id).length} member{getGroupMembers(g.id).length !== 1 ? 's' : ''}
                    {g.id === activeGroupId && ' • Active'}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}

        {/* Create new group */}
        {creatingGroup ? (
          <div className="flex gap-2 pt-2">
            <Input
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              placeholder="Group name..."
              className="border-foreground/10 bg-background/50 text-sm flex-1"
              style={{ fontSize: '16px' }}
              autoFocus
              onKeyDown={async e => {
                if (e.key === 'Enter' && newGroupName.trim()) {
                  await onCreateGroup(newGroupName.trim());
                  setNewGroupName('');
                  setCreatingGroup(false);
                  toast({ title: 'Group created!' });
                }
              }}
            />
            <Button size="icon" variant="ghost" onClick={async () => {
              if (newGroupName.trim()) {
                await onCreateGroup(newGroupName.trim());
                setNewGroupName('');
                setCreatingGroup(false);
                toast({ title: 'Group created!' });
              }
            }}><Check className="w-4 h-4" /></Button>
            <Button size="icon" variant="ghost" onClick={() => { setCreatingGroup(false); setNewGroupName(''); }}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setCreatingGroup(true)}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-foreground/5 transition-colors text-left text-sm text-muted-foreground"
          >
            <Plus className="w-5 h-5" />
            <span>Create New Group</span>
          </button>
        )}
      </div>
    );
  }

  // ─── Group Detail ────────────────────────────
  if (section === 'group-detail' && selectedGroupId) {
    const group = groups.find(g => g.id === selectedGroupId);
    if (!group) { setSection('groups'); return null; }

    const groupMembers = getGroupMembers(selectedGroupId);
    const admin = isGroupAdmin(selectedGroupId);
    const isActive = selectedGroupId === activeGroupId;

    // Users in the group
    const memberProfiles = groupMembers.map(gm => {
      const profile = profileList.find(p => p.userId === gm.userId);
      return { ...gm, profile };
    });

    // Users NOT in the group (for adding)
    const nonMembers = profileList.filter(p => !groupMembers.some(gm => gm.userId === p.userId));

    return (
      <div className="space-y-5">
        <button
          onClick={() => { setSection('groups'); setEditingGroupName(false); }}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>

        {/* Group name */}
        <div className="space-y-2">
          {editingGroupName ? (
            <div className="flex gap-2">
              <Input
                value={groupNameValue}
                onChange={e => setGroupNameValue(e.target.value)}
                className="border-foreground/10 bg-background/50 text-sm flex-1"
                style={{ fontSize: '16px' }}
                autoFocus
              />
              <Button size="icon" variant="ghost" onClick={async () => {
                if (groupNameValue.trim()) await onUpdateGroupName(selectedGroupId, groupNameValue.trim());
                setEditingGroupName(false);
              }}><Check className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => setEditingGroupName(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-lg italic flex-1">{group.name}</h3>
              {admin && (
                <button onClick={() => { setGroupNameValue(group.name); setEditingGroupName(true); }}>
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Switch to / active indicator */}
        {!isActive ? (
          <Button
            variant="outline"
            className="w-full border-foreground/10"
            onClick={() => onSwitchGroup(selectedGroupId)}
          >
            Switch to this group
          </Button>
        ) : (
          <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
            <Check className="w-3.5 h-3.5" />
            <span>Currently active</span>
          </div>
        )}

        {/* Group members */}
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Members</Label>
          <div className="space-y-1.5">
            {memberProfiles.map(({ userId, role, profile }) => {
              const display = nicknames[userId] || profile?.displayName || 'Unknown';
              const color = profile ? USER_COLORS[profile.preferredColor % USER_COLORS.length] : USER_COLORS[0];
              const isMe = userId === user?.id;

              return (
                <div key={userId} className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
                  <span
                    className="size-7 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    {display[0]?.toUpperCase() || '?'}
                  </span>
                  <span className="text-sm flex-1 truncate">
                    {display}{isMe && ' (you)'}{role === 'admin' && ' • admin'}
                  </span>
                  {admin && !isMe && (
                    <button
                      onClick={() => onRemoveMemberFromGroup(selectedGroupId, userId)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Add members (admin only) */}
        {admin && nonMembers.length > 0 && (
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Add Members</Label>
            <div className="space-y-1.5">
              {nonMembers.map(p => {
                const display = nicknames[p.userId] || p.displayName;
                const color = USER_COLORS[p.preferredColor % USER_COLORS.length];
                return (
                  <button
                    key={p.userId}
                    onClick={async () => {
                      await onAddMemberToGroup(selectedGroupId, p.userId);
                      toast({ title: `${display} added to group` });
                    }}
                    className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-foreground/5 transition-colors text-left"
                  >
                    <span
                      className="size-7 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
                      style={{ backgroundColor: color }}
                    >
                      {display[0]?.toUpperCase() || '?'}
                    </span>
                    <span className="text-sm flex-1 truncate">{display}</span>
                    <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Delete group (admin only) */}
        {admin && (
          <button
            onClick={async () => {
              await onDeleteGroup(selectedGroupId);
              setSection('groups');
              toast({ title: 'Group deleted' });
            }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-destructive/5 transition-colors text-left text-sm text-destructive"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Group</span>
          </button>
        )}
      </div>
    );
  }

  // ─── Main Menu ───────────────────────────────
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
          {/* Active Group Switcher */}
          {groups.length > 0 && (
            <div className="pb-2 mb-2 border-b border-foreground/5">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground px-3 mb-1.5 block">Active Calendar</Label>
              <div className="space-y-0.5">
                {groups.map(g => (
                  <button
                    key={g.id}
                    onClick={() => onSwitchGroup(g.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left text-sm ${
                      g.id === activeGroupId ? 'bg-foreground/5 font-medium' : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground'
                    }`}
                  >
                    <FolderOpen className="w-4 h-4 shrink-0" />
                    <span className="truncate flex-1">{g.name}</span>
                    {g.id === activeGroupId && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Calendar Groups */}
          <button
            onClick={() => setSection('groups')}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-foreground/5 transition-colors text-left"
          >
            <FolderOpen className="w-5 h-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">Calendar Groups</p>
              <p className="text-[10px] text-muted-foreground">{groups.length} group{groups.length !== 1 ? 's' : ''} — create &amp; manage</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

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
