import { createContext, useContext, useEffect, useState } from 'react';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface User extends SupabaseUser {
  role?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  signInWithOtp: (email: string) => Promise<{ error: Error | null }>;
  verifyOtp: (email: string, token: string) => Promise<{ data: any; error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchUserRole = async (userId: string) => {
      console.log(`[AuthDebug] ${new Date().toISOString()} Starting fetchUserRole for ${userId}`);
      try {
        // Add timeout for role fetch as well
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Role fetch timeout')), 2000)
        );

        const fetchPromise = supabase.from('profiles').select('role').eq('id', userId).single();

        const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

        if (error) {
          console.warn(`[AuthDebug] ${new Date().toISOString()} Error fetching user role:`, error);
          return null;
        }
        console.log(`[AuthDebug] ${new Date().toISOString()} Fetched role:`, data?.role);
        return data?.role;
      } catch (e) {
        console.error(`[AuthDebug] ${new Date().toISOString()} Exception fetching role:`, e);
        return null;
      }
    };

    const handleSession = async (session: Session | null) => {
      if (!mounted) return;
      console.log(`[AuthDebug] ${new Date().toISOString()} Handling session. User: ${session?.user?.id}`);

      // Immediately set loading to true if we have a session to process
      if (session?.user) {
        setLoading(true);
      }

      let currentUser = session?.user ?? null;
      if (currentUser) {
        try {
          await supabase.rpc('link_user_invitations');
        } catch (e) {
          console.error('[AuthDebug] Error linking invitations:', e);
        }

        const role = await fetchUserRole(currentUser.id);
        if (mounted && role) {
          currentUser = { ...currentUser, role };
        }
      }

      if (mounted) {
        setSession(session);
        setUser(currentUser as User);
        setLoading(false);
        console.log(`[AuthDebug] ${new Date().toISOString()} State updated. Loading: false`);
      }
    };

    const initSession = async () => {
      console.log(`[AuthDebug] ${new Date().toISOString()} initSession started`);
      try {
        // Create a promise that rejects after 2 seconds
        const timeoutPromise = new Promise<{ data: { session: Session | null }; error: any }>((_, reject) =>
          setTimeout(() => reject(new Error('Session fetch timeout')), 2000)
        );

        // Race the getSession against the timeout
        const { data: { session } } = await Promise.race([
          supabase.auth.getSession(),
          timeoutPromise
        ]);

        console.log(`[AuthDebug] ${new Date().toISOString()} getSession result exists:`, !!session);
        await handleSession(session);
      } catch (error) {
        console.error(`[AuthDebug] ${new Date().toISOString()} Error initializing session (or timeout):`, error);

        // Auto-cleanup functionality to fix the "hanging" issue
        if (error instanceof Error && error.message === 'Session fetch timeout') {
          console.warn(`[AuthDebug] ${new Date().toISOString()} Timeout detected. Clearing potential stale Supabase storage to self-heal.`);
          try {
            Object.keys(localStorage).forEach(key => {
              if (key.startsWith('sb-')) {
                localStorage.removeItem(key);
                console.log(`[AuthDebug] Removed stale key: ${key}`);
              }
            });
          } catch (cleanupError) {
            console.error('[AuthDebug] Error clearing local storage:', cleanupError);
          }
        }

        // If timeout or error, we still want to stop loading eventually
        if (mounted) setLoading(false);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`[AuthDebug] ${new Date().toISOString()} onAuthStateChange event: ${event}`);
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
        handleSession(session);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithOtp = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      // We don't specify emailRedirectTo for code-based flow if we want just the code, 
      // but usually Supabase sends a link unless configured otherwise. 
      // Ensure Supabase project is set to "Send Email OTP" not just magic link.
    });
    return { error };
  };

  const verifyOtp = async (email: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isSuperAdmin = user?.role === 'superadmin';

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, isSuperAdmin, signInWithOtp, verifyOtp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
