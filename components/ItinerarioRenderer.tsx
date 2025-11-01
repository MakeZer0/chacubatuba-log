'use client';

import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabase/client';
import {
  Bars3Icon,
  CalendarDaysIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
// --- MUDANÇA: Imports dos ícones de Ação ---
import {
  ChatBubbleBottomCenterTextIcon,
  PencilIcon,
} from '@heroicons/react/24/solid';
// --- Fim da Mudança ---
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Item } from './ItensListaRenderer'; // Reutiliza o tipo

// --- MUDANÇA: 'onCommentItemClick' prop ADICIONADA ---
type ItinerarioRendererProps = {
  onEditItemClick: (item: Item) => void;
  onCommentItemClick: (item: Item) => void; // <-- Prop Adicionada
};

// Definição dos dias
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
    headerStyle: 'bg-orange-100 text-orange-800',
  },
  {
    id: '2025-11-23',
    nome: 'Domingo (23/Nov)',
    headerStyle: 'bg-yellow-100 text-yellow-800',
  },
  {
    id: 'geral',
    nome: 'Geral (Sem data)',
    headerStyle: 'bg-gray-100 text-gray-800',
  },
];

// --- Componente SortableItem (com 'onCommentItemClick') ---
function SortableItem({
  item,
  handleToggleComplete,
  handleDeleteItem,
  onEditItemClick,
  onCommentItemClick, // <-- Prop Adicionada
}: {
  item: Item;
  handleToggleComplete: (id: string, status: boolean) => void;
  handleDeleteItem: (id: string) => void;
  onEditItemClick: (item: Item) => void;
  onCommentItemClick: (item: Item) => void; // <-- Prop Adicionada
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
      </div>
      {/* --- MUDANÇA: Botões de Ação Atualizados --- */}
      <div className="flex items-center space-x-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onCommentItemClick(item)}
          className="text-gray-400 hover:text-emerald-600"
          title="Ver comentários"
        >
          <ChatBubbleBottomCenterTextIcon className="h-5 w-5" />
        </button>

        <button
          onClick={() => onEditItemClick(item)}
          className="text-gray-400 hover:text-emerald-600"
          title="Editar item"
        >
          <PencilIcon className="h-5 w-5" />
        </button>
        {/* --- Fim da Mudança --- */}

        <button
          onClick={() => handleDeleteItem(item.id)}
          className="text-gray-400 hover:text-red-600"
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

// Componente DiaColumn
function DiaColumn({
  title,
  items,
  headerStyle,
  mostrarConcluidos,
  onToggleConcluidos,
  ...itemProps // Passa todo o resto (funções de CRUD, etc.)
}: Omit<DiaColumnProps, 'item'> & {
  items: Item[];
  mostrarConcluidos: boolean;
  onToggleConcluidos: () => void;
}) {
  const itensFiltrados = useMemo(() => {
    if (mostrarConcluidos) {
      return [...items].sort((a, b) =>
        a.completo === b.completo ? 0 : a.completo ? 1 : -1
      );
    }
    return items.filter((item) => !item.completo);
  }, [items, mostrarConcluidos]);

  const totalConcluidos = items.filter((i) => i.completo).length;

  return (
    <div className="bg-white rounded-xl shadow-lg h-full overflow-hidden">
      <div
        className={`flex items-center justify-between p-4 md:p-5 border-b border-gray-200 ${headerStyle}`}
      >
        <div className="flex items-center">
          <CalendarDaysIcon className="h-6 w-6 mr-3 flex-shrink-0" />
          <h3 className="text-xl font-bold">{title}</h3>
        </div>
        {totalConcluidos > 0 && (
          <button
            onClick={onToggleConcluidos}
            className="text-gray-500 hover:text-gray-900"
            title={
              mostrarConcluidos
                ? 'Esconder concluídos'
                : 'Mostrar concluídos'
            }
          >
            {mostrarConcluidos ? (
              <EyeSlashIcon className="h-5 w-5" />
            ) : (
              <EyeIcon className="h-5 w-5" />
            )}
          </button>
        )}
      </div>
      <div className="p-4 md:p-6">
        {items.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum item agendado.</p>
        ) : itensFiltrados.length === 0 ? (
          <p className="text-sm text-gray-400">
            {totalConcluidos} itens concluídos escondidos.
          </p>
        ) : (
          <SortableContext
            items={itensFiltrados.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {itensFiltrados.map((item) => (
                <SortableItem key={item.id} item={item} {...itemProps} />
              ))}
            </div>
          </SortableContext>
        )}
      </div>
    </div>
  );
}
// Props do DiaColumn
type DiaColumnProps = {
  title: string;
  item: Item;
  headerStyle: string;
  handleToggleComplete: (id: string, status: boolean) => void;
  handleDeleteItem: (id: string) => void;
  onEditItemClick: (item: Item) => void;
  onCommentItemClick: (item: Item) => void; // <-- Prop Adicionada
};
// Fim DiaColumn

// --- Componente Principal ---
export default function ItinerarioRenderer({
  onEditItemClick,
  onCommentItemClick, // <-- Prop Adicionada
}: ItinerarioRendererProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(DIAS_EVENTO[0].id);
  const [visibilidadeConcluidos, setVisibilidadeConcluidos] = useState<
    Record<string, boolean>
  >({
    '2025-11-20': false,
    '2025-11-21': false,
    '2025-11-22': false,
    '2025-11-23': false,
    geral: false,
  });

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ItensLista')
      .select('*')
      .order('ordem_item', { ascending: true, nullsFirst: false });

    if (error) {
      console.error('Erro ao buscar ItensLista:', error);
      setError('Não foi possível carregar o itinerário.');
    } else {
      setItems(data as Item[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();

    const channel = supabase
      .channel('public:ItensLista:itinerario') // Canal diferente para evitar conflitos
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ItensLista' },
        (payload) => {
          console.log('Mudança recebida (Itinerário)!', payload);
          if (payload.eventType === 'INSERT') {
            const newItem = payload.new as Item;
            setItems((prevItems) =>
              [...prevItems, newItem].sort(
                (a, b) => (a.ordem_item ?? 99) - (b.ordem_item ?? 99)
              )
            );
          }
          if (payload.eventType === 'UPDATE') {
            const updatedItem = payload.new as Item;
            setItems((prevItems) =>
              prevItems
                .map((item) => (item.id === updatedItem.id ? updatedItem : item))
                .sort((a, b) => (a.ordem_item ?? 99) - (b.ordem_item ?? 99))
            );
          }
          if (payload.eventType === 'DELETE') {
            const deletedItem = payload.old as Item;
            setItems((prevItems) =>
              prevItems.filter((item) => item.id !== deletedItem.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Agrupa itens por dia
  const groupedItems = useMemo(() => {
    const groups = items.reduce((acc, item) => {
      let diaKey = 'geral'; // Padrão
      if (item.data_alvo) {
        // Verifica se a data_alvo é um dos dias do evento
        const diaEncontrado = DIAS_EVENTO.find(
          (d) => d.id === item.data_alvo
        );
        if (diaEncontrado) {
          diaKey = diaEncontrado.id;
        }
      }

      if (!acc[diaKey]) {
        acc[diaKey] = [];
      }
      acc[diaKey].push(item);
      return acc;
    }, {} as Record<string, Item[]>);

    for (const dia in groups) {
      groups[dia].sort(
        (a, b) => (a.ordem_item ?? 99) - (b.ordem_item ?? 99)
      );
    }
    return groups;
  }, [items]);

  // Funções de CRUD
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
    await supabase
      .from('ItensLista')
      .update({ completo: newStatus })
      .match({ id: itemId });
  };

  const handleDeleteItem = async (itemId: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
    await supabase.from('ItensLista').delete().match({ id: itemId });
  };

  // Lógica do Drag-n-Drop
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

      // Não permite arrastar entre dias diferentes
      const diaAtivo = activeItem.data_alvo || 'geral';
      const diaSobre = overItem.data_alvo || 'geral';
      if (diaAtivo !== diaSobre) {
        return;
      }

      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      const newItemsOrderGlobal = arrayMove(items, oldIndex, newIndex);
      setItems(newItemsOrderGlobal);

      const itemsDoDia = newItemsOrderGlobal.filter(
        (item) => (item.data_alvo || 'geral') === diaAtivo
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
        setError('Não foi possível salvar a nova ordem.');
        fetchItems();
      }
    }
  }

  // Props comuns para o DiaColumn
  const diaColumnProps = {
    handleToggleComplete,
    handleDeleteItem,
    onEditItemClick,
    onCommentItemClick, // <-- Prop Adicionada
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

        {/* --- Renderização Mobile (Tabs) --- */}
        <div className="lg:hidden">
          <nav className="sticky top-0 z-30 bg-gray-50/95 backdrop-blur-sm -mx-4 px-4">
            <div className="flex space-x-4 overflow-x-auto whitespace-nowrap py-3 border-b border-gray-200">
              {DIAS_EVENTO.map((dia) => (
                <button
                  key={dia.id}
                  onClick={() => setActiveTab(dia.id)}
                  className={`flex items-center rounded-full py-2 px-4 text-sm font-semibold transition-colors duration-150 ${
                    activeTab === dia.id
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border'
                  }`}
                  aria-current={activeTab === dia.id ? 'page' : undefined}
                >
                  {dia.nome}
                </button>
              ))}
            </div>
          </nav>

          <div className="mt-6">
            {DIAS_EVENTO.map(
              (dia) =>
                activeTab === dia.id && (
                  <DiaColumn
                    key={dia.id}
                    title={dia.nome}
                    items={groupedItems[dia.id] || []}
                    headerStyle={dia.headerStyle}
                    mostrarConcluidos={visibilidadeConcluidos[dia.id]}
                    onToggleConcluidos={() =>
                      setVisibilidadeConcluidos((prev) => ({
                        ...prev,
                        [dia.id]: !prev[dia.id],
                      }))
                    }
                    {...diaColumnProps}
                  />
                )
            )}
          </div>
        </div>

        {/* --- Renderização Desktop (Stack) --- */}
        <div className="hidden lg:block space-y-6">
          {DIAS_EVENTO.map((dia) => (
            <DiaColumn
              key={dia.id}
              title={dia.nome}
              items={groupedItems[dia.id] || []}
              headerStyle={dia.headerStyle}
              mostrarConcluidos={visibilidadeConcluidos[dia.id]}
              onToggleConcluidos={() =>
                setVisibilidadeConcluidos((prev) => ({
                  ...prev,
                  [dia.id]: !prev[dia.id],
                }))
              }
              {...diaColumnProps}
            />
          ))}
        </div>
      </div>
    </DndContext>
  );
}

