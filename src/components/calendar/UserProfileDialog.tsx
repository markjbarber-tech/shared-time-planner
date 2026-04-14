import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { USER_COLORS } from '@/types/calendar';
import type { ProfileData } from '@/hooks/useProfiles';

interface UserProfileDialogProps {
  profile: ProfileData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function UserProfileDialog({ profile, open, onOpenChange }: UserProfileDialogProps) {
  if (!profile) return null;

  const color = USER_COLORS[profile.preferredColor % USER_COLORS.length];

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
            {profile.displayName[0]?.toUpperCase() || '?'}
          </div>
          <div className="text-center space-y-1">
            <p className="text-lg font-semibold text-foreground">{profile.displayName}</p>
            <div className="flex items-center gap-2 justify-center">
              <span
                className="size-3 rounded-full inline-block"
                style={{ backgroundColor: color }}
              />
              <span className="text-sm text-muted-foreground">Calendar color</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
