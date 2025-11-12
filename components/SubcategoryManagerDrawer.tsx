'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Dialog } from '@headlessui/react';
import {
  PlusIcon,
  XMarkIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import type { CategoriaId, Subcategoria } from './ItensListaRenderer';
import { supabase } from '@/lib/supabase/client';

const CATEGORY_LABELS: Record<CategoriaId, string> = {
  'Itens Pendentes': 'Itens Pendentes',
  Limpeza: 'Limpeza',
  Jogos: 'Jogos',
  Lazer: 'Lazer',
  'Cardápio': 'Cardápio',
  Snacks: 'Snacks',
  Bebidas: 'Bebidas',
};

type DrawerProps = {
  categoria: CategoriaId | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
};

type SubcategoriaComContagem = Subcategoria & {
  itemCount: number;
};

const getRelationCount = (raw: unknown): number => {
  if (!raw) {
    return 0;
  }

  if (Array.isArray(raw) && raw.length > 0) {
    const entry = raw[0] as Record<string, unknown>;
    const rawCount = entry?.count;
    if (typeof rawCount === 'number') {
      return rawCount;
    }
    if (typeof rawCount === 'string') {
      const parsed = Number.parseInt(rawCount, 10);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
  }

  return 0;
};

export function SubcategoryManagerDrawer({
  categoria,
  isOpen,
  onClose,
  onRefresh,
}: DrawerProps) {
  const [lista, setLista] = useState<SubcategoriaComContagem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [novaSubcategoria, setNovaSubcategoria] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [semSubcategoriaCount, setSemSubcategoriaCount] = useState(0);

  const categoriaLabel = categoria ? CATEGORY_LABELS[categoria] : '';

  const carregarSubcategorias = useCallback(async () => {
    if (!categoria) {
      setLista([]);
      setSemSubcategoriaCount(0);
      return;
    }

    setLoading(true);
    setError(null);

    const [subcatsResult, semSubResult] = await Promise.all([
      supabase
        .from('ItensListaSubcategorias')
        .select('id, nome, ordem, categoria, created_at, ItensLista(count)')
        .eq('categoria', categoria)
        .order('ordem', { ascending: true, nullsFirst: true })
        .order('nome', { ascending: true }),
      supabase
        .from('ItensLista')
        .select('*', { count: 'exact', head: true })
        .eq('categoria', categoria)
        .is('subcategoria_id', null),
    ]);

    if (subcatsResult.error) {
      console.error('Erro ao buscar subcategorias:', subcatsResult.error);
      setError('Não foi possível carregar as subcategorias.');
      toast.error('Falha ao carregar subcategorias.');
      setLoading(false);
      return;
    }

    const subcategoriasNormalizadas: SubcategoriaComContagem[] = (subcatsResult.data ?? []).map(
      (registro: Record<string, unknown>) => {
        const base: Subcategoria = {
          id: String(registro.id),
          created_at: String(registro.created_at ?? new Date().toISOString()),
          categoria: categoria,
          nome: String(registro.nome ?? 'Sem nome'),
          ordem:
            typeof registro.ordem === 'number'
              ? registro.ordem
              : registro.ordem === null
              ? null
              : null,
        };

        const itemCount = getRelationCount(registro.ItensLista);

        return {
          ...base,
          itemCount,
        } satisfies SubcategoriaComContagem;
      }
    );

    setLista(subcategoriasNormalizadas);

    if (semSubResult.error) {
      console.error('Erro ao contar itens sem subcategoria:', semSubResult.error);
      toast.error('Não foi possível contar itens sem subcategoria.');
      setSemSubcategoriaCount(0);
    } else {
      setSemSubcategoriaCount(semSubResult.count ?? 0);
    }

    setLoading(false);
  }, [categoria]);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void carregarSubcategorias();
    } else {
      setLista([]);
      setNovaSubcategoria('');
      setEditingId(null);
      setEditingValue('');
      setError(null);
      setSemSubcategoriaCount(0);
    }
  }, [carregarSubcategorias, isOpen]);

  const handlerFechar = useCallback(() => {
    if (!isSubmitting) {
      onClose();
    }
  }, [isSubmitting, onClose]);

  const descricaoBadge = useMemo(() => {
    if (!categoria) {
      return '';
    }

    if (lista.length === 0 && semSubcategoriaCount === 0) {
      return '';
    }

    const total = lista.reduce((acc, item) => acc + item.itemCount, 0) + semSubcategoriaCount;
    return `${total} itens no total (sem subcategoria: ${semSubcategoriaCount})`;
  }, [categoria, lista, semSubcategoriaCount]);

  const isNomeRepetido = useCallback(
    (nome: string, ignorarId?: string) => {
      const comparador = nome.trim().toLowerCase();
      return lista.some(
        (sub) => sub.id !== ignorarId && sub.nome.trim().toLowerCase() === comparador
      );
    },
    [lista]
  );

  const criarSubcategoria = useCallback(async () => {
    if (!categoria) {
      return;
    }

    const nomeLimpo = novaSubcategoria.trim();
    if (nomeLimpo.length < 2) {
      toast.error('O nome deve ter ao menos 2 caracteres.');
      return;
    }

    if (isNomeRepetido(nomeLimpo)) {
      toast.error('Já existe uma subcategoria com esse nome.');
      return;
    }

    const proximaOrdem = lista.reduce(
      (max, sub) => Math.max(max, sub.ordem ?? -1),
      -1
    ) + 1;

    setIsSubmitting(true);

    const { error } = await supabase
      .from('ItensListaSubcategorias')
      .insert({
        categoria,
        nome: nomeLimpo,
        ordem: proximaOrdem,
      });

    if (error) {
      console.error('Erro ao criar subcategoria:', error);
      toast.error('Não foi possível criar a subcategoria.');
    } else {
      toast.success('Subcategoria criada!');
      setNovaSubcategoria('');
      await carregarSubcategorias();
      onRefresh?.();
    }

    setIsSubmitting(false);
  }, [carregarSubcategorias, categoria, isNomeRepetido, lista, novaSubcategoria, onRefresh]);

  const iniciarEdicao = useCallback((subcategoria: SubcategoriaComContagem) => {
    setEditingId(subcategoria.id);
    setEditingValue(subcategoria.nome);
  }, []);

  const cancelarEdicao = useCallback(() => {
    setEditingId(null);
    setEditingValue('');
  }, []);

  const salvarEdicao = useCallback(async () => {
    if (!editingId) {
      return;
    }

    const nomeLimpo = editingValue.trim();
    if (nomeLimpo.length < 2) {
      toast.error('O nome deve ter ao menos 2 caracteres.');
      return;
    }

    const atual = lista.find((sub) => sub.id === editingId);
    if (!atual) {
      cancelarEdicao();
      return;
    }

    if (atual.nome.trim() === nomeLimpo) {
      cancelarEdicao();
      return;
    }

    if (isNomeRepetido(nomeLimpo, editingId)) {
      toast.error('Já existe uma subcategoria com esse nome.');
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase
      .from('ItensListaSubcategorias')
      .update({ nome: nomeLimpo })
      .eq('id', editingId);

    if (error) {
      console.error('Erro ao renomear subcategoria:', error);
      toast.error('Não foi possível renomear a subcategoria.');
    } else {
      toast.success('Subcategoria renomeada.');
      await carregarSubcategorias();
      cancelarEdicao();
      onRefresh?.();
    }

    setIsSubmitting(false);
  }, [cancelarEdicao, carregarSubcategorias, editingId, editingValue, isNomeRepetido, lista, onRefresh]);

  const removerSubcategoria = useCallback(
    async (subcategoria: SubcategoriaComContagem) => {
      if (subcategoria.itemCount > 0) {
        toast.error('Não é possível remover subcategoria com itens associados.');
        return;
      }

      const confirmacao = window.confirm(
        `Remover a subcategoria "${subcategoria.nome}"? Os itens continuarão disponíveis.`
      );

      if (!confirmacao) {
        return;
      }

      setIsSubmitting(true);

      const { error } = await supabase
        .from('ItensListaSubcategorias')
        .delete()
        .eq('id', subcategoria.id);

      if (error) {
        console.error('Erro ao remover subcategoria:', error);
        toast.error('Não foi possível remover a subcategoria.');
      } else {
        toast.success('Subcategoria removida.');
        await carregarSubcategorias();
        onRefresh?.();
      }

      setIsSubmitting(false);
    },
    [carregarSubcategorias, onRefresh]
  );

  if (!isOpen || !categoria) {
    return null;
  }

  return (
    <Dialog open={isOpen} onClose={handlerFechar} className="relative z-50">
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" onClick={handlerFechar} />

      <div className="fixed inset-y-0 right-0 flex max-w-full">
        <Dialog.Panel className="w-screen max-w-md bg-white shadow-2xl">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <Dialog.Title className="text-lg font-semibold text-gray-900">
                  Gerenciar subcategorias
                </Dialog.Title>
                <p className="text-sm text-gray-500">
                  Categoria: <strong>{categoriaLabel}</strong>
                </p>
                {descricaoBadge && (
                  <p className="mt-1 text-xs text-gray-400">{descricaoBadge}</p>
                )}
              </div>
              <button
                type="button"
                onClick={handlerFechar}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Fechar"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="nova-subcategoria-nome">
                  Nova subcategoria
                </label>
                <div className="flex gap-2">
                  <input
                    id="nova-subcategoria-nome"
                    type="text"
                    value={novaSubcategoria}
                    onChange={(event) => setNovaSubcategoria(event.target.value)}
                    placeholder="Nome da subcategoria"
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={criarSubcategoria}
                    disabled={isSubmitting || loading}
                    className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:bg-gray-300"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Adicionar
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {loading ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                    Carregando subcategorias...
                  </div>
                ) : lista.length === 0 ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                    Nenhuma subcategoria cadastrada para esta categoria.
                  </div>
                ) : (
                  lista.map((subcategoria) => {
                    const emEdicao = editingId === subcategoria.id;

                    return (
                      <div
                        key={subcategoria.id}
                        className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 px-4 py-3"
                      >
                        <div className="flex-1">
                          {emEdicao ? (
                            <input
                              type="text"
                              value={editingValue}
                              onChange={(event) => setEditingValue(event.target.value)}
                              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              autoFocus
                            />
                          ) : (
                            <p className="text-sm font-medium text-gray-900">{subcategoria.nome}</p>
                          )}

                          <p className="mt-1 text-xs text-gray-500">
                            {subcategoria.itemCount === 1
                              ? '1 item vinculado'
                              : `${subcategoria.itemCount} itens vinculados`}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {emEdicao ? (
                            <>
                              <button
                                type="button"
                                onClick={salvarEdicao}
                                className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-200"
                                disabled={isSubmitting}
                              >
                                Salvar
                              </button>
                              <button
                                type="button"
                                onClick={cancelarEdicao}
                                className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
                                disabled={isSubmitting}
                              >
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => iniciarEdicao(subcategoria)}
                                className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-emerald-600"
                                title="Renomear subcategoria"
                              >
                                <PencilSquareIcon className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removerSubcategoria(subcategoria)}
                                className={`rounded-md p-2 ${
                                  subcategoria.itemCount > 0
                                    ? 'cursor-not-allowed text-gray-300'
                                    : 'text-gray-400 hover:bg-red-50 hover:text-red-600'
                                }`}
                                title={
                                  subcategoria.itemCount > 0
                                    ? 'Remova ou recategorize os itens antes de excluir'
                                    : 'Excluir subcategoria'
                                }
                                disabled={subcategoria.itemCount > 0 || isSubmitting}
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
