'use client';

import { useState, useMemo, useEffect, Fragment } from 'react';
import { supabase } from '../lib/supabase/client';
// Importando ícones (necessário instalar @heroicons/react)
// npm install @heroicons/react
import {
  ClipboardDocumentListIcon,
  PaintBrushIcon,
  PuzzlePieceIcon,
  SunIcon,
  ShoppingCartIcon,
  SparklesIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline';

// O tipo Item permanece o mesmo
export type Item = {
  id: string;
  created_at: string;
  descricao_item: string;
  responsavel: string | null;
  categoria:
    | 'Itens Pendentes'
    | 'Jogos'
    | 'Cardápio'
    | 'Snacks'
    | 'Bebidas'
    | 'Lazer'
    | 'Limpeza';
  completo: boolean;
};

// Props do componente principal
type ItensListaRendererProps = {
  refreshKey: boolean;
};

// --- DEFINIÇÃO DAS CATEGORIAS (Estética e Ícones) ---
// Centralizamos os metadados das categorias aqui
const CATEGORIAS_LISTA = [
  {
    id: 'Itens Pendentes' as Item['categoria'],
    nome: 'Pendentes',
    Icon: ClipboardDocumentListIcon,
    headerStyle: 'bg-gray-100 text-gray-800',
  },
  {
    id: 'Limpeza' as Item['categoria'],
    nome: 'Limpeza',
    Icon: PaintBrushIcon,
    headerStyle: 'bg-blue-100 text-blue-800',
  },
  {
    id: 'Jogos' as Item['categoria'],
    nome: 'Jogos',
    Icon: PuzzlePieceIcon,
    headerStyle: 'bg-indigo-100 text-indigo-800',
  },
  {
    id: 'Lazer' as Item['categoria'],
    nome: 'Lazer',
    Icon: SunIcon,
    headerStyle: 'bg-yellow-100 text-yellow-800',
  },
  {
    id: 'Cardápio' as Item['categoria'],
    nome: 'Cardápio',
    Icon: ShoppingCartIcon,
    headerStyle: 'bg-green-100 text-green-800',
  },
  {
    id: 'Snacks' as Item['categoria'],
    nome: 'Snacks',
    Icon: SparklesIcon,
    headerStyle: 'bg-pink-100 text-pink-800',
  },
  {
    id: 'Bebidas' as Item['categoria'],
    nome: 'Bebidas',
    Icon: BeakerIcon,
    headerStyle: 'bg-purple-100 text-purple-800',
  },
];
// ---------------------------------------------------

// --- Componente Auxiliar ListColumn (Refatorado) ---
// Agora recebe o Ícone e o Estilo do Header
type ListColumnProps = {
  title: string;
  items: Item[];
  Icon: React.ElementType;
  headerStyle: string;
  // Passamos as funções de CRUD para ele
  handleToggleComplete: (id: string, status: boolean) => void;
  handleDeleteItem: (id: string) => void;
  handleUpdateItem: (id: string, text: string) => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  editingText: string;
  setEditingText: (text: string) => void;
  cancelEdit: () => void;
};

function ListColumn({
  title,
  items,
  Icon,
  headerStyle,
  handleToggleComplete,
  handleDeleteItem,
  handleUpdateItem,
  editingId,
  setEditingId,
  editingText,
  setEditingText,
  cancelEdit,
}: ListColumnProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg h-full overflow-hidden">
      {/* Header com Ícone e Cor */}
      <div
        className={`flex items-center p-4 md:p-5 border-b border-gray-200 ${headerStyle}`}
      >
        <Icon className="h-6 w-6 mr-3 flex-shrink-0" />
        <h3 className="text-xl font-bold">{title}</h3>
      </div>

      {/* Conteúdo da Lista */}
      <div className="p-4 md:p-6">
        {items.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum item nesta categoria.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex items-center space-x-3 group">
                <input
                  type="checkbox"
                  id={`item-${item.id}`}
                  checked={item.completo}
                  onChange={() =>
                    handleToggleComplete(item.id, item.completo)
                  }
                  disabled={editingId === item.id}
                  className="h-5 w-5 rounded text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                />
                <div className="flex-1">
                  {editingId === item.id ? (
                    <input
                      type="text"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onBlur={() => handleUpdateItem(item.id, editingText)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter')
                          handleUpdateItem(item.id, editingText);
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
                      autoFocus
                    />
                  ) : (
                    <label
                      htmlFor={`item-${item.id}`}
                      className={`flex-1 ${
                        item.completo
                          ? 'line-through text-gray-400'
                          : 'text-gray-700'
                      } ${editingId ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      {item.descricao_item}
                      {item.responsavel && (
                        <span
                          className={`ml-2 text-xs font-medium px-2 py-0.5 rounded-full ${
                            item.completo
                              ? 'bg-gray-100 text-gray-400'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {item.responsavel}
                        </span>
                      )}
                    </label>
                  )}
                </div>
                <div className="flex items-center space-x-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      if (!editingId) {
                        setEditingId(item.id);
                        setEditingText(item.descricao_item);
                      }
                    }}
                    disabled={!!editingId}
                    className="text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Editar item"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    disabled={!!editingId}
                    className="text-gray-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Excluir item"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
// --- Fim ListColumn ---

// --- Componente Principal (Refatorado com Tabs) ---
export default function ItensListaRenderer({
  refreshKey,
}: ItensListaRendererProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');

  // *** NOVO ESTADO PARA AS TABS ***
  const [activeCategory, setActiveCategory] =
    useState<Item['categoria']>('Itens Pendentes');

  // Hook para buscar os dados (sem mudanças)
  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('ItensLista')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erro ao buscar ItensLista:', error);
        setError('Não foi possível carregar os itens.');
      } else {
        setItems(data as Item[]);
      }
      setLoading(false);
    };

    fetchItems();
  }, [refreshKey]);

  // Hook para agrupar itens (sem mudanças)
  const groupedItems = useMemo(() => {
    return items.reduce((acc, item) => {
      if (!acc[item.categoria]) {
        acc[item.categoria] = [];
      }
      acc[item.categoria].push(item);
      return acc;
    }, {} as Record<Item['categoria'], Item[]>);
  }, [items]);

  // Funções de CRUD (sem mudanças na lógica, apenas passadas como props)
  const handleToggleComplete = async (
    itemId: string,
    currentStatus: boolean
  ) => {
    if (editingId === itemId) return;
    const newStatus = !currentStatus;
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId ? { ...item, completo: newStatus } : item
      )
    );
    setError(null);
    const { error: updateError } = await supabase
      .from('ItensLista')
      .update({ completo: newStatus })
      .match({ id: itemId });

    if (updateError) {
      console.error('Erro ao atualizar item:', updateError.message);
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === itemId ? { ...item, completo: currentStatus } : item
        )
      );
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    const itemToDelete = items.find((i) => i.id === itemId);
    if (!itemToDelete) return;
    setItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
    setError(null);
    const { error: deleteError } = await supabase
      .from('ItensLista')
      .delete()
      .match({ id: itemId });

    if (deleteError) {
      console.error('Erro ao deletar item (RLS?):', deleteError);
      setError('Falha ao deletar o item. Tente novamente.');
      setItems((prevItems) => [...prevItems, itemToDelete]);
    }
  };

  const handleUpdateItem = async (itemId: string, newDescription: string) => {
    const oldItems = [...items];
    const originalItem = oldItems.find((i) => i.id === itemId);
    if (
      !originalItem ||
      newDescription.trim() === originalItem.descricao_item.trim() ||
      newDescription.trim().length === 0
    ) {
      setEditingId(null);
      setEditingText('');
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, descricao_item: newDescription.trim() } : i
      )
    );
    setEditingId(null);
    setEditingText('');
    setError(null);
    const { error: updateError } = await supabase
      .from('ItensLista')
      .update({ descricao_item: newDescription.trim() })
      .match({ id: itemId });

    if (updateError) {
      console.error('Erro ao atualizar item:', updateError.message);
      setError('Falha ao salvar a edição.');
      setItems(oldItems);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };

  // Props comuns para o ListColumn
  const listColumnProps = {
    handleToggleComplete,
    handleDeleteItem,
    handleUpdateItem,
    editingId,
    setEditingId,
    editingText,
    setEditingText,
    cancelEdit,
  };

  return (
    <div className="w-full">
      {/* Mostra um erro, se houver */}
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      {/* Mostra um loader enquanto os dados iniciais carregam */}
      {loading && items.length === 0 && (
        <div className="bg-white p-6 rounded-xl shadow-lg h-full text-center text-gray-500">
          Carregando itens...
        </div>
      )}

      {/* --- RENDERIZAÇÃO DAS TABS (MOBILE) --- */}
      <div className="lg:hidden">
        {/* Navegação das Tabs (Sticky) */}
        <nav className="sticky top-0 z-30 bg-gray-50/95 backdrop-blur-sm -mx-4 px-4">
          <div className="flex space-x-4 overflow-x-auto whitespace-nowrap py-3 border-b border-gray-200">
            {CATEGORIAS_LISTA.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center rounded-full py-2 px-4 text-sm font-semibold transition-colors duration-150 ${
                  activeCategory === cat.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border'
                }`}
                aria-current={activeCategory === cat.id ? 'page' : undefined}
              >
                <cat.Icon className="h-5 w-5 mr-1.5" />
                {cat.nome}
              </button>
            ))}
          </div>
        </nav>

        {/* Conteúdo da Tab Ativa */}
        <div className="mt-6">
          {CATEGORIAS_LISTA.map(
            (cat) =>
              activeCategory === cat.id && (
                <ListColumn
                  key={cat.id}
                  title={cat.id} // Título completo (ex: 'Itens Pendentes')
                  items={groupedItems[cat.id] || []}
                  Icon={cat.Icon}
                  headerStyle={cat.headerStyle}
                  {...listColumnProps}
                />
              )
          )}
        </div>
      </div>

      {/* --- RENDERIZAÇÃO EM STACK (DESKTOP) --- */}
      {/* Mantém a lógica original de empilhar no desktop */}
      <div className="hidden lg:block space-y-6">
        {CATEGORIAS_LISTA.map((cat) => (
          <ListColumn
            key={cat.id}
            title={cat.id} // Título completo
            items={groupedItems[cat.id] || []}
            Icon={cat.Icon}
            headerStyle={cat.headerStyle}
            {...listColumnProps}
          />
        ))}
      </div>
    </div>
  );
}
