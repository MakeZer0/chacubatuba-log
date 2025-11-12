'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
  ChevronDownIcon,
  Cog6ToothIcon,
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
import { SubcategoryManagerDrawer } from './SubcategoryManagerDrawer';

export type CategoriaId =
  | 'Itens Pendentes'
  | 'Jogos'
  | 'Cardápio'
  | 'Snacks'
  | 'Bebidas'
  | 'Lazer'
  | 'Limpeza';

export type Item = {
  id: string;
  created_at: string;
  descricao_item: string;
  responsavel: string | null;
  categoria: CategoriaId;
  completo: boolean;
  ordem_item: number | null;
  data_alvo: string[];
  subcategoria_id: string | null;
  subcategoria_nome: string | null;
  comment_count?: number;
};

export type Subcategoria = {
  id: string;
  created_at: string;
  categoria: CategoriaId;
  nome: string;
  ordem: number | null;
};

const makeSectionKey = (categoria: CategoriaId, subcategoriaId: string | null) =>
  `${categoria}::${subcategoriaId ?? 'sem'}`;

const SEM_SUBCATEGORIA_KEY = '__sem';

const sanitizeNullableString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const EVENT_DATE_LABELS: Record<string, string> = {
  '2025-11-20': 'Qui',
  '2025-11-21': 'Sex',
  '2025-11-22': 'Sáb',
  '2025-11-23': 'Dom',
};

const EVENT_DATE_ORDER = Object.keys(EVENT_DATE_LABELS);
const FALLBACK_WEEKDAY_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  timeZone: 'UTC',
});

const normalizeDateValue = (value: string): string => value.split('T')[0];

const formatDateLabel = (value: string): string => {
  const normalized = normalizeDateValue(value);
  const mapped = EVENT_DATE_LABELS[normalized];

  if (mapped) {
    return mapped;
  }

  try {
    const date = new Date(normalized);
    if (!Number.isNaN(date.getTime())) {
      const formatted = FALLBACK_WEEKDAY_FORMATTER.format(date);
      const sanitized = formatted.replace('.', '');
      return sanitized.charAt(0).toUpperCase() + sanitized.slice(1);
    }
  } catch (error) {
    console.error('Erro ao formatar data alvo:', error);
  }

  return normalized;
};

const extractRawDates = (raw: unknown): string[] => {
  if (!raw) {
    return [];
  }

  if (Array.isArray(raw)) {
    return raw
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => normalizeDateValue(value));
  }

  if (typeof raw === 'string') {
    return raw
      .split(/[,;|]/)
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
      .map((value) => normalizeDateValue(value));
  }

  return [];
};

const sortDateValues = (values: string[]): string[] =>
  [...new Set(values)].sort((a, b) => {
    const orderA = EVENT_DATE_ORDER.indexOf(a);
    const orderB = EVENT_DATE_ORDER.indexOf(b);

    if (orderA === -1 && orderB === -1) {
      return a.localeCompare(b);
    }
    if (orderA === -1) {
      return 1;
    }
    if (orderB === -1) {
      return -1;
    }
    return orderA - orderB;
  });

export const getItemDateValues = (raw: unknown): string[] => {
  const normalizedValues = extractRawDates(raw);
  if (normalizedValues.length === 0) {
    return [];
  }
  return sortDateValues(normalizedValues);
};

export const getItemDateLabels = (raw: unknown): string[] => {
  const values = getItemDateValues(raw);
  if (values.length === 0) {
    return [];
  }

  const coversAllKnownDates =
    EVENT_DATE_ORDER.length > 0 &&
    EVENT_DATE_ORDER.every((dateKey) => values.includes(dateKey));

  if (coversAllKnownDates) {
    return ['Todos os dias'];
  }

  return values.map((value) => formatDateLabel(value));
};

type ItensListaRendererProps = {
  onEditItemClick: (item: Item) => void;
  onCommentItemClick: (item: Item) => void;
  searchTerm: string; // <-- Recebe o termo de busca
};
// --- Fim da Mudança ---

