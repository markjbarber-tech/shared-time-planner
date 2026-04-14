import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { getLocalDataForMigration, clearLocalData } from '@/lib/localStorageEvents';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  migrationResult: { events: number; profiles: number } | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function migrateLocalData(userId: string): Promise<{ events: number; profiles: number } | null> {
  const { events, childProfiles } = getLocalDataForMigration();
  if (events.length === 0 && childProfiles.length === 0) return null;

  try {
    const childIdMap: Record<string, string> = {};

    for (const cp of childProfiles) {
      const { data } = await supabase
        .from('child_profiles')
        .insert({
          parent_user_id: userId,
          display_name: cp.displayName,
          preferred_color: cp.preferredColor,
        })
        .select()
        .single();
      if (data) {
        childIdMap[cp.id] = data.id;
      }
    }

    for (const event of events) {
      await supabase.from('events').insert({
        title: event.title,
        description: event.description ?? null,
        start_date: event.startDate,
        end_date: event.endDate,
        start_time: event.startTime,
        end_time: event.endTime,
        visibility: event.visibility,
        user_id: userId,
        user_color: event.userColor,
        child_profile_id: event.childProfileId ? (childIdMap[event.childProfileId] ?? null) : null,
        reminder_type: event.reminder?.type ?? null,
        reminder_timing: event.reminder?.timing ?? null,
      });
    }

    clearLocalData();
    return { events: events.length, profiles: childProfiles.length };
  } catch (err) {
    console.error('Migration error:', err);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [migrationResult, setMigrationResult] = useState<{ events: number; profiles: number } | null>(null);
  const migrationRan = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        localStorage.setItem('has_logged_in_before', 'true');
        // Migrate local data on first sign-in during this session
        if (!migrationRan.current) {
          migrationRan.current = true;
          const result = await migrateLocalData(session.user.id);
          if (result) setMigrationResult(result);
        }
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    migrationRan.current = false;
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, migrationResult }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
