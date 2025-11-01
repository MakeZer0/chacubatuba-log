'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase/client';
import type { Item } from './ItensListaRenderer';

type FormularioProps = {
  isModal?: boolean;
  onSave: () => void;
  onClose?: () => void;
  itemParaEditar?: Item | null;
};

const LISTA_RESPONSAVEIS = [
  'Antonio',
  'Beatriz',
  'Baiano',
  'Carol',
  'Costinha',
  'Henrique',
  'Jessica',
  'Juan',
  'Luciana',
  'Mayquel',
  'Nikolinhas',
];

const DATAS_EVENTO = [
  { valor: '', label: 'Sem data' },
  { valor: '2025-11-20', label: 'Quinta (20/Nov)' },
  { valor: '2025-11-21', label: 'Sexta (21/Nov)' },
  { valor: '2025-11-22', label: 'Sábado (22/Nov)' },
  { valor: '2025-11-23', label: 'Domingo (23/Nov)' },
];

const estadoInicial = {
  descricao_item: '',
  responsavel: '',
  categoria: 'Itens Pendentes' as Item['categoria'],
  data_alvo: '',
};

export default function FormularioAddItem({
  isModal = false,
  onSave,
  onClose,
  itemParaEditar,
}: FormularioProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(estadoInicial);

  const isEditMode = !!itemParaEditar;

  useEffect(() => {
    if (isEditMode) {
      setFormData({
        descricao_item: itemParaEditar.descricao_item,
        responsavel: itemParaEditar.responsavel || '',
        categoria: itemParaEditar.categoria,
        data_alvo: itemParaEditar.data_alvo || '',
      });
    } else {
      setFormData((prev) => ({
        ...estadoInicial,
        categoria: prev.categoria,
      }));
    }
  }, [itemParaEditar, isEditMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.descricao_item.trim().length < 3) {
      setError('A descrição deve ter pelo menos 3 caracteres.');
      return;
    }
    setLoading(true);
    setError(null);

    const dataParaSalvar = formData.data_alvo || null;

    if (isEditMode) {
      // --- LÓGICA DE UPDATE ---
      const { error: updateError } = await supabase
        .from('ItensLista')
        .update({
          descricao_item: formData.descricao_item,
          responsavel: formData.responsavel || null,
          categoria: formData.categoria,
          data_alvo: dataParaSalvar,
        })
        .eq('id', itemParaEditar.id);

      if (updateError) {
        console.error('Erro ao atualizar item:', updateError.message);
        setError('Falha ao salvar alterações. Tente novamente.');
        setLoading(false);
        return;
      }
    } else {
      // --- LÓGICA DE INSERT ---
      const { count: currentItemCount, error: countError } = await supabase
        .from('ItensLista')
        .select('*', { count: 'exact', head: true })
        .eq('categoria', formData.categoria);

      if (countError) {
        console.error('Erro ao buscar contagem:', countError);
        setError('Falha ao verificar a ordem. Tente novamente.');
        setLoading(false);
        return;
      }
      
      const newOrder = currentItemCount ?? 0;

      const { error: insertError } = await supabase
        .from('ItensLista')
        .insert({
          descricao_item: formData.descricao_item,
          responsavel: formData.responsavel || null,
          categoria: formData.categoria,
          completo: false,
          ordem_item: newOrder,
          data_alvo: dataParaSalvar,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Erro ao adicionar item:', insertError.message);
        setError('Falha ao adicionar item. Tente novamente.');
        setLoading(false);
        return;
      }
    }

    // Sucesso
    setLoading(false);
    setFormData((prev) => ({
      ...estadoInicial,
      categoria: prev.categoria,
      data_alvo: prev.data_alvo,
    }));
    onSave();
    if (onClose) {
      onClose();
    }
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  
  const handleDataChange = (valor: string) => {
    setFormData((prev) => ({
      ...prev,
      data_alvo: valor,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-800">
          {isEditMode ? 'Editar Item' : 'Adicionar Novo Item'}
        </h3>
        {isModal && (
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            {/* --- MUDANÇA: Ícone de X Corrigido --- */}
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
            {/* --- Fim da Mudança --- */}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
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
            value={formData.descricao_item}
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
          <input
            type="text"
            name="responsavel"
            id="form-responsavel"
            list="lista-responsaveis"
            value={formData.responsavel}
            onChange={handleFormChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm text-gray-900 placeholder-gray-500"
            placeholder="Ex: Maicon"
          />
          <datalist id="lista-responsaveis">
            {LISTA_RESPONSAVEIS.map((nome) => (
              <option key={nome} value={nome} />
            ))}
          </datalist>
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
            value={formData.categoria}
            onChange={handleFormChange}
            disabled={isEditMode}
            className="mt-1 block w-full rounded-md border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
          >
            {/* --- MUDANÇA: Tag </Bebidas> corrigida para </option> --- */}
            <option value="Itens Pendentes">Itens Pendentes</option>
            <option value="Jogos">Jogos</option>
            <option value="Lazer">Lazer</option>
            <option value="Cardápio">Cardápio</option>
            <option value="Snacks">Snacks</option>
            <option value="Bebidas">Bebidas</option>
            <option value="Limpeza">Limpeza</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data do Evento (Opcional)
          </label>
          <div className="flex flex-wrap gap-2">
            {DATAS_EVENTO.map((data) => (
              <button
                type="button"
                key={data.valor}
                onClick={() => handleDataChange(data.valor)}
                className={`flex-auto justify-center text-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  formData.data_alvo === data.valor
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                }`}
              >
                {data.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 md:col-span-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex justify-center rounded-lg border border-transparent bg-emerald-600 py-2 px-6 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:bg-gray-300"
          >
            {loading
              ? 'Salvando...'
              : isEditMode
              ? 'Salvar Alterações'
              : 'Adicionar'}
          </button>
        </div>
      </div>
    </form>
  );
}