// Definição das categorias (Paleta Chácara)
const CATEGORIAS_LISTA: Array<{
  id: CategoriaId;
  nome: string;
  Icon: React.ElementType;
  headerStyle: string;
}> = [
  {
    id: 'Itens Pendentes',
    nome: 'Pendentes',
    Icon: ClipboardDocumentListIcon,
    headerStyle: 'bg-gray-100 text-gray-800',
  },
  {
    id: 'Limpeza',
    nome: 'Limpeza',
    Icon: PaintBrushIcon,
    headerStyle: 'bg-cyan-100 text-cyan-800',
  },
  {
    id: 'Jogos',
    nome: 'Jogos',
    Icon: PuzzlePieceIcon,
    headerStyle: 'bg-orange-100 text-orange-800',
  },
  {
    id: 'Lazer',
    nome: 'Lazer',
    Icon: SunIcon,
    headerStyle: 'bg-yellow-100 text-yellow-800',
  },
  {
    id: 'Cardápio',
    nome: 'Cardápio',
    Icon: ShoppingCartIcon,
    headerStyle: 'bg-emerald-100 text-emerald-800',
  },
  {
    id: 'Snacks',
    nome: 'Snacks',
    Icon: SparklesIcon,
    headerStyle: 'bg-lime-100 text-lime-800',
  },
  {
    id: 'Bebidas',
    nome: 'Bebidas',
    Icon: BeakerIcon,
    headerStyle: 'bg-amber-100 text-amber-800',
  },
];

