'use client';

import { useState } from 'react';
import ItensListaRenderer from '../components/ItensListaRenderer';
import BlocosAnotacoesRenderer from '../components/BlocosAnotacoesRenderer';
import FormularioAddItem from '../components/FormularioAddItem';

export default function Page() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- MUDANÇA: 'refreshItems' e 'setRefreshItems' removidos ---
  // As subscriptions do Supabase cuidam disso agora.

  const handleItemAdded = () => {
    // A única responsabilidade agora é fechar o modal.
    setIsModalOpen(false);
    // --- MUDANÇA: 'setRefreshItems' removido ---
  };

  return (
    <>
      {/* O padding-bottom 'pb-24' é crucial para a barra fixa no mobile */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-gray-50 min-h-screen pb-24">
        {/* --- Branding Atualizado --- */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            Chacubatuba Log
          </h1>
          <p className="mt-2 text-lg text-gray-500">
            Organização em tempo real. Qualquer um pode editar.
          </p>
        </div>
        {/* --- Fim da Mudança --- */}

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* Coluna da Esquerda (Itens) */}
          <div className="w-full lg:w-2/3">
            {/* --- MUDANÇA: 'refreshKey' prop removida --- */}
            <ItensListaRenderer />
          </div>

          {/* Coluna da Direita (Anotações e Formulário Desktop) */}
          <div className="w-full lg:w-1/3 space-y-6">
            {/* Formulário estático (só para desktop) */}
            <div className="hidden lg:block">
              <FormularioAddItem onSave={handleItemAdded} />
            </div>

            {/* --- MUDANÇA: 'refreshKey' prop removida (indiretamente) --- */}
            <BlocosAnotacoesRenderer />
          </div>
        </div>
      </div>

      {/* Barra de Ação Fixa para Mobile (lg:hidden) */}
      <div className="block lg:hidden fixed bottom-0 left-0 w-full z-40 bg-white border-t border-gray-200 shadow-lg p-3">
        <button
          onClick={() => setIsModalOpen(true)}
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
      {/* --- Fim da Mudança --- */}

      {/* Modal (Usado apenas pela Barra Fixa no mobile) */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <FormularioAddItem
              isModal={true}
              onSave={handleItemAdded}
              onClose={() => setIsModalOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}

