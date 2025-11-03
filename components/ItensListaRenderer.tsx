'use client';

import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
// --- MUDANÇA: Importar toast ---
import toast from 'react-hot-toast';
// --- Fim da Mudança ---
import {
  ClipboardDocumentListIcon,
  PaintBrushIcon,
  PuzzlePieceIcon,
  SunIcon,
  ShoppingCartIcon,
  SparklesIcon,
  BeakerIcon,
  Bars3Icon,
  PencilSquareIcon,
  ChatBubbleBottomCenterTextIcon,
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
  data_alvo: string | null;
};

type ItensListaRendererProps = {
  onEditItemClick: (item: Item) => void;
  onCommentItemClick: (item: Item) => void;
};

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

function ListColumn({
  title,
  items,
  Icon,
  headerStyle,
  mostrarConcluidos,
  onToggleConcluidos,
  commentCounts,
  ...itemProps
}: Omit<ListColumnProps, 'item'> & {
  items: Item[];
  mostrarConcluidos: boolean;
  onToggleConcluidos: () => void;
  commentCounts: Record<string, number>;
}) {
  const itensFiltrados = useMemo(() => {
    const ordenados = [...items].sort(
      (a, b) => (a.completo ? 1 : 0) - (b.completo ? 1 : 0)
    );

    if (mostrarConcluidos) {
      return ordenados;
    }
    return ordenados.filter((item) => !item.completo);
  }, [items, mostrarConcluidos]);

  const totalConcluidos = useMemo(
    () => items.filter((item) => item.completo).length,
    [items]
  );

  return (
    <div className="bg-white rounded-xl shadow-lg h-full overflow-hidden">
      <div
        className={`flex items-center p-4 md:p-5 border-b border-gray-200 ${headerStyle}`}
      >
        <Icon className="h-6 w-6 mr-3 flex-shrink-0" />
        <h3 className="text-xl font-bold flex-1">{title}</h3>
        {totalConcluidos > 0 && (
          <button
            onClick={onToggleConcluidos}
            className="p-1 rounded-full hover:bg-black/10 transition-colors"
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
        {itensFiltrados.length === 0 ? (
          <p className="text-sm text-gray-400">
            {items.length > 0
              ? 'Todos os itens estão concluídos.'
              : 'Nenhum item nesta categoria.'}
          </p>
        ) : (
          <SortableContext
            items={itensFiltrados.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {itensFiltrados.map((item) => (
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

type ListColumnProps = {
  title: string;
  item: Item;
  Icon: React.ElementType;
  headerStyle: string;
  handleToggleComplete: (id: string, status: boolean) => void;
  handleDeleteItem: (id: string) => void;
  onEditItemClick: (item: Item) => void;
  onCommentItemClick: (item: Item) => void;
};

export default function ItensListaRenderer({
  onEditItemClick,
  onCommentItemClick,
}: ItensListaRendererProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] =
    useState<Item['categoria']>('Itens Pendentes');
  const [visibilidadeConcluidos, setVisibilidadeConcluidos] = useState<
    Record<Item['categoria'], boolean>
  >({
    'Itens Pendentes': false,
    Limpeza: false,
    Jogos: false,
    Lazer: false,
    Cardápio: false,
    Snacks: false,
    Bebidas: false,
  });

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
    fetchItems();
    fetchCommentCounts();

    const channelItens = supabase
      .channel('public:ItensLista')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ItensLista' },
        (payload) => {
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

    const channelComentarios = supabase
      .channel('public:comentarios:renderer')
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

      if (activeItem.categoria !== overItem.categoria) {
        return;
      }
      
      const oldItems = items; // Guarda o estado antigo
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
        // --- MUDANÇA: Toast ---
        toast.error('Falha ao salvar nova ordem.');
        setItems(oldItems); // Reverte para o estado antigo
        // --- Fim da Mudança ---
      } else {
        // --- MUDANÇA: Toast ---
        toast.success('Ordem salva!');
        // --- Fim da Mudança ---
      }
    }
  }

  const listColumnProps = {
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
                    mostrarConcluidos={visibilidadeConcluidos[cat.id]}
                    onToggleConcluidos={() =>
                      setVisibilidadeConcluidos((prev) => ({
                        ...prev,
                        [cat.id]: !prev[cat.id],
                      }))
                    }
                    commentCounts={commentCounts}
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
              onToggleConcluidos={() =>
                setVisibilidadeConcluidos((prev) => ({
                  ...prev,
                  [cat.id]: !prev[cat.id],
                }))
              }
              commentCounts={commentCounts}
            />
          ))}
        </div>
      </div>
    </DndContext>
  );
}

