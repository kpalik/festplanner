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
    const fetchUserRole = async (userId: string) => {
        try {
            const { data, error } = await supabase.from('profiles').select('role').eq('id', userId).single();
            if (error) {
                console.warn('Error fetching user role:', error);
                return null;
            }
            return (data as any)?.role;
        } catch (e) {
            console.error('Exception fetching role:', e);
            return null;
        }
    };

    const initSession = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            let currentUser = session?.user ?? null;
            if (currentUser) {
                const role = await fetchUserRole(currentUser.id);
                if (role) currentUser = { ...currentUser, role };
            }
            setUser(currentUser as User);
        } catch (error) {
            console.error('Error initializing session:', error);
        } finally {
            setLoading(false);
        }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
          setSession(session);
          let currentUser = session?.user ?? null;
          if (currentUser) {
             const role = await fetchUserRole(currentUser.id);
             if (role) currentUser = { ...currentUser, role };
          }
          setUser(currentUser as User);
      } catch (e) {
         console.error('Error in auth state change:', e);
      } finally {
          setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
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
