'use client';

import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getItemDateLabels, getItemDateValues } from './ItensListaRenderer'; // Helpers reutilizados
import type { Item } from './ItensListaRenderer'; // Reutiliza o tipo
import toast from 'react-hot-toast';
import {
  CalendarDaysIcon,
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

// --- MUDANÇA: Props para os cliques de edição/comentário ---
type ItinerarioRendererProps = {
  onEditItemClick: (item: Item) => void;
  onCommentItemClick: (item: Item) => void;
  searchTerm: string; // <-- Recebe o termo de busca
};
// --- Fim da Mudança ---

const DIAS_DO_EVENTO = [
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
    headerStyle: 'bg-yellow-100 text-yellow-800',
  },
  {
    id: '2025-11-23',
    nome: 'Domingo (23/Nov)',
    headerStyle: 'bg-orange-100 text-orange-800',
  },
];

const CATEGORIAS_DISPONIVEIS: Item['categoria'][] = [
  'Itens Pendentes',
  'Limpeza',
  'Jogos',
  'Lazer',
  'Cardápio',
  'Snacks',
  'Bebidas',
];

const resolveCategoria = (value: unknown): Item['categoria'] =>
  typeof value === 'string' &&
  CATEGORIAS_DISPONIVEIS.includes(value as Item['categoria'])
    ? (value as Item['categoria'])
    : 'Itens Pendentes';

const sanitizeNullableString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

// --- Componente SortableItem (Idêntico ao outro renderer) ---
type SortableMetadata = {
  itemId: string;
  diaReferencia: string;
};

