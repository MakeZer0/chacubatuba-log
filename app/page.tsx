'use client'; 

import { useState } from 'react';
import ItensListaRenderer from '../components/ItensListaRenderer';
import BlocosAnotacoesRenderer from '../components/BlocosAnotacoesRenderer';
// ***** MUDANÇA *****
// Importa o novo componente de formulário
import FormularioAddItem from '../components/FormularioAddItem';

export default function Page() {
  // O estado do modal AINDA é controlado aqui
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // O estado de 'refresh' AINDA é controlado aqui
  const [refreshItems, setRefreshItems] = useState(false);

  // ***** MUDANÇA *****
  // Toda a lógica de 'novoItem', 'loading', 'error', 'handleAddItem'
  // foi MOVIDA para o componente FormularioAddItem.tsx

  // Esta função é passada para o formulário.
  // Quando um item é salvo, o formulário chama isso.
  const handleItemAdded = () => {
    setIsModalOpen(false); // Fecha o modal (se estiver aberto)
    setRefreshItems(prev => !prev); // Dispara o refresh dos itens
  };

  return (
    <>
      {/* Adicionado 'pb-24' (padding-bottom) para dar espaço para a barra fixa no mobile */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-gray-50 min-h-screen pb-24">
        
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            Plano da Chácara
          </h1>
          <p className="mt-2 text-lg text-gray-500">
            Organização em tempo real. Qualquer um pode editar.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          
          {/* Coluna da Esquerda (Itens) */}
          <div className="w-full lg:w-2/3 space-y-8">
            <ItensListaRenderer refreshKey={refreshItems} />
          </div>

          {/* Coluna da Direita (Anotações e Formulário Desktop) */}
          <div className="w-full lg:w-1/3 space-y-6">
            
            {/* ***** MUDANÇA *****
              Renderiza o NOVO formulário estático (só para desktop)
            */}
            <div className="hidden lg:block">
              <FormularioAddItem onSave={handleItemAdded} />
            </div>
            
            <BlocosAnotacoesRenderer />
          </div>

        </div>
      </div>

      {/* Barra de Ação Fixa para Mobile (lg:hidden) */}
      <div className="block lg:hidden fixed bottom-0 left-0 w-full z-50 bg-white border-t border-gray-200 shadow-lg p-3">
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
            {/* ***** MUDANÇA *****
              Renderiza o NOVO formulário em modo modal
            */}
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