import { createClient } from '@supabase/supabase-js';

// NOTA: Para este cliente (usado no browser), SÓ usamos variáveis de ambiente
// prefixadas com NEXT_PUBLIC_.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY não encontradas.');
}

// Criamos um cliente singleton para ser usado em qualquer Client Component
// Este cliente usará a chave 'anon' pública e respeitará as políticas de RLS.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