function SortableItem({
  item,
  diaReferencia,
  sortableId,
  handleToggleComplete,
  handleDeleteItem,
  onEditItemClick,
  onCommentItemClick,
}: {
  item: Item;
  diaReferencia: string;
  sortableId: string;
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
    id: sortableId,
    data: {
      itemId: item.id,
      diaReferencia,
    } satisfies SortableMetadata,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const outrosDias = useMemo(() => {
    if (!item.data_alvo || item.data_alvo.length <= 1) {
      return [] as string[];
    }

    return getItemDateLabels(
      item.data_alvo.filter((dia) => dia !== diaReferencia)
    ).filter((label) => label !== 'Todos os dias');
  }, [item.data_alvo, diaReferencia]);

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
          {outrosDias.length > 0 && (
            <span className="block mt-1 text-xs text-gray-400">
              Também em: {outrosDias.join(', ')}
            </span>
          )}
        </label>
      </div>
      <div className="flex items-center space-x-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onCommentItemClick(item)}
          className="text-gray-400 hover:text-blue-600 relative"
          title="Comentários"
        >
          <ChatBubbleBottomCenterTextIcon className="h-5 w-5" />
          {item.comment_count !== undefined && item.comment_count > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
              {item.comment_count}
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
// --- Fim SortableItem ---

// Componente ListColumn (Idêntico ao outro renderer)
function ListColumn({
  title,
  items,
  Icon,
  headerStyle,
  contextId,
  diaReferencia,
  mostrarConcluidos,
  onToggleConcluidos,
  ...itemProps
}: Omit<ListColumnProps, 'item'> & {
  items: Item[];
  diaReferencia: string;
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
    () => itensFiltrados.map((item) => `${item.id}:${diaReferencia}`),
    [itensFiltrados, diaReferencia]
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
              : 'Nenhum item agendado para este dia.'}
          </p>
        ) : (
          <SortableContext
            id={contextId}
            items={sortableItems}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {itensFiltrados.map((item) => {
                const sortableId = `${item.id}:${diaReferencia}`;
                return (
                  <SortableItem
                    key={sortableId}
                    item={item}
                    diaReferencia={diaReferencia}
                    sortableId={sortableId}
                    {...itemProps}
                  />
                );
              })}
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
  diaReferencia: string;
  handleToggleComplete: (id: string, status: boolean) => void;
  handleDeleteItem: (id: string) => void;
  onEditItemClick: (item: Item) => void;
  onCommentItemClick: (item: Item) => void;
};
// Fim ListColumn

// --- Componente Principal ---
export default function ItinerarioRenderer({
  onEditItemClick,
  onCommentItemClick,
  searchTerm, // <-- Recebe
}: ItinerarioRendererProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDia, setActiveDia] = useState<string>(DIAS_DO_EVENTO[0].id);
  const [isDesktop, setIsDesktop] = useState(false);

  const [visibilidadeConcluidos, setVisibilidadeConcluidos] = useState<
    Record<string, boolean>
  >({
    '2025-11-20': false,
    '2025-11-21': false,
    '2025-11-22': false,
    '2025-11-23': false,
  });

  const fetchItems = async () => {
    setLoading(true);
    // Chama a função RPC
    const { data, error } = await supabase.rpc('get_items_with_comment_count');

    if (error) {
      console.error('Erro ao buscar ItensLista:', error);
      setError('Não foi possível carregar o itinerário.');
      toast.error('Não foi possível carregar o itinerário.');
    } else {
      // Filtra apenas itens que TÊM data_alvo
      const mapeados: Item[] = (data ?? []).map((item: Record<string, unknown>) => {
        const datasNormalizadas = getItemDateValues(item.data_alvo);
        const subcategoriaId =
          typeof item.subcategoria_id === 'string' &&
          item.subcategoria_id.trim().length > 0
            ? item.subcategoria_id
            : null;

        return {
          id: String(item.id),
          created_at: String(item.created_at ?? new Date().toISOString()),
          descricao_item: String(item.descricao_item ?? ''),
          responsavel: sanitizeNullableString(item.responsavel),
          categoria: resolveCategoria(item.categoria),
          completo: Boolean(item.completo),
          ordem_item:
            typeof item.ordem_item === 'number' ? item.ordem_item : null,
          data_alvo: datasNormalizadas,
          subcategoria_id: subcategoriaId,
          subcategoria_nome: sanitizeNullableString(item.subcategoria_nome),
          comment_count:
            typeof item.comment_count === 'number'
              ? item.comment_count
              : undefined,
        } satisfies Item;
      });

      setItems(mapeados.filter((item) => item.data_alvo.length > 0));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();

    const channel = supabase
      .channel('public:ItensLista:itinerario') // Canal diferente
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ItensLista' },
        (payload) => {
          fetchItems();
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error('Erro no canal Realtime Itinerário:', err);
        }
      });
      
    // Canal para Comentários
    const commentChannel = supabase
      .channel('public:comentarios:itinerario') // Canal diferente
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comentarios' },
        (payload) => {
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
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'comentarios' },
        (payload) => {
          const itemId = payload.old.item_id;
          setItems((prevItems) =>
            prevItems.map((item) =>
              item.id === itemId
                ? {
                    ...item,
                    comment_count: Math.max(
                      0,
                      (item.comment_count ?? 1) - 1
                    ),
                  }
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

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(commentChannel);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(min-width: 1024px)');

    const handleChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
    };

    setIsDesktop(mediaQuery.matches);

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
    return items.filter((item) => {
      if (
        item.descricao_item.toLowerCase().includes(lowerSearch) ||
        (item.responsavel &&
          item.responsavel.toLowerCase().includes(lowerSearch)) ||
        (item.subcategoria_nome &&
          item.subcategoria_nome.toLowerCase().includes(lowerSearch))
      ) {
        return true;
      }

      const dataLabels = getItemDateLabels(item.data_alvo);
      return dataLabels.some((label) =>
        label.toLowerCase().includes(lowerSearch)
      );
    });
  }, [items, searchTerm]);
  // --- Fim da Mudança ---

  // Hook para agrupar itens (agora por data_alvo)
  const groupedItems = useMemo(() => {
    const groups: Record<string, Item[]> = {};

    itemsFiltradosPorBusca.forEach((item) => {
      if (!item.data_alvo || item.data_alvo.length === 0) {
        return;
      }

      item.data_alvo.forEach((dia) => {
        if (!groups[dia]) {
          groups[dia] = [];
        }
        groups[dia].push(item);
      });
    });

    Object.keys(groups).forEach((dia) => {
      groups[dia].sort(
        (a, b) => (a.ordem_item ?? 99) - (b.ordem_item ?? 99)
      );
    });

    return groups;
  }, [itemsFiltradosPorBusca]); // <-- Depende dos itens filtrados

  // Funções de CRUD (Idênticas ao outro renderer)
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
    const itemAntigo = items.find(i => i.id === itemId);
    if (!itemAntigo) return;
    
    setItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
    
    const { error } = await supabase
      .from('ItensLista')
      .delete()
      .match({ id: itemId });
    
    if (error) {
      toast.error('Falha ao excluir o item.');
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

    const activeData = active.data.current as SortableMetadata | undefined;
    const overData = over.data.current as SortableMetadata | undefined;

    if (!activeData || !overData) {
      return;
    }

    if (activeData.diaReferencia !== overData.diaReferencia) {
      return;
    }

    const previousItems = items.map((item) => ({ ...item }));

    const diaAtual = activeData.diaReferencia;

    if (!diaAtual) {
      return;
    }

    const itensDoDiaOrdenados = previousItems
      .filter((item) => item.data_alvo?.includes(diaAtual))
      .sort(
        (a, b) => (a.ordem_item ?? Number.MAX_SAFE_INTEGER) - (b.ordem_item ?? Number.MAX_SAFE_INTEGER)
      );

    const oldIndex = itensDoDiaOrdenados.findIndex(
      (item) => item.id === activeData.itemId
    );
    const newIndex = itensDoDiaOrdenados.findIndex(
      (item) => item.id === overData.itemId
    );

    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
      return;
    }

    const novaOrdemDia = arrayMove(itensDoDiaOrdenados, oldIndex, newIndex).map(
      (item, index) => ({ ...item, ordem_item: index })
    );

    const mapaAtualizado = new Map(
      novaOrdemDia.map((item) => [item.id, item])
    );

    const novaListaItens = previousItems.map((item) =>
      mapaAtualizado.get(item.id) ?? item
    );

    setItems(novaListaItens);

    const updatePromises = novaOrdemDia.map((item) =>
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
        {error && !loading && (
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
        {!isDesktop && (
          <div className="lg:hidden">
            <nav className="sticky top-0 z-30 bg-gray-50/95 backdrop-blur-sm -mx-4 px-4">
              <div className="flex space-x-4 overflow-x-auto whitespace-noswrap py-3 border-b border-gray-200">
                {DIAS_DO_EVENTO.map((dia) => (
                  <button
                    key={dia.id}
                    onClick={() => setActiveDia(dia.id)}
                    className={`flex items-center rounded-full py-2 px-4 text-sm font-semibold transition-colors duration-150 ${
                      activeDia === dia.id
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border'
                    }`}
                    aria-current={activeDia === dia.id ? 'page' : undefined}
                  >
                    {dia.nome}
                  </button>
                ))}
              </div>
            </nav>

            <div className="mt-6">
              {DIAS_DO_EVENTO.map(
                (dia) =>
                  activeDia === dia.id && (
                    <ListColumn
                      key={dia.id}
                      title={dia.nome}
                      items={groupedItems[dia.id] || []}
                      Icon={CalendarDaysIcon}
                      headerStyle={dia.headerStyle}
                      {...listColumnProps}
                      diaReferencia={dia.id}
                      contextId={`mobile-${dia.id}`}
                      mostrarConcluidos={visibilidadeConcluidos[dia.id]}
                      onToggleConcluidos={() =>
                        setVisibilidadeConcluidos((prev) => ({
                          ...prev,
                          [dia.id]: !prev[dia.id],
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
            {DIAS_DO_EVENTO.map((dia) => (
              <ListColumn
                key={dia.id}
                title={dia.nome}
                items={groupedItems[dia.id] || []}
                Icon={CalendarDaysIcon}
                headerStyle={dia.headerStyle}
                {...listColumnProps}
                diaReferencia={dia.id}
                contextId={`desktop-${dia.id}`}
                mostrarConcluidos={visibilidadeConcluidos[dia.id]}
                onToggleConcluidos={() =>
                  setVisibilidadeConcluidos((prev) => ({
                    ...prev,
                    [dia.id]: !prev[dia.id],
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

