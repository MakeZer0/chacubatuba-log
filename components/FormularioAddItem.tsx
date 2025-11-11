'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Item } from './ItensListaRenderer'; // Importa o tipo
import {
  CARDAPIO_SUBCATEGORIES,
  type CardapioSubcategoria,
} from './ItensListaRenderer';
// --- MUDANÇA: Importar toast ---
import toast from 'react-hot-toast';
// --- Fim da Mudança ---

// Lista de Responsáveis (Auto-preenchimento)
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

// Lista de Datas do Evento
const DATAS_EVENTO = [
  { valor: '2025-11-20', nome: 'Quinta (20/Nov)' },
  { valor: '2025-11-21', nome: 'Sexta (21/Nov)' },
  { valor: '2025-11-22', nome: 'Sábado (22/Nov)' },
  { valor: '2025-11-23', nome: 'Domingo (23/Nov)' },
];

const EVENT_DATE_ORDER = DATAS_EVENTO.map((registro) => registro.valor);

const ordenarDatasSelecionadas = (datas: string[]): string[] =>
  datas
    .slice()
    .sort((a, b) => {
      const idxA = EVENT_DATE_ORDER.indexOf(a);
      const idxB = EVENT_DATE_ORDER.indexOf(b);

      if (idxA === -1 && idxB === -1) {
        return a.localeCompare(b);
      }
      if (idxA === -1) {
        return 1;
      }
      if (idxB === -1) {
        return -1;
      }
      return idxA - idxB;
    });

type FormState = {
  descricao_item: string;
  responsavel: string;
  categoria: Item['categoria'];
  data_alvo: string[];
  subcategoria_cardapio: CardapioSubcategoria;
};

type FormularioProps = {
  isModal?: boolean;
  onSave: () => void;
  onClose?: () => void;
  itemParaEditar?: Item | null; // Recebe o item para editar
};

// Estado inicial do formulário
const estadoInicial: FormState = {
  descricao_item: '',
  responsavel: '',
  categoria: 'Itens Pendentes',
  data_alvo: [],
  subcategoria_cardapio: CARDAPIO_SUBCATEGORIES[0],
};

