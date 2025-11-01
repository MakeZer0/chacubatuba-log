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
  ordem_item: number | null;
};

// --- MUDANÇA: Recebe a nova prop 'onEditItemClick' ---
type ItensListaRendererProps = {
  onEditItemClick: (item: Item) => void;
};
// --- Fim da Mudança ---

const CATEGORIAS_LISTA = [
  // ... (definição das categorias permanece a mesma)
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

// --- MUDANÇA: 'SortableItem' muito mais simples ---
// Removemos toda a lógica de edição inline
function SortableItem({
  item,
  handleToggleComplete,
  handleDeleteItem,
  onEditItemClick, // <-- Nova prop
}: {
  item: Item;
  handleToggleComplete: (id: string, status: boolean) => void;
  handleDeleteItem: (id: string) => void;
  onEditItemClick: (item: Item) => void; // <-- Nova prop
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
      <div className="flex items-center space-x-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        {/* --- MUDANÇA: Botão de editar agora abre o modal --- */}
        <button
          onClick={() => onEditItemClick(item)} // <-- Chama a função da page
          className="text-gray-400 hover:text-emerald-600"
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
// --- Fim da Mudança ---

function ListColumn({
  title,
  items,
  Icon,
  headerStyle,
  ...itemProps // Contém onEditItemClick, mostrarConcluidos, etc.
}: Omit<ListColumnProps, 'item'> & {
  items: Item[];
  mostrarConcluidos: boolean;
  onToggleConcluidos: () => void;
}) {
  // Lógica de filtro (sem mudanças)
  const itensVisiveis = useMemo(() => {
    if (itemProps.mostrarConcluidos) {
      return [...items].sort((a, b) =>
        a.completo === b.completo ? 0 : a.completo ? 1 : -1
      );
    }
    return items.filter((item) => !item.completo);
  }, [items, itemProps.mostrarConcluidos]);

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
          <Icon className="h-6 w-6 mr-3 flex-shrink-0" />
          <h3 className="text-xl font-bold">{title}</h3>
        </div>
        {contagemConcluidos > 0 && (
          <button
            onClick={itemProps.onToggleConcluidos}
            className="p-1 rounded-full hover:bg-black/10 transition-colors"
            title={
              itemProps.mostrarConcluidos
                ? 'Esconder concluídos'
                : `Mostrar ${contagemConcluidos} concluído(s)`
            }
          >
            {itemProps.mostrarConcluidos ? (
              <EyeSlashIcon className="h-5 w-5" />
            ) : (
              <EyeIcon className="h-5 w-5" />
            )}
          </button>
        )}
      </div>

      <div className="p-4 md:p-6">
        {items.length === 0 && (
          <p className="text-sm text-gray-400">Nenhum item nesta categoria.</p>
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
                <SortableItem key={item.id} item={item} {...itemProps} />
              ))}
            </div>
          </SortableContext>
        )}
      </div>
    </div>
  );
}

// --- MUDANÇA: Props do ListColumn simplificadas ---
type ListColumnProps = {
  title: string;
  item: Item;
  Icon: React.ElementType;
  headerStyle: string;
  handleToggleComplete: (id: string, status: boolean) => void;
  handleDeleteItem: (id: string) => void;
  onEditItemClick: (item: Item) => void; // <-- Nova prop
  mostrarConcluidos: boolean;
  onToggleConcluidos: () => void;
};
// --- Fim da Mudança ---

// --- Componente Principal ---
export default function ItensListaRenderer({
  onEditItemClick, // <-- Recebe a prop
}: ItensListaRendererProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // --- MUDANÇA: Estados de edição inline removidos ---
  // const [editingId, setEditingId] = useState<string | null>(null);
  // const [editingText, setEditingText] = useState<string>('');
  // --- Fim da Mudança ---

  const [activeCategory, setActiveCategory] =
    useState<Item['categoria']>('Itens Pendentes');
  const [visibilidadeConcluidos, setVisibilidadeConcluidos] = useState<
    Record<Item['categoria'], boolean>
  >(
    CATEGORIAS_LISTA.reduce((acc, cat) => {
      acc[cat.id] = false;
      return acc;
    }, {} as Record<Item['categoria'], boolean>)
  );

  const handleToggleVisibilidade = (categoria: Item['categoria']) => {
    setVisibilidadeConcluidos((prev) => ({
      ...prev,
      [categoria]: !prev[categoria],
    }));
  };

  const fetchItems = async () => {
    // ... (função sem mudanças)
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

  useEffect(() => {
    // ... (hook de realtime sem mudanças)
    fetchItems();

    const channel = supabase
      .channel('public:ItensLista')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ItensLista' },
        (payload) => {
          console.log('Mudança recebida!', payload);
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

  const groupedItems = useMemo(() => {
    // ... (função sem mudanças)
    const groups = items.reduce((acc, item) => {
      if (!acc[item.categoria]) {
        acc[item.categoria] = [];
      }
      acc[item.categoria].push(item);
      return acc;
    }, {} as Record<Item['categoria'], Item[]>);

    for (const category in groups) {
      groups[category as Item['categoria']].sort(
        (a, b) => (a.ordem_item ?? 99) - (b.ordem_item ?? 99)
      );
    }

    return groups;
  }, [items]);

  const handleToggleComplete = async (
    itemId: string,
    currentStatus: boolean
  ) => {
    // ... (função sem mudanças)
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
    // ... (função sem mudanças)
    setItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
    await supabase.from('ItensLista').delete().match({ id: itemId });
  };

  // --- MUDANÇA: Funções de edição inline removidas ---
  // handleUpdateItem e cancelEdit foram removidas
  // --- Fim da Mudança ---

  const sensors = useSensors(
    // ... (lógica do dnd-kit sem mudanças)
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  async function handleDragEnd(event: DragEndEvent) {
    // ... (função sem mudanças)
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const activeItem = active.data.current as Item;
      const overItem = over.data.current as Item;

      if (activeItem.categoria !== overItem.categoria) {
        return;
      }

      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      const newItemsOrderGlobal = arrayMove(items, oldIndex, newIndex);
      setItems(newItemsOrderGlobal);

      const itemsDaCategoria = newItemsOrderGlobal.filter(
        (item) => item.categoria === activeItem.categoria
      );

      const updates = itemsDaCategoria.map((item, index) => ({
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

  // --- MUDANÇA: Props comuns simplificadas ---
  const listColumnProps = {
    handleToggleComplete,
    handleDeleteItem,
    onEditItemClick, // <-- Passa a prop vinda da page
  };
  // --- Fim da Mudança ---

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
          // ... (loader sem mudanças)
          <div className="bg-white p-6 rounded-xl shadow-lg h-full text-center text-gray-500">
            Carregando itens...
          </div>
        )}

        {/* --- Renderização Mobile (Tabs) --- */}
        <div className="lg:hidden">
          <nav className="sticky top-0 z-30 bg-gray-50/95 backdrop-blur-sm -mx-4 px-4">
            {/* ... (nav sem mudanças) */}
            <div className="flex space-x-4 overflow-x-auto whitespace-nowrap py-3 border-b border-gray-200">
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
                    mostrarConcluidos={visibilidadeConcluidos[cat.id]}
                    onToggleConcluidos={() => handleToggleVisibilidade(cat.id)}
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
              mostrarConcluidos={visibilidadeConcluidos[cat.id]}
              onToggleConcluidos={() => handleToggleVisibilidade(cat.id)}
            />
          ))}
        </div>
      </div>
    </DndContext>
  );
}

