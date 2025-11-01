'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabase/client';
import type { Item } from './ItensListaRenderer'; // Importa o tipo do outro componente

type FormularioProps = {
  isModal?: boolean;
  onSave: () => void;
  onClose?: () => void;
};

// --- MUDANÇA: Lista de responsáveis para auto-preenchimento ---
const LISTA_RESPONSAVEIS = [
  'Maicon',
  'Juiz',
  'Gabriel',
  'Tonin',
  'Nikola',
  'Jj',
  'Joao',
  'Cel',
  'Pendas',
  'Marcola',
  'EUGIN',
  'Cidao',
  'Tonho',
  // Adicione mais nomes aqui
];
// --- Fim da Mudança ---

export default function FormularioAddItem({
  isModal = false,
  onSave,
  onClose,
}: FormularioProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [novoItem, setNovoItem] = useState({
    descricao_item: '',
    responsavel: '',
    categoria: 'Itens Pendentes' as Item['categoria'],
  });

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novoItem.descricao_item.trim().length < 3) {
      setError('A descrição deve ter pelo menos 3 caracteres.');
      return;
    }
    setLoading(true);
    setError(null);
    console.log('Enviando para o Supabase:', { ...novoItem, completo: false });

    // --- MUDANÇA: Correção na lógica de contagem ---
    // Pedimos ao Supabase apenas a contagem (count), não os dados (data)
    const { count: currentItemCount, error: countError } = await supabase
      .from('ItensLista')
      .select('*', { count: 'exact', head: true }) // Usa '*' ou 'id' com head: true
      .eq('categoria', novoItem.categoria);

    if (countError) {
      console.error('Erro ao buscar contagem:', countError);
      setError('Falha ao verificar a ordem. Tente novamente.');
      setLoading(false);
      return;
    }

    // Usamos a contagem (count) diretamente, que pode ser 0 ou null
    const newOrder = currentItemCount ?? 0;
    // --- Fim da Mudança ---

    const { error: insertError } = await supabase
      .from('ItensLista')
      .insert({
        descricao_item: novoItem.descricao_item,
        responsavel: novoItem.responsavel || null,
        categoria: novoItem.categoria,
        completo: false,
        ordem_item: newOrder, // <-- Agora usa a contagem correta
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao adicionar item:', insertError.message);
      setError('Falha ao adicionar item. Tente novamente.');
      setLoading(false);
      return;
    }

    setLoading(false);
    setNovoItem({
      descricao_item: '',
      responsavel: '',
      categoria: novoItem.categoria, // Mantém a categoria para facilitar
    });
    onSave(); // Esta função agora SÓ fecha o modal
    if (onClose) {
      onClose();
    }
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setNovoItem((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <form onSubmit={handleAddItem} className="bg-white p-6 rounded-xl shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-800">Adicionar Novo Item</h3>
        {isModal && (
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {error && (
        <div
          className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm"
          onClick={() => setError(null)}
        >
          {error} (Clique para fechar)
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label
            htmlFor="form-descricao"
            className="block text-sm font-medium text-gray-700"
          >
            Descrição
          </label>
          <input
            type="text"
            name="descricao_item"
            id="form-descricao"
            value={novoItem.descricao_item}
            onChange={handleFormChange}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm text-gray-900 placeholder-gray-500"
            placeholder="Ex: Comprar carvão"
            autoFocus={isModal}
          />
        </div>
        <div>
          <label
            htmlFor="form-responsavel"
            className="block text-sm font-medium text-gray-700"
          >
            Responsável (Opcional)
          </label>
          {/* --- MUDANÇA: Datalist para auto-preenchimento --- */}
          <input
            type="text"
            name="responsavel"
            id="form-responsavel"
            list="lista-responsaveis" // Conecta ao datalist
            value={novoItem.responsavel}
            onChange={handleFormChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm text-gray-900 placeholder-gray-500"
            placeholder="Ex: Maicon"
          />
          <datalist id="lista-responsaveis">
            {LISTA_RESPONSAVEIS.map((nome) => (
              <option key={nome} value={nome} />
            ))}
          </datalist>
          {/* --- Fim da Mudança --- */}
        </div>
        <div>
          <label
            htmlFor="form-categoria"
            className="block text-sm font-medium text-gray-700"
          >
            Categoria
          </label>
          <select
            name="categoria"
            id="form-categoria"
            value={novoItem.categoria}
            onChange={handleFormChange}
            className="mt-1 block w-full rounded-md border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm text-gray-900"
          >
            <option value="Itens Pendentes">Itens Pendentes</option>
            <option value="Jogos">Jogos</option>
            <option value="Lazer">Lazer</option>
            <option value="Cardápio">Cardápio</option>
            <option value="Snacks">Snacks</option>
            <option value="Bebidas">Bebidas</option>
            <option value="Limpeza">Limpeza</option>
          </select>
        </div>

        <div className="mt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex justify-center rounded-lg border border-transparent bg-emerald-600 py-2 px-6 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:bg-gray-300"
          >
            {loading ? 'Adicionando...' : 'Adicionar'}
          </button>
        </div>
      </div>
    </form>
  );
}

