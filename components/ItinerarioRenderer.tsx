'use client';

import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Item } from './ItensListaRenderer';
// --- MUDANÇA: Importar toast ---
import toast from 'react-hot-toast';
// --- Fim da Mudança ---
import {
  Bars3Icon,
  PencilSquareIcon,
  ChatBubbleBottomCenterTextIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  CollisionDetection,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type ItinerarioRendererProps = {
  onEditItemClick: (item: Item) => void;
  onCommentItemClick: (item: Item) => void;
};

const DIAS_EVENTO = [
  {
    id: '2025-11-20',
    nome: 'Quinta (20/Nov)',
    headerStyle: 'bg-purple-100 text-purple-800',
  },
  {
    id: '2025-11-21',
    nome: 'Sexta (21/Nov)',
    headerStyle: 'bg-blue-100 text-blue-800',
  },
  {
    id: '2025-11-22',
    nome: 'Sábado (22/Nov)',
    headerStyle: 'bg-pink-100 text-pink-800',
  },
  {
    id: '2025-11-23',
    nome: 'Domingo (23/Nov)',
    headerStyle: 'bg-orange-100 text-orange-800',
  },
];

function SortableItem({
  item,
  handleToggleComplete,
  handleDeleteItem,
  onEditItemClick,
  onCommentItemClick,
  commentCount,
}: {
  item: Item;
  handleToggleComplete: (id: string, status: boolean) => void;
  handleDeleteItem: (id: string) => void;
  onEditItemClick: (item: Item) => void;
  onCommentItemClick: (item: Item) => void;
  commentCount: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: item.id,
    data: item,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center space-x-3 group bg-white ${
        item.completo ? 'opacity-60' : ''
      }`}
    >
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
        className="h-5 w-5 rounded text-emerald-600 border-gray-300 focus:ring-emerald-500 cursor-pointer"
      />
      <div className="flex-1">
        <label
          htmlFor={`item-${item.id}`}
          className={`flex-1 ${
            item.completo ? 'line-through text-gray-400' : 'text-gray-700'
          } cursor-pointer`}
        >
          {item.descricao_item}
          <span
            className={`ml-2 text-xs font-medium px-2 py-0.5 rounded-full ${
              item.completo
                ? 'bg-gray-100 text-gray-400'
                : 'bg-gray-200 text-gray-600'
            }`}
          >
            {item.categoria}
          </span>
          {item.responsavel && (
            <span
              className={`ml-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                item.completo
                  ? 'bg-gray-100 text-gray-400'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {item.responsavel}
            </span>
          )}
        </label>
      </div>
      <div className="flex items-center space-x-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onCommentItemClick(item)}
          className="relative text-gray-400 hover:text-blue-600"
          title="Comentários"
        >
          <ChatBubbleBottomCenterTextIcon className="h-5 w-5" />
          {commentCount > 0 && (
            <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
              {commentCount}
            </span>
          )}
        </button>
        <button
          onClick={() => onEditItemClick(item)}
          className="text-gray-400 hover:text-emerald-600"
          title="Editar item"
        >
          <PencilSquareIcon className="h-5 w-5" />
        </button>
        <button
          onClick={() => handleDeleteItem(item.id)}
          className="text-gray-400 hover:text-red-600"
          title="Excluir item"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
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

function DayColumn({
  title,
  items,
  headerStyle,
  commentCounts,
  ...itemProps
}: {
  title: string;
  items: Item[];
  headerStyle: string;
  commentCounts: Record<string, number>;
  handleToggleComplete: (id: string, status: boolean) => void;
  handleDeleteItem: (id: string) => void;
  onEditItemClick: (item: Item) => void;
  onCommentItemClick: (item: Item) => void;
}) {
  const itensOrdenados = useMemo(() => {
    return [...items].sort(
      (a, b) => (a.completo ? 1 : 0) - (b.completo ? 1 : 0)
    );
  }, [items]);

  return (
    <div className="bg-white rounded-xl shadow-lg h-full overflow-hidden">
      <div
        className={`flex items-center p-4 md:p-5 border-b border-gray-200 ${headerStyle}`}
      >
        <CalendarDaysIcon className="h-6 w-6 mr-3 flex-shrink-0" />
        <h3 className="text-xl font-bold flex-1">{title}</h3>
      </div>
      <div className="p-4 md:p-6">
        {itensOrdenados.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum item agendado.</p>
        ) : (
          <SortableContext
            items={itensOrdenados.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {itensOrdenados.map((item) => (
                <SortableItem
                  key={item.id}
                  item={item}
                  {...itemProps}
                  commentCount={commentCounts[item.id] || 0}
                />
              ))}
            </div>
          </SortableContext>
        )}
      </div>
    </div>
  );
}

export default function ItinerarioRenderer({
  onEditItemClick,
  onCommentItemClick,
}: ItinerarioRendererProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState<string>(DIAS_EVENTO[0].id);

  const fetchCommentCounts = async () => {
    const { data, error } = await supabase.rpc('get_comment_counts');
    if (error) {
      console.error('Erro ao buscar contagem de comentários:', error);
    } else {
      const countsMap = (data as { item_id: string; count: number }[]).reduce(
        (acc, { item_id, count }) => {
          acc[item_id] = count;
          return acc;
        },
        {} as Record<string, number>
      );
      setCommentCounts(countsMap);
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ItensLista')
      .select('*')
      .not('data_alvo', 'is', null)
      .order('ordem_item', { ascending: true, nullsFirst: false });

    if (error) {
      console.error('Erro ao buscar ItensLista (Itinerário):', error);
      setError('Não foi possível carregar o itinerário.');
    } else {
      setItems(data as Item[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
    fetchCommentCounts();

    const channelItens = supabase
      .channel('public:ItensLista:itinerario')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ItensLista',
          filter: 'data_alvo=not.is.null',
        },
        () => {
          fetchItems();
        }
      )
      .subscribe();

    const channelComentarios = supabase
      .channel('public:comentarios:itinerario')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comentarios' },
        () => {
          fetchCommentCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelItens);
      supabase.removeChannel(channelComentarios);
    };
  }, []);

  const groupedItems = useMemo(() => {
    return items.reduce((acc, item) => {
      const dia = item.data_alvo;
      if (!dia) return acc;

      if (!acc[dia]) {
        acc[dia] = [];
      }
      acc[dia].push(item);
      return acc;
    }, {} as Record<string, Item[]>);
  }, [items]);

  const handleToggleComplete = async (
    itemId: string,
    currentStatus: boolean
  ) => {
    const newStatus = !currentStatus;
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId ? { ...item, completo: newStatus } : item
      )
    );
    const { error } = await supabase
      .from('ItensLista')
      .update({ completo: newStatus })
      .match({ id: itemId });
      
    // --- MUDANÇA: Toast ---
    if (error) {
      toast.error('Falha ao atualizar item.');
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === itemId ? { ...item, completo: currentStatus } : item
        )
      );
    } else {
      if (newStatus) {
        toast.success('Item concluído!');
      }
    }
    // --- Fim da Mudança ---
  };

  const handleDeleteItem = async (itemId: string) => {
    const oldItems = items;
    setItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
    
    // --- MUDANÇA: Toast ---
    const { error } = await supabase
      .from('ItensLista')
      .delete()
      .match({ id: itemId });
      
    if (error) {
      toast.error('Falha ao eliminar item.');
      setItems(oldItems); // Reverte
    } else {
      toast.success('Item eliminado.');
    }
    // --- Fim da Mudança ---
  };

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

      if (activeItem.data_alvo !== overItem.data_alvo) {
        return;
      }
      
      const oldItems = items; // Guarda o estado antigo
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      const newItemsOrderGlobal = arrayMove(items, oldIndex, newIndex);
      setItems(newItemsOrderGlobal);

      const itemsDoDia = newItemsOrderGlobal.filter(
        (item) => item.data_alvo === activeItem.data_alvo
      );

      const updates = itemsDoDia.map((item, index) => ({
        id: item.id,
        ordem_item: index,
      }));

      const updatePromises = updates.map((item) =>
        supabase
          .from('ItensLista')
          .update({ ordem_item: item.ordem_item })
          .match({ id: item.id })
      );

      const responses = await Promise.all(updatePromises);
      const updateError = responses.find((res) => res.error)?.error;

      if (updateError) {
        console.error('Falha ao reordenar:', updateError);
        // --- MUDANÇA: Toast ---
        toast.error('Falha ao salvar nova ordem.');
        setItems(oldItems); // Reverte
        // --- Fim da Mudança ---
      } else {
        // --- MUDANÇA: Toast ---
        toast.success('Ordem salva!');
        // --- Fim da Mudança ---
      }
    }
  }

  const dayColumnProps = {
    handleToggleComplete,
    handleDeleteItem,
    onEditItemClick,
    onCommentItemClick,
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
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
            Carregando itinerário...
          </div>
        )}

        <div className="lg:hidden">
          <nav className="sticky top-0 z-30 bg-gray-50/95 backdrop-blur-sm -mx-4 px-4">
            <div className="flex space-x-4 overflow-x-auto whitespace-noswrap py-3 border-b border-gray-200">
              {DIAS_EVENTO.map((dia) => (
                <button
                  key={dia.id}
                  onClick={() => setActiveDay(dia.id)}
                  className={`flex items-center rounded-full py-2 px-4 text-sm font-semibold transition-colors duration-150 ${
                    activeDay === dia.id
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border'
                  }`}
                  aria-current={activeDay === dia.id ? 'page' : undefined}
                >
                  {dia.nome}
                </button>
              ))}
            </div>
          </nav>

          <div className="mt-6">
            {DIAS_EVENTO.map(
              (dia) =>
                activeDay === dia.id && (
                  <DayColumn
                    key={dia.id}
                    title={dia.nome}
                    items={groupedItems[dia.id] || []}
                    headerStyle={dia.headerStyle}
                    {...dayColumnProps}
                    commentCounts={commentCounts}
                  />
                )
            )}
          </div>
        </div>

        <div className="hidden lg:block space-y-6">
          {DIAS_EVENTO.map((dia) => (
            <DayColumn
              key={dia.id}
              title={dia.nome}
              items={groupedItems[dia.id] || []}
              headerStyle={dia.headerStyle}
              {...dayColumnProps}
              commentCounts={commentCounts}
            />
          ))}
        </div>
      </div>
    </DndContext>
  );
}

