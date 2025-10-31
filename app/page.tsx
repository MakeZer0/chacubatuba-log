'use client'; 

import { useState } from 'react';
import ItensListaRenderer from '../components/ItensListaRenderer';
import BlocosAnotacoesRenderer from '../components/BlocosAnotacoesRenderer';
import FormularioAddItem from '../components/FormularioAddItem';

// O tipo 'Item' é importado do renderer
type Item = import('../components/ItensListaRenderer').Item;

export default function Page() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshItems, setRefreshItems] = useState(false);

  const handleItemAdded = () => {
    setIsModalOpen(false); // Fecha o modal
    setRefreshItems(prev => !prev); // Dispara o refresh dos itens
  };

  return (
    <>
      {/* ***** MUDANÇA *****
        Removido o 'pb-24' (padding-bottom). Não é mais necessário.
      */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-gray-50 min-h-screen">
        
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            Plano da Chácara
          </h1>
          <p className="mt-2 text-lg text-gray-500">
            Organização em tempo real. Qualquer um pode editar.
          </p>
        </div>

        {/* ***** MUDANÇA *****
          Botão "Adicionar" visível APENAS no mobile (lg:hidden)
          e posicionado ANTES do grid.
        */}
        <div className="mb-6 lg:hidden">
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full inline-flex justify-center rounded-lg border border-transparent bg-blue-600 py-3 px-6 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Adicionar Novo Item
          </button>
        </div>
        {/* ******************* */}


        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          
          {/* Coluna da Esquerda (Itens) */}
          <div className="w-full lg:w-2/3 space-y-8">
            <ItensListaRenderer refreshKey={refreshItems} />
          </div>

          {/* Coluna da Direita (Anotações e Formulário Desktop) */}
          <div className="w-full lg:w-1/g space-y-6">
            
            {/* Formulário Estático para Desktop (hidden lg:block) */}
            <div className="hidden lg:block">
              <FormularioAddItem onSave={handleItemAdded} />
            </div>
            
            <BlocosAnotacoesRenderer />
          </div>

        </div>
      </div>

      {/* ***** MUDANÇA *****
        A Barra Fixa foi REMOVIDA.
      */}

      {/* Modal (Usado apenas pelo botão do mobile) */}
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