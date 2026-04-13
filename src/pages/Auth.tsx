import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

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

        <p className="text-center text-sm text-muted-foreground">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="underline text-foreground hover:text-foreground/80"
          >
            {isSignUp ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  );
}
