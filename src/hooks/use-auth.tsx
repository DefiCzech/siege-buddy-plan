import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session, AuthenticatorAssuranceLevels } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  needsMfa: boolean;
  mfaVerified: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsMfa, setNeedsMfa] = useState(false);

  const checkMfa = async () => {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (!error && data) {
      setNeedsMfa(data.nextLevel === "aal2" && data.currentLevel !== "aal2");
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        setTimeout(checkMfa, 0);
      } else {
        setNeedsMfa(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        checkMfa();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const mfaVerified = () => {
    setNeedsMfa(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setNeedsMfa(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, needsMfa, mfaVerified, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
