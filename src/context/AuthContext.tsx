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

        // SECURE CHANGE: Read role from JWT (app_metadata) instead of easy-to-spoof DB fetch.
        // The role is synced to app_metadata via a Database Trigger.
        const role = currentUser.app_metadata?.role as string | undefined;
        
        console.log(`[AuthDebug] ${new Date().toISOString()} Role from JWT:`, role);
        
        if (role) {
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
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        console.log(`[AuthDebug] ${new Date().toISOString()} getSession result exists:`, !!session);
        await handleSession(session);
      } catch (error) {
        console.error(`[AuthDebug] ${new Date().toISOString()} Error initializing session:`, error);
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
