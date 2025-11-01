'use client';

import { useState } from 'react';
import ItensListaRenderer, {
  Item,
} from '../components/ItensListaRenderer';
import BlocosAnotacoesRenderer from '../components/BlocosAnotacoesRenderer';
import FormularioAddItem from '../components/FormularioAddItem';
// --- MUDANÇA: Imports do Dashboard ---
import ItinerarioRenderer from '../components/ItinerarioRenderer';
import DashboardRenderer from '../components/DashboardRenderer'; // Novo
import {
  ListBulletIcon,
  CalendarDaysIcon,
  ChartPieIcon, // Novo
} from '@heroicons/react/24/outline';
// --- Fim da Mudança ---

// --- MUDANÇA: Adiciona 'dashboard' ---
type ViewMode = 'listas' | 'itinerario' | 'dashboard';
// --- Fim da Mudança ---

export default function Page() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemParaEditar, setItemParaEditar] = useState<Item | null>(null);
  const [view, setView] = useState<ViewMode>('listas');

  const handleFormSave = () => {
    setIsModalOpen(false);
    setItemParaEditar(null);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setItemParaEditar(null);
  };

  const handleOpenEditModal = (item: Item) => {
    setItemParaEditar(item);
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-gray-50 min-h-screen pb-24">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            Chacubatuba Log
          </h1>
          <p className="mt-2 text-lg text-gray-500">
            Organização em tempo real. Qualquer um pode editar.
          </p>
        </div>

        {/* --- MUDANÇA: Seletor de Visualização com Dashboard --- */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center rounded-lg bg-gray-200 p-1 space-x-1">
            <button
              onClick={() => setView('listas')}
              className={`flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                view === 'listas'
                  ? 'bg-white text-emerald-700 shadow'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ListBulletIcon className="h-5 w-5 mr-2" />
              Por Categoria
            </button>
            <button
              onClick={() => setView('itinerario')}
              className={`flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                view === 'itinerario'
                  ? 'bg-white text-emerald-700 shadow'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <CalendarDaysIcon className="h-5 w-5 mr-2" />
              Por Itinerário
            </button>
            {/* Botão Novo */}
            <button
              onClick={() => setView('dashboard')}
              className={`flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                view === 'dashboard'
                  ? 'bg-white text-emerald-700 shadow'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ChartPieIcon className="h-5 w-5 mr-2" />
              Dashboard
            </button>
          </div>
        </div>
        {/* --- Fim da Mudança --- */}

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* Coluna da Esquerda (Conteúdo Dinâmico) */}
          <div className="w-full lg:w-2/3">
            {/* --- MUDANÇA: Renderização Condicional da View --- */}
            {view === 'listas' ? (
              <ItensListaRenderer onEditItemClick={handleOpenEditModal} />
            ) : view === 'itinerario' ? (
              <ItinerarioRenderer onEditItemClick={handleOpenEditModal} />
            ) : (
              <DashboardRenderer />
            )}
            {/* --- Fim da Mudança --- */}
          </div>

          {/* Coluna da Direita (Anotações e Formulário Desktop) */}
          <div className="w-full lg:w-1/3 space-y-6">
            <div className="hidden lg:block">
              {/* No modo dashboard, o form desktop não precisa editar */}
              <FormularioAddItem
                itemParaEditar={null}
                onSave={handleFormSave}
              />
            </div>
            <BlocosAnotacoesRenderer />
          </div>
        </div>
      </div>

      {/* Barra de Ação Fixa para Mobile (lg:hidden) */}
      <div className="block lg:hidden fixed bottom-0 left-0 w-full z-40 bg-white border-t border-gray-200 shadow-lg p-3">
        <button
          onClick={() => {
            setItemParaEditar(null);
            setIsModalOpen(true);
          }}
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

      {/* Modal (Adicionar/Editar) */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          onClick={handleModalClose}
        >
          <div
            className="w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <FormularioAddItem
              isModal={true}
              itemParaEditar={itemParaEditar}
              onSave={handleFormSave}
              onClose={handleModalClose}
            />
          </div>
        </div>
      )}
    </>
  );
}

