'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { supabase } from './supabase/client';
import { User, Session } from '@supabase/supabase-js';

// Definir o tipo para o nosso contexto
type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

// Criar o contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Criar o Provedor (Provider)
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Efeito para carregar os dados da sessão
  useEffect(() => {
    // 1. Tenta pegar a sessão ativa quando o app carrega
    const getSession = async () => {
      setLoading(true);
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Erro ao buscar sessão:', error);
      } else {
        setSession(data.session);
        setUser(data.session?.user ?? null);
      }
      setLoading(false);
    };

    getSession();

    // 2. Ouve por mudanças no estado de autenticação (Login, Logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // 3. Cleanup
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Função de Login com Google
  const signInWithGoogle = async () => {
    // --- MUDANÇA: URL Fixa ---
    // Usamos a URL de produção da Vercel para garantir que o
    // redirecionamento funcione tanto no dev (Codespaces) quanto na Vercel.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'https://chacubatuba-log.vercel.app',
      },
    });
    // --- Fim da Mudança ---

    if (error) {
      console.error('Erro ao fazer login com Google:', error);
    }
  };

  // Função de Logout
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  // O valor que será passado para os componentes "filhos"
  const value = {
    user,
    session,
    loading,
    signInWithGoogle,
    signOut,
  };

  // Não renderiza nada até que a sessão inicial seja carregada
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// Hook customizado para consumir o contexto
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}

