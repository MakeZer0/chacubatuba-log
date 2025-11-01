'use client';

import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabase/client';
import {
  ClipboardDocumentListIcon,
  PaintBrushIcon,
  PuzzlePieceIcon,
  SunIcon,
  ShoppingCartIcon,
  SparklesIcon,
  BeakerIcon,
  Bars3Icon, // Ícone para o "drag handle"
} from '@heroicons/react/24/outline';

// --- MUDANÇA: Imports do dnd-kit ---
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  CollisionDetection, // Importado para clareza, embora 'closestCenter' seja o valor
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
// --- Fim da Mudança ---

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
  ordem_item: number | null; // Garante que temos a ordem
};

// --- MUDANÇA: 'refreshKey' removido das props ---
type ItensListaRendererProps = {};

// Definição das categorias (Paleta Chácara)
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
    headerStyle: 'bg-cyan-100 text-cyan-800',
  },
  {
    id: 'Jogos' as Item['categoria'],
    nome: 'Jogos',
    Icon: PuzzlePieceIcon,
    headerStyle: 'bg-orange-100 text-orange-800',
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
    headerStyle: 'bg-emerald-100 text-emerald-800',
  },
  {
    id: 'Snacks' as Item['categoria'],
    nome: 'Snacks',
    Icon: SparklesIcon,
    headerStyle: 'bg-lime-100 text-lime-800',
  },
  {
    id: 'Bebidas' as Item['categoria'],
    nome: 'Bebidas',
    Icon: BeakerIcon,
    headerStyle: 'bg-amber-100 text-amber-800',
  },
];

