'use client';

// Este é um NOVO componente, muito similar ao ItensListaRenderer
// mas focado em agrupar por DATA ao invés de CATEGORIA.

import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabase/client';
import {
  CalendarDaysIcon,
  Bars3Icon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
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

// Importa o tipo Item
import type { Item } from './ItensListaRenderer';

// Props que a Page.tsx vai passar
type ItinerarioRendererProps = {
  onEditItemClick: (item: Item) => void;
};

// Definição dos dias do evento
const DIAS_EVENTO = [
  {
    id: '2025-11-20',
    nome: 'Quinta (20/Nov)',
    headerStyle: 'bg-indigo-100 text-indigo-800',
  },
  {
    id: '2025-11-21',
    nome: 'Sexta (21/Nov)',
    headerStyle: 'bg-blue-100 text-blue-800',
  },
  {
    id: '2025-11-22',
    nome: 'Sábado (22/Nov)',
    headerStyle: 'bg-green-100 text-green-800',
  },
  {
    id: '2025-11-23',
    nome: 'Domingo (23/Nov)',
    headerStyle: 'bg-yellow-100 text-yellow-800',
  },
];

// Componente SortableItem (Copiado do ItensListaRenderer, mas com 'categoria' no label)
function SortableItemDia({
  item,
  handleToggleComplete,
  handleDeleteItem,
  onEditItemClick,
}: {
  item: Item;
  handleToggleComplete: (id: string, status: boolean) => void;
  handleDeleteItem: (id: string) => void;
  onEditItemClick: (item: Item) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    data: item,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center space-x-3 group bg-white transition-opacity duration-300 ${
        item.completo ? 'opacity-60' : 'opacity-100'
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
        id={`item-dia-${item.id}`}
        checked={item.completo}
        onChange={() => handleToggleComplete(item.id, item.completo)}
        className="h-5 w-5 rounded text-emerald-600 border-gray-300 focus:ring-emerald-500 cursor-pointer"
      />
      <div className="flex-1">
        <label
          htmlFor={`item-dia-${item.id}`}
          className={`flex-1 ${
            item.completo ? 'line-through text-gray-400' : 'text-gray-700'
          } cursor-pointer`}
        >
          {item.descricao_item}
          {/* MUDANÇA: Mostra a CATEGORIA ao invés do responsável */}
          <span
            className={`ml-2 text-xs font-medium px-2 py-0.5 rounded-full ${
              item.completo
                ? 'bg-gray-100 text-gray-400'
                : 'bg-gray-200 text-gray-700' // Estilo diferente
            }`}
          >
            {item.categoria}
          </span>
          {/* Fim da Mudança */}
        </label>
      </div>
      <div className="flex items-center space-x-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEditItemClick(item)}
          className="text-gray-400 hover:text-emerald-600"
          title="Editar item"
        >
          <svg /* Ícone de Lápis */
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
          className="text-gray-400 hover:text-red-600"
          title="Excluir item"
        >
          <svg /* Ícone de X */
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

// Coluna para cada DIA
function DiaColumn({
  title,
  items,
  headerStyle,
  mostrarConcluidos,
  onToggleConcluidos,
  handleToggleComplete,
  handleDeleteItem,
  onEditItemClick,
}: {
  title: string;
  items: Item[];
  headerStyle: string;
  mostrarConcluidos: boolean;
  onToggleConcluidos: () => void;
  handleToggleComplete: (id: string, status: boolean) => void;
  handleDeleteItem: (id: string) => void;
  onEditItemClick: (item: Item) => void;
}) {
  const itensVisiveis = useMemo(() => {
    if (mostrarConcluidos) {
      return [...items].sort((a, b) =>
        a.completo === b.completo ? 0 : a.completo ? 1 : -1
      );
    }
    return items.filter((item) => !item.completo);
  }, [items, mostrarConcluidos]);

  const contagemConcluidos = useMemo(
    () => items.filter((item) => item.completo).length,
    [items]
  );

  return (
    <div className="bg-white rounded-xl shadow-lg h-full overflow-hidden">
      <div
        className={`flex items-center justify-between p-4 md:p-5 border-b border-gray-200 ${headerStyle}`}
      >
        <div className="flex items-center">
          <CalendarDaysIcon className="h-6 w-6 mr-3 flex-shrink-0" />
          <h3 className="text-xl font-bold">{title}</h3>
        </div>
        {contagemConcluidos > 0 && (
          <button
            onClick={onToggleConcluidos}
            className="p-1 rounded-full hover:bg-black/10 transition-colors"
            title={
              mostrarConcluidos
                ? 'Esconder concluídos'
                : `Mostrar ${contagemConcluidos} concluído(s)`
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
        {items.length === 0 && (
          <p className="text-sm text-gray-400">Nenhum item agendado.</p>
        )}
        {items.length > 0 && itensVisiveis.length === 0 && (
          <p className="text-sm text-gray-400">
            Todos os {contagemConcluidos} itens estão concluídos.
          </p>
        )}

        {itensVisiveis.length > 0 && (
          <SortableContext
            items={itensVisiveis.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {itensVisiveis.map((item) => (
                <SortableItemDia
                  key={item.id}
                  item={item}
                  handleToggleComplete={handleToggleComplete}
                  handleDeleteItem={handleDeleteItem}
                  onEditItemClick={onEditItemClick}
                />
              ))}
            </div>
          </SortableContext>
        )}
      </div>
    </div>
  );
}

// Componente Principal
export default function ItinerarioRenderer({
  onEditItemClick,
}: ItinerarioRendererProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>(DIAS_EVENTO[0].id);

  // Estado para visibilidade (um por DIA)
  const [visibilidadeConcluidos, setVisibilidadeConcluidos] = useState<
    Record<string, boolean>
  >(
    DIAS_EVENTO.reduce((acc, dia) => {
      acc[dia.id] = false; // Começa escondido
      return acc;
    }, {} as Record<string, boolean>)
  );

  const handleToggleVisibilidade = (diaId: string) => {
    setVisibilidadeConcluidos((prev) => ({
      ...prev,
      [diaId]: !prev[diaId],
    }));
  };

  // Busca inicial (apenas itens com data)
  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ItensLista')
      .select('*')
      .not('data_alvo', 'is', null) // <-- SÓ PEGA ITENS COM DATA
      .order('ordem_item', { ascending: true, nullsFirst: false });

    if (error) {
      console.error('Erro ao buscar ItensLista por data:', error);
      setError('Não foi possível carregar o itinerário.');
    } else {
      setItems(data as Item[]);
    }
    setLoading(false);
  };

  // Hook de Realtime (escuta a tabela inteira, mas filtra localmente)
  useEffect(() => {
    fetchItems();

    const channel = supabase
      .channel('public:ItensLista-itinerario') // Canal com nome diferente
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ItensLista' },
        (payload) => {
          // Re-busca tudo. É a forma mais simples de
          // lidar com um item que teve a data ADICIONADA ou REMOVIDA.
          fetchItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Agrupa os itens por DATA
  const groupedItems = useMemo(() => {
    const groups = items.reduce((acc, item) => {
      const itemDate = item.data_alvo;
      if (!itemDate) return acc; // Ignora se não tiver data

      if (!acc[itemDate]) {
        acc[itemDate] = [];
      }
      acc[itemDate].push(item);
      return acc;
    }, {} as Record<string, Item[]>);

    // Garante ordem interna
    for (const date in groups) {
      groups[date].sort(
        (a, b) => (a.ordem_item ?? 99) - (b.ordem_item ?? 99)
      );
    }
    return groups;
  }, [items]);

  // Funções de CRUD (exatamente as mesmas do outro renderer)
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

  // Lógica do Drag-n-Drop (para reordenar DENTRO de um dia)
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

      // Não permite arrastar entre DIAS diferentes
      if (activeItem.data_alvo !== overItem.data_alvo) {
        return;
      }

      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      const newItemsOrderGlobal = arrayMove(items, oldIndex, newIndex);
      setItems(newItemsOrderGlobal);

      // Filtra apenas os itens do DIA que mudou
      const itemsDoDia = newItemsOrderGlobal.filter(
        (item) => item.data_alvo === activeItem.data_alvo
      );

      // Cria updates
      const updates = itemsDoDia.map((item, index) => ({
        id: item.id,
        ordem_item: index,
      }));

      // Envia updates
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
                    onToggleConcluidos={() => handleToggleVisibilidade(dia.id)}
                    handleToggleComplete={handleToggleComplete}
                    handleDeleteItem={handleDeleteItem}
                    onEditItemClick={onEditItemClick}
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
              onToggleConcluidos={() => handleToggleVisibilidade(dia.id)}
              handleToggleComplete={handleToggleComplete}
              handleDeleteItem={handleDeleteItem}
              onEditItemClick={onEditItemClick}
            />
          ))}
        </div>
      </div>
    </DndContext>
  );
}