const isCategoriaId = (value: unknown): value is CategoriaId =>
  typeof value === 'string' &&
  CATEGORIAS_LISTA.some((categoria) => categoria.id === value);

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

  const dateLabels = useMemo(() => getItemDateLabels(item.data_alvo), [
    item.data_alvo,
  ]);

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
          className="flex flex-wrap items-center gap-2 cursor-pointer"
        >
          <span
            className={
              item.completo
                ? 'line-through text-gray-400'
                : 'text-gray-700'
            }
          >
            {item.descricao_item}
          </span>

          {item.responsavel && (
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                item.completo
                  ? 'bg-gray-100 text-gray-400'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {item.responsavel}
            </span>
          )}

          {dateLabels.map((label) => (
            <span
              key={`date-${item.id}-${label}`}
              className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                item.completo
                  ? 'bg-gray-100 text-gray-400 border-gray-200'
                  : 'bg-sky-100 text-sky-700 border-sky-200'
              }`}
            >
              {label}
            </span>
          ))}
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
  categoriaId,
  items,
  Icon,
  headerStyle,
  contextId,
  mostrarConcluidos,
  onToggleConcluidos,
  subcategorias,
  sectionsState,
  onToggleSection,
  onManageSubcategorias,
  ...itemProps
}: ListColumnProps) {
  const itensFiltrados = useMemo(() => {
    const ordenados = [...items].sort(
      (a, b) => (a.completo ? 1 : 0) - (b.completo ? 1 : 0)
    );

    if (mostrarConcluidos) {
      return ordenados;
    }
    return ordenados.filter((item) => !item.completo);
  }, [items, mostrarConcluidos]);

  const itensPorSubcategoria = useMemo(() => {
    const map = new Map<string, Item[]>();

    itensFiltrados.forEach((item) => {
      const key = item.subcategoria_id ?? SEM_SUBCATEGORIA_KEY;
      const listaAtual = map.get(key) ?? [];
      listaAtual.push(item);
      map.set(key, listaAtual);
    });

    return map;
  }, [itensFiltrados]);

  const shouldRenderSections = useMemo(() => {
    if (subcategorias.length > 0) {
      return true;
    }

    return Array.from(itensPorSubcategoria.keys()).some(
      (key) => key !== SEM_SUBCATEGORIA_KEY
    );
  }, [subcategorias, itensPorSubcategoria]);

  type SectionData = {
    key: string;
    label: string;
    items: Item[];
    isOpen: boolean;
  };

  const sections = useMemo<SectionData[] | null>(() => {
    if (!shouldRenderSections) {
      return null;
    }

    const workingMap = new Map(itensPorSubcategoria);
    const resultado: SectionData[] = [];

    const sortedSubcategorias = [...subcategorias].sort((a, b) => {
      const ordemA = a.ordem ?? Number.MAX_SAFE_INTEGER;
      const ordemB = b.ordem ?? Number.MAX_SAFE_INTEGER;

      if (ordemA !== ordemB) {
        return ordemA - ordemB;
      }

      return a.nome.localeCompare(b.nome, 'pt-BR');
    });

    sortedSubcategorias.forEach((sub) => {
      const sectionKey = makeSectionKey(categoriaId, sub.id);
      const sectionItems = workingMap.get(sub.id) ?? [];

      resultado.push({
        key: sectionKey,
        label: sub.nome,
        items: sectionItems,
        isOpen: sectionsState[sectionKey] ?? true,
      });

      workingMap.delete(sub.id);
    });

    const semItems = workingMap.get(SEM_SUBCATEGORIA_KEY);
    if (semItems && semItems.length > 0) {
      const sectionKey = makeSectionKey(categoriaId, null);
      resultado.push({
        key: sectionKey,
        label: 'Sem subcategoria',
        items: semItems,
        isOpen: sectionsState[sectionKey] ?? true,
      });
      workingMap.delete(SEM_SUBCATEGORIA_KEY);
    }

    workingMap.forEach((sectionItems, rawKey) => {
      if (sectionItems.length === 0) {
        return;
      }

      const derivedLabel =
        sectionItems[0]?.subcategoria_nome ??
        (rawKey === SEM_SUBCATEGORIA_KEY ? 'Sem subcategoria' : 'Outros');

      const normalizedKey =
        rawKey === SEM_SUBCATEGORIA_KEY ? null : String(rawKey);
      const sectionKey = makeSectionKey(categoriaId, normalizedKey);

      resultado.push({
        key: sectionKey,
        label: derivedLabel,
        items: sectionItems,
        isOpen: sectionsState[sectionKey] ?? true,
      });
    });

    return resultado;
  }, [
    categoriaId,
    itensPorSubcategoria,
    sectionsState,
    shouldRenderSections,
    subcategorias,
  ]);

  const visibleItems = useMemo(() => {
    if (!sections) {
      return itensFiltrados;
    }

    return sections
      .filter((section) => section.isOpen)
      .flatMap((section) => section.items);
  }, [sections, itensFiltrados]);

  const sortableItems = useMemo(
    () => visibleItems.map((item) => item.id),
    [visibleItems]
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
        <h3 className="flex-1 text-xl font-bold">{title}</h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onManageSubcategorias(categoriaId)}
            className="rounded-full p-1.5 text-gray-500 hover:bg-black/10 hover:text-emerald-700 transition"
            title="Gerenciar subcategorias"
          >
            <Cog6ToothIcon className="h-5 w-5" />
          </button>
          {totalConcluidos > 0 && (
            <button
              onClick={onToggleConcluidos}
              className="rounded-full p-1 hover:bg-black/10 transition-colors"
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
            {sections ? (
              <div className="space-y-4">
                {sections.map((section) => (
                  <div
                    key={section.key}
                    className="rounded-lg border border-gray-200 bg-white/40"
                  >
                    <button
                      type="button"
                      onClick={() => onToggleSection(section.key)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-gray-100"
                    >
                      <span>{section.label}</span>
                      <span className="flex items-center gap-2 text-xs font-medium text-gray-500">
                        <span
                          className="inline-flex min-w-[1.5rem] justify-center rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-600"
                          aria-label={`Quantidade em ${section.label}`}
                        >
                          {section.items.length}
                        </span>
                        <ChevronDownIcon
                          className={`h-4 w-4 transition-transform ${
                            section.isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </span>
                    </button>

                    {section.isOpen && (
                      <div className="space-y-3 px-3 pb-3 pt-2">
                        {section.items.length === 0 ? (
                          <p className="text-sm text-gray-400">
                            Nenhum item nesta seção.
                          </p>
                        ) : (
                          section.items.map((item) => (
                            <SortableItem
                              key={item.id}
                              item={item}
                              {...itemProps}
                            />
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {itensFiltrados.map((item) => (
                  <SortableItem key={item.id} item={item} {...itemProps} />
                ))}
              </div>
            )}
          </SortableContext>
        )}
      </div>
    </div>
  );
}

type ListColumnProps = {
  title: string;
  categoriaId: CategoriaId;
  items: Item[];
  Icon: React.ElementType;
  headerStyle: string;
  contextId: string;
  mostrarConcluidos: boolean;
  onToggleConcluidos: () => void;
  sectionsState: Record<string, boolean>;
  onToggleSection: (sectionKey: string) => void;
  subcategorias: Subcategoria[];
  handleToggleComplete: (id: string, status: boolean) => void;
  handleDeleteItem: (id: string) => void;
  onEditItemClick: (item: Item) => void;
  onCommentItemClick: (item: Item) => void;
  onManageSubcategorias: (categoria: CategoriaId) => void;
};
// Fim ListColumn

// --- Componente Principal ---
export default function ItensListaRenderer({
  onEditItemClick,
  onCommentItemClick,
  searchTerm, // <-- Recebe
}: ItensListaRendererProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] =
    useState<CategoriaId>('Itens Pendentes');
  const [isDesktop, setIsDesktop] = useState(false);
  const [categoriaEmGerenciamento, setCategoriaEmGerenciamento] = useState<
    CategoriaId | null
  >(null);

  const [visibilidadeConcluidos, setVisibilidadeConcluidos] = useState<
    Record<CategoriaId, boolean>
  >({
    'Itens Pendentes': false,
    Limpeza: false,
    Jogos: false,
    Lazer: false,
    Cardápio: false,
    Snacks: false,
    Bebidas: false,
  });

  const [subcategoriaSectionsOpen, setSubcategoriaSectionsOpen] = useState<
    Record<string, boolean>
  >({});

  const hasMountedCategoryRef = useRef(false);

  const handleToggleSection = useCallback((sectionKey: string) => {
    setSubcategoriaSectionsOpen((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  }, []);

  const handleManageSubcategorias = useCallback((categoria: CategoriaId) => {
    setCategoriaEmGerenciamento(categoria);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setCategoriaEmGerenciamento(null);
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    // Chama a função RPC
    const { data, error } = await supabase.rpc('get_items_with_comment_count');

    if (error) {
      console.error('Erro ao buscar ItensLista:', error);
      setError('Não foi possível carregar os itens.');
      toast.error('Não foi possível carregar os itens.');
    } else {
      const mapeados = (data ?? []).map((item: Record<string, unknown>) => {
        const normalizadas = getItemDateValues(item.data_alvo);
        const categoria = isCategoriaId(item.categoria)
          ? item.categoria
          : 'Itens Pendentes';

        const subcategoriaId =
          typeof item.subcategoria_id === 'string' &&
          item.subcategoria_id.trim().length > 0
            ? item.subcategoria_id
            : null;

        const mappedItem: Item = {
          id: String(item.id),
          created_at: String(item.created_at ?? new Date().toISOString()),
          descricao_item: String(item.descricao_item ?? ''),
          responsavel: sanitizeNullableString(item.responsavel),
          categoria,
          completo: Boolean(item.completo),
          ordem_item:
            typeof item.ordem_item === 'number' ? item.ordem_item : null,
          data_alvo: normalizadas,
          subcategoria_id: subcategoriaId,
          subcategoria_nome: sanitizeNullableString(item.subcategoria_nome),
          comment_count:
            typeof item.comment_count === 'number'
              ? item.comment_count
              : undefined,
        };

        return mappedItem;
      });

      setItems(mapeados);
    }
    setLoading(false);
  }, []);

  const fetchSubcategorias = useCallback(async () => {
    const { data, error } = await supabase
      .from('ItensListaSubcategorias')
      .select('*')
      .order('categoria', { ascending: true })
      .order('ordem', { ascending: true })
      .order('nome', { ascending: true });

    if (error) {
      console.error('Erro ao buscar subcategorias:', error);
      toast.error('Não foi possível carregar as subcategorias.');
      return;
    }

    const listaNormalizada: Subcategoria[] = (data ?? []).map(
      (sub: Record<string, unknown>) => {
        const categoria = isCategoriaId(sub.categoria)
          ? sub.categoria
          : 'Itens Pendentes';

        return {
          id: String(sub.id),
          created_at: String(
            sub.created_at ?? new Date().toISOString()
          ),
          categoria,
          nome: String(sub.nome ?? 'Sem nome'),
          ordem:
            typeof sub.ordem === 'number'
              ? sub.ordem
              : sub.ordem === null
              ? null
              : null,
        } satisfies Subcategoria;
      }
    );

    setSubcategorias(listaNormalizada);
    setSubcategoriaSectionsOpen((prev) => {
      const next = { ...prev };
      let changed = false;

      listaNormalizada.forEach((sub) => {
        const key = makeSectionKey(sub.categoria, sub.id);
        if (next[key] === undefined) {
          next[key] = true;
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, []);

  useEffect(() => {
    if (hasMountedCategoryRef.current) {
      fetchItems();
    } else {
      hasMountedCategoryRef.current = true;
    }
  }, [activeCategory, fetchItems]);

  useEffect(() => {
    fetchItems();
    fetchSubcategorias();

    const itensChannel = supabase
      .channel('public:ItensLista')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ItensLista' },
        (payload) => {
          console.log('Mudança em ItensLista recebida!', payload);
          fetchItems();
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error('Erro no canal Realtime ItensLista:', err);
          toast.error('Erro de conexão. A página pode não atualizar.');
        }
      });

    const commentChannel = supabase
      .channel('public:comentarios')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comentarios' },
        (payload) => {
          const itemId = payload.new.item_id;
          setItems((prevItems) =>
            prevItems.map((item) =>
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

    const subcategoriasChannel = supabase
      .channel('public:ItensListaSubcategorias')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ItensListaSubcategorias' },
        () => {
          fetchSubcategorias();
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error('Erro no canal de subcategorias:', err);
        }
      });

    return () => {
      supabase.removeChannel(itensChannel);
      supabase.removeChannel(commentChannel);
      supabase.removeChannel(subcategoriasChannel);
    };
  }, [fetchItems, fetchSubcategorias]);

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
    return items.filter(
      (item) =>
        item.descricao_item.toLowerCase().includes(lowerSearch) ||
        (item.responsavel &&
          item.responsavel.toLowerCase().includes(lowerSearch)) ||
        (item.subcategoria_nome &&
          item.subcategoria_nome.toLowerCase().includes(lowerSearch))
    );
  }, [items, searchTerm]);
  // --- Fim da Mudança ---

  // Hook para agrupar itens (agora usa 'itemsFiltradosPorBusca')
  const groupedItems = useMemo(() => {
    const base: Record<CategoriaId, Item[]> = {
      'Itens Pendentes': [],
      Limpeza: [],
      Jogos: [],
      Lazer: [],
      Cardápio: [],
      Snacks: [],
      Bebidas: [],
    };

    itemsFiltradosPorBusca.forEach((item) => {
      base[item.categoria]?.push(item);
    });

    (Object.keys(base) as CategoriaId[]).forEach((categoria) => {
      base[categoria].sort(
        (a, b) => (a.ordem_item ?? 99) - (b.ordem_item ?? 99)
      );
    });

    return base;
  }, [itemsFiltradosPorBusca]); // <-- Depende dos itens filtrados

  const subcategoriasPorCategoria = useMemo(() => {
    const base: Record<CategoriaId, Subcategoria[]> = {
      'Itens Pendentes': [],
      Limpeza: [],
      Jogos: [],
      Lazer: [],
      Cardápio: [],
      Snacks: [],
      Bebidas: [],
    };

    subcategorias.forEach((sub) => {
      base[sub.categoria]?.push(sub);
    });

    (Object.keys(base) as CategoriaId[]).forEach((categoria) => {
      base[categoria].sort((a, b) => {
        const ordemA = a.ordem ?? Number.MAX_SAFE_INTEGER;
        const ordemB = b.ordem ?? Number.MAX_SAFE_INTEGER;

        if (ordemA !== ordemB) {
          return ordemA - ordemB;
        }

        return a.nome.localeCompare(b.nome, 'pt-BR');
      });
    });

    return base;
  }, [subcategorias]);

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
    onManageSubcategorias: handleManageSubcategorias,
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="w-full">
          {/* Erro de carregamento (não toasts) */}
          {error && !loading && (
            <div className="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading && items.length === 0 && (
            <div className="h-full rounded-xl bg-white p-6 text-center text-gray-500 shadow-lg">
              Carregando itens...
            </div>
          )}

          {/* --- Renderização Mobile (Tabs) --- */}
          {!isDesktop && (
            <div className="lg:hidden">
              <nav className="-mx-4 sticky top-0 z-30 bg-gray-50/95 px-4 backdrop-blur-sm">
                <div className="flex space-x-4 overflow-x-auto whitespace-nowrap border-b border-gray-200 py-3">
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
                      <cat.Icon className="mr-1.5 h-5 w-5" />
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
                        categoriaId={cat.id}
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
                        sectionsState={subcategoriaSectionsOpen}
                        onToggleSection={handleToggleSection}
                        subcategorias={subcategoriasPorCategoria[cat.id] || []}
                      />
                    )
                )}
              </div>
            </div>
          )}

          {/* --- Renderização Desktop (Stack) --- */}
          {isDesktop && (
            <div className="hidden space-y-6 lg:block">
              {CATEGORIAS_LISTA.map((cat) => (
                <ListColumn
                  key={cat.id}
                  title={cat.id}
                  categoriaId={cat.id}
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
                  sectionsState={subcategoriaSectionsOpen}
                  onToggleSection={handleToggleSection}
                  subcategorias={subcategoriasPorCategoria[cat.id] || []}
                />
              ))}
            </div>
          )}
        </div>
      </DndContext>
      <SubcategoryManagerDrawer
        categoria={categoriaEmGerenciamento}
        isOpen={categoriaEmGerenciamento !== null}
        onClose={handleCloseDrawer}
        onRefresh={fetchSubcategorias}
      />
    </>
  );
}

