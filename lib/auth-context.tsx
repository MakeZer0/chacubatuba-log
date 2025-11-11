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

const buildDevUser = (): User => {
  const timestamp = new Date().toISOString();

  return {
    id: 'dev-user',
    email: 'dev@localhost',
    app_metadata: { provider: 'dev', providers: ['dev'] },
    user_metadata: { name: 'Dev User' },
    aud: 'authenticated',
    created_at: timestamp,
    last_sign_in_at: timestamp,
    role: 'authenticated',
    identities: [],
    factors: [],
    phone: null,
    confirmation_sent_at: null,
    recovery_sent_at: null,
    email_change_sent_at: null,
    new_email: null,
    new_phone: null,
    phone_change_sent_at: null,
    confirmed_at: null,
    email_confirmed_at: null,
    invited_at: null,
    updated_at: timestamp,
  } as unknown as User;
};

const buildDevSession = (devUser: User): Session =>
  ({
    access_token: 'dev-access-token',
    refresh_token: 'dev-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: devUser,
  } as unknown as Session);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const devUser = isDevelopment ? buildDevUser() : null;

  const [session, setSession] = useState<Session | null>(() =>
    isDevelopment && devUser ? buildDevSession(devUser) : null
  );
  const [user, setUser] = useState<User | null>(() =>
    isDevelopment ? devUser : null
  );
  const [loading, setLoading] = useState(!isDevelopment);

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
    if (isDevelopment) {
      return;
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);

        // --- MUDANÇA: Toast de boas-vindas ---
        if (event === 'SIGNED_IN') {
          const name = currentSession?.user?.user_metadata?.name?.split(' ')[0] || '';
          toast.success(`Bem-vindo(a), ${name}!`);
        }
        // --- Fim da Mudança ---
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [isDevelopment]);

  const signInWithGoogle = async () => {
    if (isDevelopment) {
      toast.success('Login simulado no ambiente de desenvolvimento.');
      return;
    }

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
    if (isDevelopment) {
      toast.success('Logout simulado no ambiente de desenvolvimento.');
      return;
    }

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

