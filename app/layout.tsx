import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
// --- MUDANÇA ---
import { AuthProvider } from '../lib/auth-context';
// --- Fim da Mudança ---

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Chacubatuba Log',
  description: 'Organização de eventos em tempo real',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        {/* --- MUDANÇA --- */}
        {/* Envolvemos todo o app no Provedor de Autenticação */}
        <AuthProvider>{children}</AuthProvider>
        {/* --- Fim da Mudança --- */}
      </body>
    </html>
  );
}

