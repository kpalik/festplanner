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
  signInWithOtp: (email: string, captchaToken?: string) => Promise<{ error: Error | null }>;
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
        // 1. Get session from LocalStorage (fast, helps with initial render)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;

        console.log(`[AuthDebug] ${new Date().toISOString()} getSession result exists:`, !!session);

        if (session) {
             // 2. CRITICAL SECURITY FIX: Verify the token with the server
             // LocalStorage data can be spoofed (e.g. role: 'superadmin'). 
             // getUser() sends the token to Supabase Auth which verifies the signature.
             const { data: { user: verifiedUser }, error: userError } = await supabase.auth.getUser();

             if (userError || !verifiedUser) {
                 console.error(`[AuthDebug] Token verification failed! Potential spoofing attempt or expired token.`);
                 // Token is invalid - clear everything
                 await supabase.auth.signOut();
                 if (mounted) {
                     setSession(null);
                     setUser(null);
                     setLoading(false);
                 }
                 return;
             }

             // If verification passes, verifiedUser is the source of truth.
             // We can mix it with the session if needed, but the user object from session might be tainted.
             // Ideally we reconstruct the session or just trust the verifiedUser for the "user" state.
             
             // However, handleSession expects a session object. 
             // We can keep using the session object but REPLACE the user part with verifiedUser.
             const safeSession = { ...session, user: verifiedUser };
             await handleSession(safeSession);
        } else {
             await handleSession(null);
        }

      } catch (error) {
        console.error(`[AuthDebug] ${new Date().toISOString()} Error initializing session:`, error);
        if (mounted) setLoading(false);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`[AuthDebug] ${new Date().toISOString()} onAuthStateChange event: ${event}`);
      // IGNORE INITIAL_SESSION: It uses potentially spoofed data from LocalStorage.
      // We rely on initSession() (above) to fetch and verify the session from Server.
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'SIGNED_OUT') {
        handleSession(session);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithOtp = async (email: string, captchaToken?: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        captchaToken,
      },
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
