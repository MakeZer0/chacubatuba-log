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

  // URL de redirecionamento fixa
  const getRedirectURL = () => {
    let url =
      process?.env?.NEXT_PUBLIC_SITE_URL ?? // Vercel (definir esta env var!)
      process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Vercel preview
      'http://localhost:3000/';
    // Garante que termina com /
    url = url.includes('http') ? url : `https://${url}`;
    url = url.charAt(url.length - 1) === '/' ? url : `${url}/`;
    
    // Para o Codespaces, precisamos de uma URL específica se estivermos lá
    if (process.env.CODESPACE_NAME) {
      return `https://${process.env.CODESPACE_NAME}-${process.env.CODESPACE_PORT_FORWARDING_DOMAIN}/auth/v1/callback`;
    }

    // Para Vercel e Localhost, usamos a URL do site principal
    // (O callback do Supabase tratará disso)
    // Apenas retornamos a URL do site.
    // A correção real é usar a URL de produção na config do Supabase.
    // Mas para o `signIn`, precisamos da URL exata do deploy.
    
    // A lógica anterior estava um pouco confusa. Vamos simplificar.
    // A URL de redirecionamento DEVE ser a URL de produção.
    // O `window.location.origin` só funciona se o dev (localhost)
    // também estiver nas URLs permitidas no Google Cloud.
    
    // Vamos usar a URL de produção fixa.
    // Certifique-se de que `NEXT_PUBLIC_SITE_URL` está definida no Vercel
    // como `https://chacubatuba-log.vercel.app`
    
    // A melhor lógica é deixar o Supabase usar o que está em "Site URL"
    // E no Google Cloud, ter:
    // 1. http://localhost:3000/auth/v1/callback (para dev)
    // 2. https://chacubatuba-log.vercel.app/auth/v1/callback (para prod)
    
    // Se estivermos no cliente, window.location.origin é o mais seguro
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }

    // Fallback (usado no lado do servidor, se necessário)
    return 'https://chacubatuba-log.vercel.app';
  };
  
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
        //redirectTo: getRedirectURL(), // Usar a URL do Supabase Auth Config
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

