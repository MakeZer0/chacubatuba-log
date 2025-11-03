'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  ArrowLeftOnRectangleIcon,
  Cog6ToothIcon,
  UserCircleIcon,
  PlusCircleIcon,
} from '@heroicons/react/24/outline';
// --- MUDANÇA: Importar Image ---
import Image from 'next/image';
// --- Fim da Mudança ---
import ItensListaRenderer, { Item } from '@/components/ItensListaRenderer';
import BlocosAnotacoesRenderer from '@/components/BlocosAnotacoesRenderer';
import ItinerarioRenderer from '@/components/ItinerarioRenderer';
import DashboardRenderer from '@/components/DashboardRenderer';
import ItemDetalhesModal from '@/components/ItemDetalhesModal';
import { Toaster } from 'react-hot-toast';

type ViewMode = 'categoria' | 'itinerario' | 'dashboard';

function LoginPage({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="p-8 bg-white rounded-2xl shadow-xl max-w-sm w-full text-center">
        {/* --- MUDANÇA: Logo no Login --- */}
        <Image
          src="/logo.png"
          alt="Chacubatuba Log Logo"
          width={250}
          height={100} // Ajuste a altura conforme necessário
          className="mx-auto mb-6"
          priority // Carrega o logo rapidamente
        />
        {/* --- Fim da Mudança --- */}
        <p className="text-gray-500 mb-8">
          Faça login para organizar o evento com a galera.
        </p>
        <button
          onClick={onLogin}
          className="w-full inline-flex justify-center items-center rounded-lg border border-transparent bg-emerald-600 py-3 px-6 text-base font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors"
        >
          <svg
            className="w-5 h-5 mr-3"
            role="img"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
          >
            <title>Google</title>
            <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.08-2.6 2.13-4.8 2.13-3.87 0-7.02-3.18-7.02-7.1S8.6 6.02 12.48 6.02c2.04 0 3.5.83 4.32 1.62l2.35-2.3C17.65 3.98 15.3 3 12.48 3 7.02 3 3 7.02 3 12.48s4.02 9.48 9.48 9.48c2.9 0 5.1-1 6.8-2.76 1.76-1.8 2.6-4.3 2.6-6.8v-.48H12.48z" />
          </svg>
          Entrar com Google
        </button>
      </div>
    </div>
  );
}

export default function Page() {
  const { user, signInWithGoogle, signOut } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('categoria');
  const [itemModal, setItemModal] = useState<Item | 'novo' | null>(null);
  const [modalTab, setModalTab] = useState<'detalhes' | 'comentarios'>(
    'detalhes'
  );

  // Pula o Login no Modo de Desenvolvimento
  if (!user && process.env.NODE_ENV !== 'development') {
    return <LoginPage onLogin={signInWithGoogle} />;
  }

  const handleOpenEditModal = (item: Item) => {
    setItemModal(item);
    setModalTab('detalhes');
  };

  const handleOpenCommentsModal = (item: Item) => {
    setItemModal(item);
    setModalTab('comentarios');
  };

  const handleOpenAddModal = () => {
    setItemModal('novo');
    setModalTab('detalhes');
  };

  const handleCloseModal = () => {
    setItemModal(null);
  };

  const getBoasVindas = () => {
    if (user?.user_metadata?.name) {
      return `Olá, ${user.user_metadata.name.split(' ')[0]}!`;
    }
    return 'Bem-vindo(a)!';
  };

  return (
    <>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-gray-50 min-h-screen pb-24">
        {/* --- MUDANÇA: Logo no Cabeçalho --- */}
        <div className="text-center mb-4">
          <Image
            src="/logo.png"
            alt="Chacubatuba Log Logo"
            width={300} // Pode ajustar o tamanho
            height={120} // Ajuste a altura
            className="mx-auto mb-2"
            priority
          />
          <p className="mt-2 text-lg text-gray-500">
            {getBoasVindas()} Organização em tempo real.
          </p>
        </div>
        {/* --- Fim da Mudança --- */}

        {user && (
          <div className="flex justify-center mb-10">
            <button
              onClick={signOut}
              className="inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              <ArrowLeftOnRectangleIcon className="h-5 w-5 mr-1.5 text-gray-500" />
              Sair
            </button>
          </div>
        )}

        <div className="w-full max-w-md mx-auto mb-10">
          <div className="flex p-1 bg-gray-200 rounded-xl">
            <button
              onClick={() => setViewMode('categoria')}
              className={`w-1/3 rounded-lg py-2 text-sm font-medium transition-colors ${
                viewMode === 'categoria'
                  ? 'bg-white text-emerald-700 shadow'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Por Categoria
            </button>
            <button
              onClick={() => setViewMode('itinerario')}
              className={`w-1/3 rounded-lg py-2 text-sm font-medium transition-colors ${
                viewMode === 'itinerario'
                  ? 'bg-white text-emerald-700 shadow'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Por Itinerário
            </button>
            <button
              onClick={() => setViewMode('dashboard')}
              className={`w-1/3 rounded-lg py-2 text-sm font-medium transition-colors ${
                viewMode === 'dashboard'
                  ? 'bg-white text-emerald-700 shadow'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Dashboard
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          <div className="w-full lg:w-2/3">
            {viewMode === 'categoria' && (
              <ItensListaRenderer
                onEditItemClick={handleOpenEditModal}
                onCommentItemClick={handleOpenCommentsModal}
              />
            )}
            {viewMode === 'itinerario' && (
              <ItinerarioRenderer
                onEditItemClick={handleOpenEditModal}
                onCommentItemClick={handleOpenCommentsModal}
              />
            )}
            {viewMode === 'dashboard' && <DashboardRenderer />}
          </div>

          <div className="w-full lg:w-1/3 space-y-6">
            <div className="hidden lg:block">
              <button
                onClick={handleOpenAddModal}
                className="w-full flex items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white p-6 text-base font-medium text-gray-500 hover:border-emerald-500 hover:text-emerald-600 transition-colors"
              >
                <PlusCircleIcon className="h-6 w-6 mr-2" />
                Adicionar Novo Item
              </button>
            </div>

            <BlocosAnotacoesRenderer />
          </div>
        </div>
      </div>

      <div className="block lg:hidden fixed bottom-0 left-0 w-full z-40 bg-white border-t border-gray-200 shadow-lg p-3">
        <button
          onClick={handleOpenAddModal}
          className="w-full inline-flex justify-center rounded-lg border border-transparent bg-emerald-600 py-3 px-6 text-base font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
          Adicionar Novo Item
        </button>
      </div>

      {itemModal !== null && (
        <ItemDetalhesModal
          item={itemModal}
          isOpen={itemModal !== null}
          onClose={handleCloseModal}
          initialTab={modalTab}
        />
      )}
    </>
  );
}

