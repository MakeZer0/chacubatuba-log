'use client';

import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import toast from 'react-hot-toast'; // Para feedback
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
  TouchSensor,
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
  ordem_item: number | null;
  data_alvo: string | null;
  // --- MUDANÇA: Adicionado para o indicador ---
  comment_count?: number; // Opcional
};

// --- MUDANÇA: Props para os cliques de edição/comentário ---
type ItensListaRendererProps = {
  onEditItemClick: (item: Item) => void;
  onCommentItemClick: (item: Item) => void;
  searchTerm: string; // <-- Recebe o termo de busca
};
// --- Fim da Mudança ---

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

// --- Componente SortableItem ---
function SortableItem({
  item,
  handleToggleComplete,
  handleDeleteItem,
  onEditItemClick,
  onCommentItemClick,
}: {
  item: Item;
  handleToggleComplete: (id: string, status: boolean) => void;
  handleDeleteItem: (id: string) => void;
  onEditItemClick: (item: Item) => void;
  onCommentItemClick: (item: Item) => void;
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
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center text-gray-400 hover:bg-gray-100 rounded-md cursor-grab active:cursor-grabbing flex-shrink-0"
        style={{ touchAction: 'none' }}
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
          className="text-gray-400 hover:text-blue-600 relative" // <-- Posição relativa
          title="Comentários"
        >
          <ChatBubbleBottomCenterTextIcon className="h-5 w-5" />
          {/* --- MUDANÇA: Indicador de Comentário --- */}
          {item.comment_count !== undefined && item.comment_count > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
              {item.comment_count}
            </span>
          )}
          {/* --- Fim da Mudança --- */}
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
// --- Fim SortableItem ---

// Componente ListColumn
function ListColumn({
  title,
  items,
  Icon,
  headerStyle,
  contextId,
  mostrarConcluidos,
  onToggleConcluidos,
  ...itemProps
}: Omit<ListColumnProps, 'item'> & {
  items: Item[];
  mostrarConcluidos: boolean;
  onToggleConcluidos: () => void;
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

  const sortableItems = useMemo(
    () => itensFiltrados.map((item) => item.id),
    [itensFiltrados]
  );

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
            id={contextId}
            items={sortableItems}
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

type ListColumnProps = {
  title: string;
  item: Item;
  Icon: React.ElementType;
  headerStyle: string;
  contextId: string;
  handleToggleComplete: (id: string, status: boolean) => void;
  handleDeleteItem: (id: string) => void;
  onEditItemClick: (item: Item) => void;
  onCommentItemClick: (item: Item) => void;
};
// Fim ListColumn

// --- Componente Principal ---
export default function ItensListaRenderer({
  onEditItemClick,
  onCommentItemClick,
  searchTerm, // <-- Recebe
}: ItensListaRendererProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] =
    useState<Item['categoria']>('Itens Pendentes');
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia('(min-width: 1024px)').matches;
  });

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

  const fetchItems = async () => {
    setLoading(true);
    // Chama a função RPC
    const { data, error } = await supabase.rpc('get_items_with_comment_count');

    if (error) {
      console.error('Erro ao buscar ItensLista:', error);
      setError('Não foi possível carregar os itens.');
      toast.error('Não foi possível carregar os itens.');
    } else {
      setItems(data as Item[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();

    const channel = supabase
      .channel('public:ItensLista')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ItensLista' },
        (payload) => {
          console.log('Mudança recebida!', payload);
          // Otimista, mas a contagem de comentários pode ficar dessincronizada
          // O ideal é re-buscar
          fetchItems();
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error('Erro no canal Realtime ItensLista:', err);
          toast.error('Erro de conexão. A página pode não atualizar.');
        }
      });
    
    // --- MUDANÇA: Canal para Comentários ---
    // Escuta por novos comentários para atualizar a contagem
    const commentChannel = supabase
      .channel('public:comentarios')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comentarios' },
        (payload) => {
          console.log('Novo comentário, atualizando contagem...');
          // Encontra o item_id e incrementa a contagem
          const itemId = payload.new.item_id;
          setItems(prevItems => 
            prevItems.map(item => 
              item.id === itemId 
              ? { ...item, comment_count: (item.comment_count || 0) + 1 }
              : item
            )
          );
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error('Erro no canal Realtime Comentários:', err);
        }
      });
    // --- Fim da Mudança ---

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(commentChannel); // <-- Limpa
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');

    const handleChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  // --- MUDANÇA: Primeiro, filtra por busca ---
  const itemsFiltradosPorBusca = useMemo(() => {
    if (searchTerm.trim() === '') {
      return items; // Retorna todos se a busca estiver vazia
    }
    const lowerSearch = searchTerm.toLowerCase();
    return items.filter(
      (item) =>
        item.descricao_item.toLowerCase().includes(lowerSearch) ||
        (item.responsavel && item.responsavel.toLowerCase().includes(lowerSearch))
    );
  }, [items, searchTerm]);
  // --- Fim da Mudança ---

  // Hook para agrupar itens (agora usa 'itemsFiltradosPorBusca')
  const groupedItems = useMemo(() => {
    const groups = itemsFiltradosPorBusca.reduce((acc, item) => {
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
  }, [itemsFiltradosPorBusca]); // <-- Depende dos itens filtrados

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

    const { error } = await supabase
      .from('ItensLista')
      .update({ completo: newStatus })
      .match({ id: itemId });
    
    if (error) {
      toast.error('Falha ao atualizar o item.');
      // Reverte
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === itemId ? { ...item, completo: currentStatus } : item
        )
      );
    } else {
      toast.success(newStatus ? 'Item concluído!' : 'Item pendente!');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    // Guarda o item antigo para reverter em caso de erro
    const itemAntigo = items.find(i => i.id === itemId);
    if (!itemAntigo) return;

    // Otimista
    setItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
    
    const { error } = await supabase
      .from('ItensLista')
      .delete()
      .match({ id: itemId });
    
    if (error) {
      toast.error('Falha ao excluir o item.');
      // Reverte
      setItems(prev => [...prev, itemAntigo].sort(
        (a, b) => (a.ordem_item ?? 99) - (b.ordem_item ?? 99)
      ));
    } else {
      toast.success('Item excluído.');
    }
  };

  // Lógica do Drag-n-Drop
  const sensors = useSensors(
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 120,
        tolerance: 8,
      },
    }),
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 120,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const activeItem =
      (active.data.current as Item | undefined) ||
      items.find((item) => item.id === active.id);
    const overItem =
      (over.data.current as Item | undefined) ||
      items.find((item) => item.id === over.id);

    if (!activeItem || !overItem) {
      return;
    }

    if (activeItem.categoria !== overItem.categoria) {
      return;
    }

  const previousItems = items.map((item) => ({ ...item }));

    const categoriaAtual = activeItem.categoria;
    const itensDaCategoriaOrdenados = previousItems
      .filter((item) => item.categoria === categoriaAtual)
      .sort(
        (a, b) => (a.ordem_item ?? Number.MAX_SAFE_INTEGER) - (b.ordem_item ?? Number.MAX_SAFE_INTEGER)
      );

    const oldIndex = itensDaCategoriaOrdenados.findIndex((item) => item.id === active.id);
    const newIndex = itensDaCategoriaOrdenados.findIndex((item) => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
      return;
    }

    const novaOrdemCategoria = arrayMove(
      itensDaCategoriaOrdenados,
      oldIndex,
      newIndex
    ).map((item, index) => ({ ...item, ordem_item: index }));

    const mapaAtualizado = new Map(
      novaOrdemCategoria.map((item) => [item.id, item])
    );

    const novaListaItens = previousItems.map((item) =>
      mapaAtualizado.get(item.id) ?? item
    );

    setItems(novaListaItens);

    const updatePromises = novaOrdemCategoria.map((item) =>
      supabase
        .from('ItensLista')
        .update({ ordem_item: item.ordem_item })
        .match({ id: item.id })
    );

    try {
      const responses = await Promise.all(updatePromises);
      const updateError = responses.find((res) => res.error)?.error;

      if (updateError) {
        console.error('Falha ao reordenar:', updateError);
        toast.error('Não foi possível salvar a nova ordem.');
        setItems(previousItems);
      } else {
        toast.success('Ordem salva!');
      }
    } catch (error) {
      console.error('Erro ao persistir nova ordem:', error);
      toast.error('Não foi possível salvar a nova ordem.');
      setItems(previousItems);
    }
  }

  // Props comuns para o ListColumn
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
        {/* Erro de carregamento (não toasts) */}
        {error && !loading && (
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
        {!isDesktop && (
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
                      contextId={`mobile-${cat.id}`}
                      mostrarConcluidos={visibilidadeConcluidos[cat.id]}
                      onToggleConcluidos={() =>
                        setVisibilidadeConcluidos((prev) => ({
                          ...prev,
                          [cat.id]: !prev[cat.id],
                        }))
                      }
                    />
                  )
              )}
            </div>
          </div>
        )}

        {/* --- Renderização Desktop (Stack) --- */}
        {isDesktop && (
          <div className="hidden lg:block space-y-6">
            {CATEGORIAS_LISTA.map((cat) => (
              <ListColumn
                key={cat.id}
                title={cat.id}
                items={groupedItems[cat.id] || []}
                Icon={cat.Icon}
                headerStyle={cat.headerStyle}
                {...listColumnProps}
                contextId={`desktop-${cat.id}`}
                mostrarConcluidos={visibilidadeConcluidos[cat.id]}
                onToggleConcluidos={() =>
                  setVisibilidadeConcluidos((prev) => ({
                    ...prev,
                    [cat.id]: !prev[cat.id],
                  }))
                }
              />
            ))}
          </div>
        )}
      </div>
    </DndContext>
  );
}

