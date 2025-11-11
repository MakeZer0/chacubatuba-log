'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase/client';
import type { User, Session } from '@supabase/supabase-js';
// --- MUDANÇA: Importar toast ---
import toast from 'react-hot-toast';
// --- Fim da Mudança ---

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const getBaseSiteUrl = () => {
    const envUrl =
      process?.env?.NEXT_PUBLIC_SITE_URL ??
      process?.env?.NEXT_PUBLIC_VERCEL_URL ??
      null;

    const normalize = (value: string) => {
      const withProtocol = value.startsWith('http') ? value : `https://${value}`;
      return withProtocol.endsWith('/') ? withProtocol.slice(0, -1) : withProtocol;
    };

    if (envUrl) {
      return normalize(envUrl);
    }

    if (typeof window !== 'undefined') {
      return window.location.origin;
    }

    return 'http://localhost:3000';
  };

  const getRedirectURL = () => `${getBaseSiteUrl()}/auth/v1/callback`;
  
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // --- MUDANÇA: Toast de boas-vindas ---
        if (event === 'SIGNED_IN') {
          const name = session?.user?.user_metadata?.name?.split(' ')[0] || '';
          toast.success(`Bem-vindo(a), ${name}!`);
        }
        // --- Fim da Mudança ---
      }
    );

    // Pega a sessão inicial (caso a página recarregue)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getRedirectURL(),
      },
    });
    // --- MUDANÇA: Toast de Erro ---
    if (error) {
      console.error('Erro ao fazer login:', error);
      toast.error('Erro ao tentar fazer login com Google.');
    }
    // --- Fim da Mudança ---
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    // --- MUDANÇA: Toasts de Logout ---
    if (error) {
      console.error('Erro ao fazer logout:', error);
      toast.error('Erro ao tentar sair.');
    } else {
      toast.success('Você saiu com sucesso!');
    }
    // --- Fim da Mudança ---
  };

  const value = {
    session,
    user,
    loading,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