export default function FormularioAddItem({
  isModal = false,
  onSave,
  onClose,
  itemParaEditar,
}: FormularioProps) {
  const [formData, setFormData] = useState<FormState>(estadoInicial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!itemParaEditar; // Estamos em modo de edição?

  // Efeito para preencher o formulário quando 'itemParaEditar' muda
  useEffect(() => {
    if (itemParaEditar) {
      // Estamos editando
      const datas = Array.isArray(itemParaEditar.data_alvo)
        ? itemParaEditar.data_alvo
        : typeof itemParaEditar.data_alvo === 'string'
        ? itemParaEditar.data_alvo
            .split(/[,;|]/)
            .map((valor) => valor.trim())
            .filter((valor) => valor.length > 0)
        : [];

      setFormData({
        descricao_item: itemParaEditar.descricao_item || '',
        responsavel: itemParaEditar.responsavel || '',
        categoria: itemParaEditar.categoria || 'Itens Pendentes',
        data_alvo: ordenarDatasSelecionadas(datas),
        subcategoria_cardapio:
          itemParaEditar.subcategoria_cardapio &&
          CARDAPIO_SUBCATEGORIES.includes(itemParaEditar.subcategoria_cardapio)
            ? (itemParaEditar.subcategoria_cardapio as CardapioSubcategoria)
            : CARDAPIO_SUBCATEGORIES[0],
      });
    } else {
      // Estamos adicionando
      setFormData(estadoInicial);
    }
    // --- MUDANÇA: 'isOpen' removido das dependências ---
  }, [itemParaEditar]);
  // --- Fim da Mudança ---

  const handleFormChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      if (name === 'categoria') {
        const novaCategoria = value as Item['categoria'];
        return {
          ...prev,
          categoria: novaCategoria,
          subcategoria_cardapio:
            novaCategoria === 'Cardápio'
              ? prev.subcategoria_cardapio ?? CARDAPIO_SUBCATEGORIES[0]
              : CARDAPIO_SUBCATEGORIES[0],
        };
      }

      if (name === 'subcategoria_cardapio') {
        return {
          ...prev,
          subcategoria_cardapio: value as CardapioSubcategoria,
        };
      }

      return { ...prev, [name]: value };
    });
  };

  const handleDateToggle = (date: string) => {
    setFormData((prev) => {
      if (date === 'clear') {
        return { ...prev, data_alvo: [] };
      }

      const alreadySelected = prev.data_alvo.includes(date);
      const updatedDates = alreadySelected
        ? prev.data_alvo.filter((valor) => valor !== date)
        : [...prev.data_alvo, date];

      return { ...prev, data_alvo: ordenarDatasSelecionadas(updatedDates) };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.descricao_item.trim().length < 3) {
      setError('A descrição deve ter pelo menos 3 caracteres.');
      return;
    }
    setLoading(true);
    setError(null);

    // --- MUDANÇA: Toasts ---
    const toastId = toast.loading(
      isEditMode ? 'A atualizar item...' : 'A adicionar item...'
    );
    // --- Fim da Mudança ---

    // Prepara o objeto de dados (comum para insert e update)
    const datasPersistidas = ordenarDatasSelecionadas(formData.data_alvo);

    const dadosItem = {
      descricao_item: formData.descricao_item.trim(),
      responsavel: formData.responsavel.trim() || null, // Garante null se vazio
      categoria: formData.categoria,
      data_alvo: datasPersistidas.length === 0 ? null : datasPersistidas,
      subcategoria_cardapio:
        formData.categoria === 'Cardápio'
          ? formData.subcategoria_cardapio
          : null,
    };

    if (isEditMode) {
      // --- LÓGICA DE UPDATE ---
      const { error: updateError } = await supabase
        .from('ItensLista')
        .update(dadosItem)
        .match({ id: itemParaEditar.id });

      if (updateError) {
        console.error('Erro ao atualizar item:', updateError);
        setError(updateError.message);
        toast.error('Falha ao atualizar o item.', { id: toastId });
      } else {
        toast.success('Item atualizado!', { id: toastId });
        onSave(); // Fecha o modal e avisa o pai (que vai recarregar)
      }
    } else {
      // --- LÓGICA DE INSERT ---
      // 1. Obter a contagem de itens para definir a ordem
      const { count: currentItemCount, error: countError } = await supabase
        .from('ItensLista')
        .select('*', { count: 'exact', head: true })
        .eq('categoria', formData.categoria);

      if (countError) {
        console.error('Erro ao buscar contagem:', countError);
        setError(countError.message);
        toast.error('Falha ao definir a ordem do item.', { id: toastId });
        setLoading(false);
        return;
      }

      const newOrder = currentItemCount ?? 0;

      // 2. Inserir o novo item com a ordem correta
      const { error: insertError } = await supabase
        .from('ItensLista')
        .insert({
          ...dadosItem,
          ordem_item: newOrder,
        });

      if (insertError) {
        console.error('Erro ao adicionar item:', insertError);
        setError(insertError.message);
        toast.error('Falha ao adicionar o item.', { id: toastId });
      } else {
        toast.success('Item adicionado!', { id: toastId });
        onSave(); // Fecha o modal e avisa o pai (que vai recarregar)
      }
    }
    setLoading(false);
  };

  return (
    <div className="bg-white p-5 rounded-xl shadow-lg">
      {/* Cabeçalho (com botão fechar para modal) */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-800">
          {isEditMode ? 'Editar Item' : 'Adicionar Novo Item'}
        </h3>
        {isModal && onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Exibição de Erro */}
      {error && (
        <div
          className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm"
          onClick={() => setError(null)}
        >
          {error} (Clique para fechar)
        </div>
      )}

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="space-y-4">
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
            value={formData.descricao_item}
            onChange={handleFormChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm text-gray-900"
            placeholder="Ex: Comprar carvão"
            required
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
            value={formData.responsavel}
            onChange={handleFormChange}
            list="lista-responsaveis"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm text-gray-900"
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
            disabled={isEditMode} // Desabilita a mudança de categoria na edição
            className="mt-1 block w-full rounded-md border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="Itens Pendentes">Itens Pendentes</option>
            <option value="Limpeza">Limpeza</option>
            <option value="Jogos">Jogos</option>
            <option value="Lazer">Lazer</option>
            <option value="Cardápio">Cardápio</option>
            <option value="Snacks">Snacks</option>
            <option value="Bebidas">Bebidas</option>
          </select>
        </div>

        {formData.categoria === 'Cardápio' && (
          <div>
            <label
              htmlFor="form-subcategoria"
              className="block text-sm font-medium text-gray-700"
            >
              Subcategoria do Cardápio
            </label>
            <select
              name="subcategoria_cardapio"
              id="form-subcategoria"
              value={formData.subcategoria_cardapio}
              onChange={handleFormChange}
              className="mt-1 block w-full rounded-md border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm text-gray-900"
            >
              {CARDAPIO_SUBCATEGORIES.map((subcategoria) => (
                <option key={subcategoria} value={subcategoria}>
                  {subcategoria}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Seleção de Data (Botões) */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Datas do Evento
          </label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {DATAS_EVENTO.map((data) => {
              const selecionado = formData.data_alvo.includes(data.valor);
              return (
                <button
                  key={data.valor}
                  type="button"
                  onClick={() => handleDateToggle(data.valor)}
                  className={`rounded-lg py-2 px-3 text-sm font-medium transition-all ${
                    selecionado
                      ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-500 ring-offset-1'
                      : 'bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {data.nome}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => handleDateToggle('clear')}
              className={`rounded-lg py-2 px-3 text-sm font-medium transition-all ${
                formData.data_alvo.length === 0
                  ? 'bg-slate-200 text-slate-700 shadow-inner'
                  : 'bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
              }`}
            >
              Sem data específica
            </button>
          </div>
          {formData.data_alvo.length > 1 && (
            <p className="mt-2 text-xs text-gray-500">
              Selecionado para {formData.data_alvo.length} dias.
            </p>
          )}
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex justify-center rounded-lg border border-transparent bg-emerald-600 py-3 px-5 text-base font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:bg-gray-300"
          >
            {loading
              ? 'A guardar...'
              : isEditMode
              ? 'Guardar Alterações'
              : 'Adicionar Item'}
          </button>
        </div>
      </form>
    </div>
  );
}

