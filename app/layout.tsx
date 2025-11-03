import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

// (A Metadata pode ser mais simples agora, pois o manifest cuida disso)
export const metadata: Metadata = {
  title: 'Chacubatuba Log',
  description: 'Organização em tempo real para o evento.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        {/* --- MUDANÇAS DO PWA --- */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#10B981" />
        {/* Ícone para iOS */}
        <link
          rel="apple-touch-icon"
          href="https://placehold.co/192x192/10B981/ffffff?text=CL"
        />
        {/* --- Fim da Mudança --- */}
      </head>
      <body className={inter.className}>
        <AuthProvider>
          {/* Container para os Toasts */}
          <Toaster
            position="bottom-center"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#333',
                color: '#fff',
              },
            }}
          />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