// --- MUDANÇA: Componente SortableItem (para Drag-n-Drop) ---
function SortableItem({
  item,
  handleToggleComplete,
  handleDeleteItem,
  handleUpdateItem,
  editingId,
  setEditingId,
  editingText,
  setEditingText,
  cancelEdit,
}: {
  item: Item;
  handleToggleComplete: (id: string, status: boolean) => void;
  handleDeleteItem: (id: string) => void;
  handleUpdateItem: (id: string, text: string) => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  editingText: string;
  setEditingText: (text: string) => void;
  cancelEdit: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: item.id,
    data: item, // Anexa o item inteiro aos dados do evento
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center space-x-3 group bg-white" // bg-white para sobrepor
    >
      {/* Botão para arrastar (Drag Handle) */}
      <button
        {...attributes}
        {...listeners}
        className="text-gray-400 hover:bg-gray-100 p-1 rounded-md cursor-grab active:cursor-grabbing"
        title="Reordenar item"
      >
        <Bars3Icon className="h-5 w-5" />
      </button>

      <input
        type="checkbox"
        id={`item-${item.id}`}
        checked={item.completo}
        onChange={() => handleToggleComplete(item.id, item.completo)}
        disabled={editingId === item.id}
        className="h-5 w-5 rounded text-emerald-600 border-gray-300 focus:ring-emerald-500 cursor-pointer disabled:opacity-50"
      />
      <div className="flex-1">
        {editingId === item.id ? (
          <input
            type="text"
            value={editingText}
            onChange={(e) => setEditingText(e.target.value)}
            onBlur={() => handleUpdateItem(item.id, editingText)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleUpdateItem(item.id, editingText);
              if (e.key === 'Escape') cancelEdit();
            }}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm text-gray-900"
            autoFocus
          />
        ) : (
          <label
            htmlFor={`item-${item.id}`}
            className={`flex-1 ${
              item.completo ? 'line-through text-gray-400' : 'text-gray-700'
            } ${editingId ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {item.descricao_item}
            {item.responsavel && (
              <span
                className={`ml-2 text-xs font-medium px-2 py-0.5 rounded-full ${
                  item.completo
                    ? 'bg-gray-100 text-gray-400'
                    : 'bg-emerald-100 text-emerald-700'
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
          className="text-gray-400 hover:text-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed"
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
  );
}
// --- Fim SortableItem ---

// Componente ListColumn (Agora usa SortableContext)
function ListColumn({
  title,
  items,
  Icon,
  headerStyle,
  ...itemProps // Passa todo o resto (funções de CRUD, editingId, etc.)
}: Omit<ListColumnProps, 'item'> & { items: Item[] }) {
  return (
    <div className="bg-white rounded-xl shadow-lg h-full overflow-hidden">
      <div
        className={`flex items-center p-4 md:p-5 border-b border-gray-200 ${headerStyle}`}
      >
        <Icon className="h-6 w-6 mr-3 flex-shrink-0" />
        <h3 className="text-xl font-bold">{title}</h3>
      </div>
      <div className="p-4 md:p-6">
        {items.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum item nesta categoria.</p>
        ) : (
          // --- MUDANÇA: Contexto de Sortable ---
          <SortableContext
            items={items.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {items.map((item) => (
                <SortableItem key={item.id} item={item} {...itemProps} />
              ))}
            </div>
          </SortableContext>
          // --- Fim da Mudança ---
        )}
      </div>
    </div>
  );
}
// Renomeando props antigas para clareza
type ListColumnProps = {
  title: string;
  item: Item; // 'item' não é mais usado aqui, mas define o tipo para itemProps
  Icon: React.ElementType;
  headerStyle: string;
  handleToggleComplete: (id: string, status: boolean) => void;
  handleDeleteItem: (id: string) => void;
  handleUpdateItem: (id: string, text: string) => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  editingText: string;
  setEditingText: (text: string) => void;
  cancelEdit: () => void;
};
// Fim ListColumn

// --- Componente Principal (com Realtime e DnD) ---
export default function ItensListaRenderer({}: ItensListaRendererProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [activeCategory, setActiveCategory] =
    useState<Item['categoria']>('Itens Pendentes');

  // --- MUDANÇA: Função de busca definida no escopo principal ---
  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ItensLista')
      .select('*')
      .order('ordem_item', { ascending: true, nullsFirst: false });

    if (error) {
      console.error('Erro ao buscar ItensLista:', error);
      setError('Não foi possível carregar os itens.');
    } else {
      setItems(data as Item[]);
    }
    setLoading(false);
  };
  // --- Fim da Mudança ---

  // --- MUDANÇA: useEffect unificado para Realtime e Busca Inicial ---
  useEffect(() => {
    // 1. Busca inicial
    fetchItems();

    // 2. Assinatura Realtime
    const channel = supabase
      .channel('public:ItensLista')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ItensLista' },
        (payload) => {
          console.log('Mudança recebida!', payload);
          if (payload.eventType === 'INSERT') {
            const newItem = payload.new as Item;
            // Adiciona o novo item e reordena
            setItems((prevItems) =>
              [...prevItems, newItem].sort(
                (a, b) => (a.ordem_item ?? 99) - (b.ordem_item ?? 99)
              )
            );
          }
          if (payload.eventType === 'UPDATE') {
            const updatedItem = payload.new as Item;
            // Atualiza o item e reordena
            setItems((prevItems) =>
              prevItems
                .map((item) => (item.id === updatedItem.id ? updatedItem : item))
                .sort((a, b) => (a.ordem_item ?? 99) - (b.ordem_item ?? 99))
            );
          }
          if (payload.eventType === 'DELETE') {
            const deletedItem = payload.old as Item;
            // Remove o item (já está ordenado)
            setItems((prevItems) =>
              prevItems.filter((item) => item.id !== deletedItem.id)
            );
          }
        }
      )
      .subscribe();

    // 3. Cleanup da assinatura
    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // Roda apenas uma vez
  // --- Fim da Mudança ---

  // Hook para agrupar itens (agora também ordena)
  const groupedItems = useMemo(() => {
    const groups = items.reduce((acc, item) => {
      if (!acc[item.categoria]) {
        acc[item.categoria] = [];
      }
      acc[item.categoria].push(item);
      return acc;
    }, {} as Record<Item['categoria'], Item[]>);

    // Garante que dentro de cada grupo, os itens estão ordenados
    for (const category in groups) {
      groups[category as Item['categoria']].sort(
        (a, b) => (a.ordem_item ?? 99) - (b.ordem_item ?? 99)
      );
    }

    return groups;
  }, [items]);

  // Funções de CRUD (sem mudanças na lógica, apenas no "otimismo")
  const handleToggleComplete = async (
    itemId: string,
    currentStatus: boolean
  ) => {
    // A subscription cuidará da UI, mas uma atualização otimista é boa
    const newStatus = !currentStatus;
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId ? { ...item, completo: newStatus } : item
      )
    );

    await supabase
      .from('ItensLista')
      .update({ completo: newStatus })
      .match({ id: itemId });
    // Não precisamos tratar o erro, a subscription vai corrigir
  };

  const handleDeleteItem = async (itemId: string) => {
    // Otimista
    setItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
    await supabase.from('ItensLista').delete().match({ id: itemId });
  };

  const handleUpdateItem = async (itemId: string, newDescription: string) => {
    // Otimista
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, descricao_item: newDescription.trim() } : i
      )
    );
    setEditingId(null);
    setEditingText('');
    await supabase
      .from('ItensLista')
      .update({ descricao_item: newDescription.trim() })
      .match({ id: itemId });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };

  // --- MUDANÇA: Lógica do Drag-n-Drop ---
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const activeItem = active.data.current as Item;
      const overItem = over.data.current as Item;

      // Não permite arrastar entre categorias diferentes
      if (activeItem.categoria !== overItem.categoria) {
        return;
      }

      // 1. Atualiza o estado local (UI instantânea)
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      const newItemsOrderGlobal = arrayMove(items, oldIndex, newIndex);
      setItems(newItemsOrderGlobal);

      // 2. Filtra apenas os itens da categoria que mudou
      const itemsDaCategoria = newItemsOrderGlobal.filter(
        (item) => item.categoria === activeItem.categoria
      );

      // 3. Cria o array de updates para o Supabase
      const updates = itemsDaCategoria.map((item, index) => ({
        id: item.id,
        ordem_item: index, // A nova ordem é o índice no array filtrado
      }));

      // 4. Envia os updates
      // --- MUDANÇA: Substituindo .upsert() por um loop de .update() ---
      // .upsert() pode falhar com RLS se os objetos não tiverem todos
      // os campos necessários para um 'INSERT', mesmo que só estejamos atualizando.
      // .update() é mais seguro aqui e respeita a RLS de UPDATE.
      const updatePromises = updates.map((item) =>
        supabase
          .from('ItensLista')
          .update({ ordem_item: item.ordem_item })
          .match({ id: item.id })
      );

      const responses = await Promise.all(updatePromises);

      // Verifica se *alguma* das promises deu erro
      const updateError = responses.find((res) => res.error)?.error;
      // --- Fim da Mudança ---

      if (updateError) {
        console.error('Falha ao reordenar:', updateError);
        setError('Não foi possível salvar a nova ordem.');
        // Reverte (ou idealmente, a subscription faria isso)
        fetchItems(); // Simplesmente recarrega
      }
    }
  }
  // --- Fim da Mudança ---

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
    <DndContext
      sensors={sensors}
      // --- MUDANÇA: Correção do Typo ---
      collisionDetection={closestCenter}
      // --- Fim da Mudança ---
      onDragEnd={handleDragEnd}
    >
      <div className="w-full">
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        {loading && items.length === 0 && (
          <div className="bg-white p-6 rounded-xl shadow-lg h-full text-center text-gray-500">
            Carregando itens...
          </div>
        )}

        {/* --- Renderização Mobile (Tabs) --- */}
        <div className="lg:hidden">
          <nav className="sticky top-0 z-30 bg-gray-50/95 backdrop-blur-sm -mx-4 px-4">
            <div className="flex space-x-4 overflow-x-auto whitespace-noswrap py-3 border-b border-gray-200">
              {CATEGORIAS_LISTA.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center rounded-full py-2 px-4 text-sm font-semibold transition-colors duration-150 ${
                    activeCategory === cat.id
                      ? 'bg-emerald-600 text-white shadow-md'
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

          <div className="mt-6">
            {CATEGORIAS_LISTA.map(
              (cat) =>
                activeCategory === cat.id && (
                  <ListColumn
                    key={cat.id}
                    title={cat.id}
                    items={groupedItems[cat.id] || []}
                    Icon={cat.Icon}
                    headerStyle={cat.headerStyle}
                    {...listColumnProps}
                  />
                )
            )}
          </div>
        </div>

        {/* --- Renderização Desktop (Stack) --- */}
        <div className="hidden lg:block space-y-6">
          {CATEGORIAS_LISTA.map((cat) => (
            <ListColumn
              key={cat.id}
              title={cat.id}
              items={groupedItems[cat.id] || []}
              Icon={cat.Icon}
              headerStyle={cat.headerStyle}
              {...listColumnProps}
            />
          ))}
        </div>
      </div>
    </DndContext>
  );
}


