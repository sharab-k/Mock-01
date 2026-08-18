import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { UserRole } from './role-destinations';

export type AuthErrorCode = 'invalid_credentials' | 'account_inactive' | 'no_role' | 'unknown';

type Profile = { fullName: string; email: string };

type AuthState = {
  session: Session | null;
  role: UserRole | null;
  profile: Profile | null;
  // True during initial bootstrap AND while a profile lookup is in flight
  // after any sign-in/sign-out — consumers (Index, PortalGate) must wait on
  // this rather than react to a transient role === null right after signIn
  // resolves but before the profile row has loaded.
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthErrorCode | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

// Mobile equivalent of the web's (auth)/login/actions.ts + requireRole()'s
// is_active check, adapted for bearer sessions instead of cookies. Supabase
// JS v2 fires onAuthStateChange immediately on subscribe with the current
// session (event INITIAL_SESSION), so a single listener covers both
// bootstrap and every subsequent sign-in/sign-out — no separate
// getSession() call needed.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadProfile(currentSession: Session | null) {
      setLoading(true);
      try {
        if (!currentSession) {
          if (mounted) { setRole(null); setProfile(null); }
          return;
        }
        const { data } = await supabase
          .from('profiles')
          .select('role, full_name, email, is_active')
          .eq('id', currentSession.user.id)
          .single();

        if (!mounted) return;

        if (!data || !data.is_active) {
          await supabase.auth.signOut();
          setRole(null);
          setProfile(null);
          return;
        }
        setRole(data.role);
        setProfile({ fullName: data.full_name ?? data.email, email: data.email });
      } finally {
        if (mounted) setLoading(false);
      }
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      loadProfile(nextSession);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string): Promise<{ error: AuthErrorCode | null }> {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return { error: 'invalid_credentials' };

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('is_active')
      .eq('id', data.user.id)
      .single();

    if (!profileRow) return { error: 'no_role' };
    if (!profileRow.is_active) {
      await supabase.auth.signOut();
      return { error: 'account_inactive' };
    }
    // onAuthStateChange (above) picks up the new session and loads the full
    // profile/role — this second lookup here only decides the return code.
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, role, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
