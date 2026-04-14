import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { lovable } from '@/integrations/lovable/index';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getLocalDataForMigration, clearLocalData } from '@/lib/localStorageEvents';

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // When user becomes authenticated, migrate local data then redirect
  useEffect(() => {
    if (!user) return;

    const migrateAndRedirect = async () => {
      const { events, childProfiles } = getLocalDataForMigration();

      if (childProfiles.length > 0 || events.length > 0) {
        try {
          // Migrate child profiles first, mapping old IDs to new ones
          const childIdMap: Record<string, string> = {};

          for (const cp of childProfiles) {
            const { data } = await supabase
              .from('child_profiles')
              .insert({
                parent_user_id: user.id,
                display_name: cp.displayName,
                preferred_color: cp.preferredColor,
              })
              .select()
              .single();
            if (data) {
              childIdMap[cp.id] = data.id;
            }
          }

          // Migrate events, remapping child profile IDs
          for (const event of events) {
            await supabase.from('events').insert({
              title: event.title,
              description: event.description ?? null,
              start_date: event.startDate,
              end_date: event.endDate,
              start_time: event.startTime,
              end_time: event.endTime,
              visibility: event.visibility,
              user_id: user.id,
              user_color: event.userColor,
              child_profile_id: event.childProfileId ? (childIdMap[event.childProfileId] ?? null) : null,
              reminder_type: event.reminder?.type ?? null,
              reminder_timing: event.reminder?.timing ?? null,
            });
          }

          clearLocalData();
          toast({
            title: 'Data migrated',
            description: `${events.length} event(s) and ${childProfiles.length} profile(s) synced to your account.`,
          });
        } catch (err) {
          console.error('Migration error:', err);
          toast({
            title: 'Migration warning',
            description: 'Some local data could not be migrated. You can re-create it manually.',
            variant: 'destructive',
          });
        }
      }

      navigate('/', { replace: true });
    };

    migrateAndRedirect();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = isSignUp
      ? await signUp(email, password, displayName)
      : await signIn(email, password);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else if (isSignUp) {
      toast({ title: 'Check your email', description: 'We sent you a confirmation link.' });
    }
    setLoading(false);
  };

  const localData = getLocalDataForMigration();
  const hasLocalData = localData.events.length > 0 || localData.childProfiles.length > 0;

  return (
    <div className="min-h-dvh light-table-glow flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <span className="text-[10px] tracking-[0.2em] uppercase font-medium text-muted-foreground">
            Shared Calendar
          </span>
          <h1 className="text-4xl font-serif font-light italic tracking-tight">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h1>
          {hasLocalData && (
            <p className="text-xs text-muted-foreground mt-2">
              Your {localData.events.length} local event(s) will be synced to your account
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Display Name</Label>
              <Input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Your name"
                required
                className="border-foreground/10 bg-background/50"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="border-foreground/10 bg-background/50"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Password</Label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="border-foreground/10 bg-background/50"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-foreground text-background hover:bg-foreground/90"
          >
            {loading ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-foreground/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full border-foreground/10"
          onClick={async () => {
            const result = await lovable.auth.signInWithOAuth("google", {
              redirect_uri: window.location.origin,
            });
            if (result.error) {
              toast({ title: 'Error', description: String(result.error), variant: 'destructive' });
            }
          }}
        >
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full border-foreground/10"
          onClick={async () => {
            const result = await lovable.auth.signInWithOAuth("apple", {
              redirect_uri: window.location.origin,
            });
            if (result.error) {
              toast({ title: 'Error', description: String(result.error), variant: 'destructive' });
            }
          }}
        >
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
          </svg>
          Continue with Apple
        </Button>

        <div className="flex flex-col items-center gap-2">
          <p className="text-center text-sm text-muted-foreground">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="underline text-foreground hover:text-foreground/80"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
          <button
            onClick={() => navigate('/')}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Continue without account
          </button>
        </div>
      </div>
    </div>
  );
}
