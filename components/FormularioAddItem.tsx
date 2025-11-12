'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Item, Subcategoria } from './ItensListaRenderer';
import { getItemDateValues } from './ItensListaRenderer';
import toast from 'react-hot-toast';

// Lista de Responsáveis (Auto-preenchimento)
const LISTA_RESPONSAVEIS = [
  'Antonio',
  'Beatriz',
  'Baiano',
  'Carol',
  'Costinha',
  'Henrique',
  'Jessica',
  'Juan',
  'Luciana',
  'Mayquel',
  'Nikolinhas',
];

// Lista de Datas do Evento
const DATAS_EVENTO = [
  { valor: '2025-11-20', nome: 'Quinta (20/Nov)' },
  { valor: '2025-11-21', nome: 'Sexta (21/Nov)' },
  { valor: '2025-11-22', nome: 'Sábado (22/Nov)' },
  { valor: '2025-11-23', nome: 'Domingo (23/Nov)' },
];

const EVENT_DATE_ORDER = DATAS_EVENTO.map((registro) => registro.valor);

const NO_SUBCATEGORY_VALUE = '__sem_subcategoria__';

const sanitizeId = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const CATEGORIA_OPCOES: Item['categoria'][] = [
  'Itens Pendentes',
  'Limpeza',
  'Jogos',
  'Lazer',
  'Cardápio',
  'Snacks',
  'Bebidas',
];

const isCategoria = (value: unknown): value is Item['categoria'] =>
  typeof value === 'string' &&
  CATEGORIA_OPCOES.includes(value as Item['categoria']);

const ordenarDatasSelecionadas = (datas: string[]): string[] =>
  datas
    .slice()
    .sort((a, b) => {
      const idxA = EVENT_DATE_ORDER.indexOf(a);
      const idxB = EVENT_DATE_ORDER.indexOf(b);

      if (idxA === -1 && idxB === -1) {
        return a.localeCompare(b);
      }
      if (idxA === -1) {
        return 1;
      }
      if (idxB === -1) {
        return -1;
      }
      return idxA - idxB;
    });

type FormState = {
  descricao_item: string;
  responsavel: string;
  categoria: Item['categoria'];
  data_alvo: string[];
  subcategoria_id: string | null;
};

type FormularioProps = {
  isModal?: boolean;
  onSave: () => void;
  onClose?: () => void;
  itemParaEditar?: Item | null; // Recebe o item para editar
};

// Estado inicial do formulário
const estadoInicial: FormState = {
  descricao_item: '',
  responsavel: '',
  categoria: 'Itens Pendentes',
  data_alvo: [],
  subcategoria_id: null,
};

