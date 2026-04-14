import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { USER_COLORS } from '@/types/calendar';
import { Pencil, Check, X } from 'lucide-react';
import type { ProfileData } from '@/hooks/useProfiles';
import { useAuth } from '@/hooks/useAuth';

interface UserProfileDialogProps {
  profile: ProfileData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nickname?: string;
  onSetNickname?: (targetUserId: string, nickname: string) => Promise<void>;
}

export default function UserProfileDialog({ profile, open, onOpenChange, nickname, onSetNickname }: UserProfileDialogProps) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [nicknameValue, setNicknameValue] = useState('');

  useEffect(() => {
    if (open) {
      setNicknameValue(nickname || '');
      setEditing(false);
    }
  }, [open, nickname]);

  if (!profile) return null;

  const color = USER_COLORS[profile.preferredColor % USER_COLORS.length];
  const isOwnProfile = user?.id === profile.userId;
  const displayName = nickname || profile.displayName;

  const handleSaveNickname = async () => {
    if (onSetNickname) {
      await onSetNickname(profile.userId, nicknameValue);
    }
    setEditing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-center">Member Profile</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <div
            className="size-20 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-lg"
            style={{ backgroundColor: color }}
          >
            {displayName[0]?.toUpperCase() || '?'}
          </div>
          <div className="text-center space-y-1">
            <p className="text-lg font-semibold text-foreground">{displayName}</p>
            {nickname && (
              <p className="text-xs text-muted-foreground">Original name: {profile.displayName}</p>
            )}
            <div className="flex items-center gap-2 justify-center">
              <span
                className="size-3 rounded-full inline-block"
                style={{ backgroundColor: color }}
              />
              <span className="text-sm text-muted-foreground">Calendar color</span>
            </div>
          </div>

          {/* Nickname editing - only for other users */}
          {!isOwnProfile && onSetNickname && (
            <div className="w-full pt-2 border-t border-foreground/5">
              {editing ? (
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Nickname</Label>
                  <div className="flex gap-2">
                    <Input
                      value={nicknameValue}
                      onChange={e => setNicknameValue(e.target.value)}
                      placeholder={profile.displayName}
                      className="border-foreground/10 bg-background/50 text-sm flex-1"
                    />
                    <Button size="icon" variant="ghost" onClick={handleSaveNickname} className="shrink-0">
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setEditing(false)} className="shrink-0">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Leave empty to use their original name</p>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(true)}
                  className="w-full border-foreground/10 text-xs"
                >
                  <Pencil className="w-3 h-3 mr-1.5" />
                  {nickname ? 'Edit Nickname' : 'Set Nickname'}
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
