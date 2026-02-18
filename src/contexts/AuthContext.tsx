import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabaseExternal } from '@/lib/supabaseExternal';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  sessionExpired: boolean;
  clearSessionExpired: () => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabaseExternal.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' && user && !session) {
          // User had a session that expired/was revoked
          setSessionExpired(true);
        }
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabaseExternal.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabaseExternal.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };




  const clearSessionExpired = () => setSessionExpired(false);

  const signOut = async () => {
    setSessionExpired(false);
    await supabaseExternal.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, sessionExpired, clearSessionExpired, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