export default function FormularioAddItem({
  isModal = false,
  onSave,
  onClose,
  itemParaEditar,
}: FormularioProps) {
  const [formData, setFormData] = useState<FormState>(estadoInicial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([]);
  const [subcategoriasLoading, setSubcategoriasLoading] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false);

  const isEditMode = !!itemParaEditar; // Estamos em modo de edição?

  // Efeito para preencher o formulário quando 'itemParaEditar' muda
  useEffect(() => {
    if (itemParaEditar) {
      // Estamos editando
      const datas = getItemDateValues(itemParaEditar.data_alvo);

      setFormData({
        descricao_item: itemParaEditar.descricao_item || '',
        responsavel: itemParaEditar.responsavel || '',
        categoria: itemParaEditar.categoria || 'Itens Pendentes',
        data_alvo: ordenarDatasSelecionadas(datas),
        subcategoria_id: sanitizeId(itemParaEditar.subcategoria_id),
      });
    } else {
      // Estamos adicionando
      setFormData(estadoInicial);
    }
    setIsBulkMode(false);
    // --- MUDANÇA: 'isOpen' removido das dependências ---
  }, [itemParaEditar]);
  // --- Fim da Mudança ---

  const fetchSubcategorias = useCallback(async () => {
    setSubcategoriasLoading(true);

    const { data, error } = await supabase
      .from('ItensListaSubcategorias')
      .select('*')
      .order('categoria', { ascending: true })
      .order('ordem', { ascending: true })
      .order('nome', { ascending: true });

    if (error) {
      console.error('Erro ao carregar subcategorias:', error);
      toast.error('Não foi possível carregar as subcategorias.', {
        id: 'form-subcategorias-erro',
      });
      setSubcategoriasLoading(false);
      return;
    }

    const listaNormalizada: Subcategoria[] = (data ?? []).map(
      (registro: Record<string, unknown>) => {
        const categoria = isCategoria(registro.categoria)
          ? registro.categoria
          : 'Itens Pendentes';

        return {
          id: String(registro.id),
          created_at: String(
            registro.created_at ?? new Date().toISOString()
          ),
          categoria,
          nome: String(registro.nome ?? 'Sem nome'),
          ordem:
            typeof registro.ordem === 'number'
              ? registro.ordem
              : registro.ordem === null
              ? null
              : null,
        } satisfies Subcategoria;
      }
    );

    setSubcategorias(listaNormalizada);
    setSubcategoriasLoading(false);
  }, []);

  useEffect(() => {
    fetchSubcategorias();

    const channel = supabase
      .channel('public:ItensListaSubcategorias:form')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ItensListaSubcategorias' },
        () => {
          fetchSubcategorias();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSubcategorias]);

  const subcategoriasDaCategoria = useMemo(() => {
    return subcategorias
      .filter((sub) => sub.categoria === formData.categoria)
      .sort((a, b) => {
        const ordemA = a.ordem ?? Number.MAX_SAFE_INTEGER;
        const ordemB = b.ordem ?? Number.MAX_SAFE_INTEGER;

        if (ordemA !== ordemB) {
          return ordemA - ordemB;
        }

        return a.nome.localeCompare(b.nome, 'pt-BR');
      });
  }, [formData.categoria, subcategorias]);

  const selectedSubcategoria = useMemo(() => {
    if (!formData.subcategoria_id) {
      return null;
    }

    return (
      subcategorias.find((sub) => sub.id === formData.subcategoria_id) ?? null
    );
  }, [formData.subcategoria_id, subcategorias]);

  const bulkPreview = useMemo(() => {
    if (!isBulkMode) {
      return [];
    }

    return formData.descricao_item
      .split(/\r?\n/)
      .map((linha) => linha.trim())
      .filter((linha) => linha.length > 0);
  }, [formData.descricao_item, isBulkMode]);

  const bulkPreviewCount = bulkPreview.length;

  const handleBulkToggle = useCallback(() => {
    if (isEditMode) {
      return;
    }

    setError(null);
    setIsBulkMode((prev) => {
      if (prev) {
        setFormData((current) => ({
          ...current,
          descricao_item:
            current.descricao_item
              .split(/\r?\n/)
              .map((linha) => linha.trim())
              .find((linha) => linha.length > 0) ?? '',
        }));
      }
      return !prev;
    });
  }, [isEditMode]);

  const handleFormChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      if (name === 'categoria') {
        const novaCategoria = value as Item['categoria'];
        return {
          ...prev,
          categoria: novaCategoria,
          subcategoria_id: null,
        };
      }

      if (name === 'subcategoria_id') {
        return {
          ...prev,
          subcategoria_id:
            value === NO_SUBCATEGORY_VALUE ? null : (value as string),
        };
      }

      return { ...prev, [name]: value };
    });
  };

  const handleDateToggle = (date: string) => {
    setFormData((prev) => {
      if (date === 'clear') {
        return { ...prev, data_alvo: [] };
      }

      const alreadySelected = prev.data_alvo.includes(date);
      const updatedDates = alreadySelected
        ? prev.data_alvo.filter((valor) => valor !== date)
        : [...prev.data_alvo, date];

      return { ...prev, data_alvo: ordenarDatasSelecionadas(updatedDates) };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isBulkCreate = !isEditMode && isBulkMode;
    const linhasParaCriar = isBulkCreate
      ? bulkPreview
      : [formData.descricao_item.trim()];

    if (linhasParaCriar.length === 0 || linhasParaCriar.every((linha) => linha.length === 0)) {
      setError(
        isBulkCreate
          ? 'Adicione pelo menos uma descrição (uma por linha).'
          : 'A descrição deve ter pelo menos 3 caracteres.'
      );
      return;
    }

    const linhasInvalidas = linhasParaCriar.filter((linha) => linha.length < 3);
    if (linhasInvalidas.length > 0) {
      setError(
        linhasInvalidas.length === 1
          ? 'Cada descrição deve ter pelo menos 3 caracteres.'
          : 'Existem linhas com menos de 3 caracteres. Revise a lista.'
      );
      return;
    }

    setLoading(true);
    setError(null);

    const toastId = toast.loading(
      isEditMode
        ? 'A atualizar item...'
        : isBulkCreate
        ? `A adicionar ${linhasParaCriar.length} itens...`
        : 'A adicionar item...'
    );

    const datasPersistidas = ordenarDatasSelecionadas(formData.data_alvo);

    const baseItemData = {
      responsavel: formData.responsavel.trim() || null,
      categoria: formData.categoria,
      data_alvo: datasPersistidas.length === 0 ? null : datasPersistidas,
      subcategoria_id: formData.subcategoria_id,
    };

    if (isEditMode) {
      // --- LÓGICA DE UPDATE ---
      const dadosItem = {
        ...baseItemData,
        descricao_item: linhasParaCriar[0],
      };

      const { error: updateError } = await supabase
        .from('ItensLista')
        .update(dadosItem)
        .match({ id: itemParaEditar.id });

      if (updateError) {
        console.error('Erro ao atualizar item:', updateError);
        setError(updateError.message);
        toast.error('Falha ao atualizar o item.', { id: toastId });
      } else {
        toast.success('Item atualizado!', { id: toastId });
        onSave(); // Fecha o modal e avisa o pai (que vai recarregar)
      }
    } else {
      // --- LÓGICA DE INSERT ---
      // 1. Obter a contagem de itens para definir a ordem
      const { count: currentItemCount, error: countError } = await supabase
        .from('ItensLista')
        .select('*', { count: 'exact', head: true })
        .eq('categoria', formData.categoria);

      if (countError) {
        console.error('Erro ao buscar contagem:', countError);
        setError(countError.message);
        toast.error('Falha ao definir a ordem do item.', { id: toastId });
        setLoading(false);
        return;
      }

      const newOrder = currentItemCount ?? 0;

      const itensParaInserir = linhasParaCriar.map((descricao, index) => ({
        ...baseItemData,
        descricao_item: descricao,
        ordem_item: newOrder + index,
      }));

      const { error: insertError } = await supabase
        .from('ItensLista')
        .insert(itensParaInserir);

      if (insertError) {
        console.error('Erro ao adicionar item:', insertError);
        setError(insertError.message);
        toast.error('Falha ao adicionar o item.', { id: toastId });
      } else {
        toast.success(
          itensParaInserir.length > 1
            ? `${itensParaInserir.length} itens adicionados!`
            : 'Item adicionado!',
          { id: toastId }
        );
        setFormData(estadoInicial);
        setIsBulkMode(false);
        onSave(); // Fecha o modal e avisa o pai (que vai recarregar)
      }
    }
    setLoading(false);
  };

  return (
    <div className="bg-white p-5 rounded-xl shadow-lg">
      {/* Cabeçalho (com botão fechar para modal) */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-800">
          {isEditMode ? 'Editar Item' : 'Adicionar Novo Item'}
        </h3>
        {isModal && onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Exibição de Erro */}
      {error && (
        <div
          className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm"
          onClick={() => setError(null)}
        >
          {error} (Clique para fechar)
        </div>
      )}

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="flex items-center justify-between gap-x-3">
            <label
              htmlFor="form-descricao"
              className="block text-sm font-medium text-gray-700"
            >
              Descrição
            </label>
            {!isEditMode && (
              <button
                type="button"
                onClick={handleBulkToggle}
                className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
              >
                {isBulkMode ? 'Adicionar um único item' : 'Adicionar vários itens'}
              </button>
            )}
          </div>
          {isBulkMode && !isEditMode ? (
            <>
              <textarea
                name="descricao_item"
                id="form-descricao"
                value={formData.descricao_item}
                onChange={handleFormChange}
                rows={6}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm text-gray-900"
                placeholder={
                  'Digite uma descrição por linha. Linhas em branco serão ignoradas.'
                }
              />
              <p className="mt-1 text-xs text-gray-500">
                Responsável, subcategoria e datas selecionadas serão aplicados a todos os itens.
              </p>
              <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                <div className="flex items-center justify-between">
                  <span>
                    {bulkPreviewCount === 0
                      ? 'Nenhum item válido ainda.'
                      : `${bulkPreviewCount} item(s) serão criados.`}
                  </span>
                  {bulkPreviewCount > 0 && (
                    <span className="text-[11px] text-gray-400">
                      {bulkPreviewCount > 20
                        ? 'Mostrando primeiras linhas.'
                        : 'Revise abaixo antes de salvar.'}
                    </span>
                  )}
                </div>
                <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-sm text-gray-700">
                  {bulkPreviewCount === 0 ? (
                    <li className="italic text-gray-400">Digite uma linha para ver a prévia.</li>
                  ) : (
                    bulkPreview.slice(0, 20).map((linha, index) => (
                      <li key={`${index}-${linha}`} className="flex gap-2">
                        <span className="text-xs text-gray-400">{index + 1}.</span>
                        <span className="flex-1 break-words">{linha}</span>
                      </li>
                    ))
                  )}
                </ul>
                {bulkPreviewCount > 20 && (
                  <p className="mt-2 text-[11px] text-gray-400">
                    + {bulkPreviewCount - 20} linha(s) adicionais não exibidas.
                  </p>
                )}
              </div>
            </>
          ) : (
            <input
              type="text"
              name="descricao_item"
              id="form-descricao"
              value={formData.descricao_item}
              onChange={handleFormChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm text-gray-900"
              placeholder="Ex: Comprar carvão"
              required
            />
          )}
        </div>

        <div>
          <label
            htmlFor="form-responsavel"
            className="block text-sm font-medium text-gray-700"
          >
            Responsável (Opcional)
          </label>
          <input
            type="text"
            name="responsavel"
            id="form-responsavel"
            value={formData.responsavel}
            onChange={handleFormChange}
            list="lista-responsaveis"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm text-gray-900"
            placeholder="Ex: Maicon"
          />
          <datalist id="lista-responsaveis">
            {LISTA_RESPONSAVEIS.map((nome) => (
              <option key={nome} value={nome} />
            ))}
          </datalist>
        </div>

        <div>
          <label
            htmlFor="form-categoria"
            className="block text-sm font-medium text-gray-700"
          >
            Categoria
          </label>
          <select
            name="categoria"
            id="form-categoria"
            value={formData.categoria}
            onChange={handleFormChange}
            disabled={isEditMode} // Desabilita a mudança de categoria na edição
            className="mt-1 block w-full rounded-md border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            {CATEGORIA_OPCOES.map((categoria) => (
              <option key={categoria} value={categoria}>
                {categoria}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="form-subcategoria"
            className="block text-sm font-medium text-gray-700"
          >
            Subcategoria (Opcional)
          </label>
          <select
            name="subcategoria_id"
            id="form-subcategoria"
            value={formData.subcategoria_id ?? NO_SUBCATEGORY_VALUE}
            onChange={handleFormChange}
            className="mt-1 block w-full rounded-md border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm text-gray-900"
          >
            <option value={NO_SUBCATEGORY_VALUE}>Sem subcategoria</option>
            {subcategoriasDaCategoria.map((subcategoria) => (
              <option key={subcategoria.id} value={subcategoria.id}>
                {subcategoria.nome}
              </option>
            ))}
            {formData.subcategoria_id &&
              !subcategoriasDaCategoria.some(
                (sub) => sub.id === formData.subcategoria_id
              ) && (
                <option value={formData.subcategoria_id}>
                  {selectedSubcategoria?.nome ?? 'Subcategoria atual'}
                </option>
              )}
          </select>
          {subcategoriasLoading && (
            <p className="mt-2 text-xs text-gray-400">
              Carregando subcategorias...
            </p>
          )}
          <p className="mt-3 text-xs text-gray-400">
            Gerencie novas subcategorias pelo botão de configurações em cada
            categoria.
          </p>
        </div>

        {/* Seleção de Data (Botões) */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Datas do Evento
          </label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {DATAS_EVENTO.map((data) => {
              const selecionado = formData.data_alvo.includes(data.valor);
              return (
                <button
                  key={data.valor}
                  type="button"
                  onClick={() => handleDateToggle(data.valor)}
                  className={`rounded-lg py-2 px-3 text-sm font-medium transition-all ${
                    selecionado
                      ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-500 ring-offset-1'
                      : 'bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {data.nome}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => handleDateToggle('clear')}
              className={`rounded-lg py-2 px-3 text-sm font-medium transition-all ${
                formData.data_alvo.length === 0
                  ? 'bg-slate-200 text-slate-700 shadow-inner'
                  : 'bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
              }`}
            >
              Sem data específica
            </button>
          </div>
          {formData.data_alvo.length > 1 && (
            <p className="mt-2 text-xs text-gray-500">
              Selecionado para {formData.data_alvo.length} dias.
            </p>
          )}
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex justify-center rounded-lg border border-transparent bg-emerald-600 py-3 px-5 text-base font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:bg-gray-300"
          >
            {loading
              ? 'A guardar...'
              : isEditMode
              ? 'Guardar Alterações'
              : 'Adicionar Item'}
          </button>
        </div>
      </form>
    </div>
  );
}

