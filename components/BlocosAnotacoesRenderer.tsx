'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase/client';
import {
  ChatBubbleLeftRightIcon,
  PencilSquareIcon,
  Bars3Icon, // <-- MUDANÇA: Ícone para o "drag handle"
} from '@heroicons/react/24/outline';

// --- MUDANÇA: Imports do dnd-kit ---
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
// --- Fim da Mudança ---

export type Bloco = {
  id: string;
  created_at: string;
  titulo_bloco: string;
  conteudo_bloco: string | null;
  ordem_exibicao: number | null;
};

// --- Hook de Debounce (sem mudanças) ---
function useDebounce(value: string, delay: number) {
  // ... (código do hook useDebounce permanece o mesmo)
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}
// --- Fim Hook ---

// --- MUDANÇA: O Card agora é "Sortable" (Arrastável) ---
type BlocoCardProps = {
  bloco: Bloco;
  onDelete: (id: string) => void;
  onUpdate: (id: string, novoConteudo: string) => Promise<any>;
};

function SortableBlocoCard({ bloco, onDelete, onUpdate }: BlocoCardProps) {
  const [conteudo, setConteudo] = useState(bloco.conteudo_bloco || '');
  const [status, setStatus] = useState<
    'idle' | 'typing' | 'saving' | 'saved' | 'error'
  >('idle');

  const debouncedConteudo = useDebounce(conteudo, 1000);

  // Lógica de Debounce (sem mudanças)
  useEffect(() => {
    if (status === 'typing' && debouncedConteudo !== (bloco.conteudo_bloco || '')) {
      setStatus('saving');

      onUpdate(bloco.id, debouncedConteudo)
        .then(() => {
          setStatus('saved');
          setTimeout(() => setStatus('idle'), 2000);
        })
        .catch(() => {
          setStatus('error');
        });
    }
  }, [debouncedConteudo, bloco.id, bloco.conteudo_bloco, onUpdate, status]);

  useEffect(() => {
    if (status !== 'typing' && status !== 'saving') {
      setConteudo(bloco.conteudo_bloco || '');
    }
  }, [bloco.conteudo_bloco, status]);

  const getStatusText = () => {
    if (status === 'typing') return 'Digitando...';
    if (status === 'saving') return 'Salvando...';
    if (status === 'saved') return 'Salvo!';
    if (status === 'error') return 'Falha ao salvar.';
    return 'Salvo automaticamente.'; // idle
  };

  // --- MUDANÇA: Hook useSortable ---
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging, // <-- Opcional: bom para estilização
  } = useSortable({
    id: bloco.id,
    data: bloco, // Anexa o bloco inteiro aos dados do evento
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1, // <-- Opcional: fica levemente transparente ao arrastar
  };
  // --- Fim da Mudança ---

  return (
    // --- MUDANÇA: 'ref' e 'style' aplicados aqui ---
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white p-5 rounded-xl shadow-lg relative"
    >
      <button
        onClick={() => onDelete(bloco.id)}
        className="absolute top-3 right-3 text-gray-400 hover:text-red-600 transition-colors z-10"
        title="Excluir anotação"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24"
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

      {/* --- MUDANÇA: Adiciona o "Drag Handle" --- */}
      <div className="flex items-center mb-3 pr-6">
        <button
          {...attributes}
          {...listeners}
          className="text-gray-400 hover:bg-gray-100 p-1 rounded-md cursor-grab active:cursor-grabbing mr-2"
          title="Reordenar anotação"
        >
          <Bars3Icon className="h-5 w-5" />
        </button>
        <h3 className="font-bold text-xl text-gray-800">
          {bloco.titulo_bloco}
        </h3>
      </div>
      {/* --- Fim da Mudança --- */}

      <textarea
        value={conteudo}
        onChange={(e) => {
          setConteudo(e.target.value);
          setStatus('typing');
        }}
        className={`w-full h-32 p-3 border rounded-md shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm text-gray-900 placeholder-gray-500 ${
          status === 'error' ? 'border-red-500' : 'border-gray-200'
        }`}
        placeholder="Digite suas anotações aqui..."
      />
      <p
        className={`text-xs mt-2 text-right ${
          status === 'error' ? 'text-red-500' : 'text-gray-400'
        }`}
      >
        {getStatusText()}
      </p>
    </div>
  );
}
// --- Fim Componente de Card ---

// --- Componente Principal das Anotações ---
export default function BlocosAnotacoesRenderer() {
  const [blocos, setBlocos] = useState<Bloco[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [novoBlocoTitulo, setNovoBlocoTitulo] = useState('');

  // Função de busca (sem mudanças)
  const fetchBlocos = async () => {
    setPageLoading(true);
    const { data, error } = await supabase
      .from('BlocosAnotacoes')
      .select('*')
      .order('ordem_exibicao', { ascending: true, nullsFirst: false });

    if (error) {
      console.error('Erro ao buscar BlocosAnotacoes:', error);
      setError('Não foi possível carregar as anotações.');
    } else {
      setBlocos(data as Bloco[]);
    }
    setPageLoading(false);
  };

  // Hook de Realtime (sem mudanças na lógica de subscription)
  useEffect(() => {
    fetchBlocos();

    const channel = supabase
      .channel('public:BlocosAnotacoes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'BlocosAnotacoes' },
        (payload) => {
          console.log('Mudança nas Anotações!', payload);
          if (payload.eventType === 'INSERT') {
            const newItem = payload.new as Bloco;
            setBlocos((prev) =>
              [...prev, newItem].sort(
                (a, b) => (a.ordem_exibicao ?? 99) - (b.ordem_exibicao ?? 99)
              )
            );
          }
          if (payload.eventType === 'UPDATE') {
            const updatedItem = payload.new as Bloco;
            setBlocos((prev) =>
              prev
                .map((item) => (item.id === updatedItem.id ? updatedItem : item))
                .sort(
                  (a, b) => (a.ordem_exibicao ?? 99) - (b.ordem_exibicao ?? 99)
                )
            );
          }
          if (payload.eventType === 'DELETE') {
            const deletedItem = payload.old as Bloco;
            setBlocos((prev) =>
              prev.filter((item) => item.id !== deletedItem.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // handleAddBloco (sem mudanças)
  const handleAddBloco = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novoBlocoTitulo.trim().length < 3) {
      setError('O título deve ter pelo menos 3 caracteres.');
      return;
    }
    setLoading(true);
    setError(null);

    const { count: currentBlockCount, error: countError } = await supabase
      .from('BlocosAnotacoes')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Erro ao buscar contagem de blocos:', countError);
      setError('Falha ao verificar a ordem. Tente novamente.');
      setLoading(false);
      return;
    }

    const newOrder = currentBlockCount ?? 0;

    const { error: insertError } = await supabase
      .from('BlocosAnotacoes')
      .insert({
        titulo_bloco: novoBlocoTitulo,
        conteudo_bloco: '',
        ordem_exibicao: newOrder,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao adicionar bloco:', insertError.message);
      setError('Falha ao adicionar bloco.');
      setLoading(false);
      return;
    }
    setNovoBlocoTitulo('');
    setLoading(false);
  };

  // handleDeleteBloco (sem mudanças)
  const handleDeleteBloco = async (blocoId: string) => {
    setBlocos((prevBlocos) => prevBlocos.filter((b) => b.id !== blocoId));
    const { error: deleteError } = await supabase
      .from('BlocosAnotacoes')
      .delete()
      .match({ id: blocoId });

    if (deleteError) {
      console.error('Erro ao deletar bloco:', deleteError);
      setError('Falha ao deletar o bloco.');
    }
  };

  // handleUpdateBloco (sem mudanças)
  const handleUpdateBloco = async (blocoId: string, novoConteudo: string) => {
    setBlocos((prevBlocos) =>
      prevBlocos.map((b) =>
        b.id === blocoId ? { ...b, conteudo_bloco: novoConteudo } : b
      )
    );
    return supabase
      .from('BlocosAnotacoes')
      .update({ conteudo_bloco: novoConteudo })
      .match({ id: blocoId });
  };

  // --- MUDANÇA: Lógica do Drag-n-Drop ---
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      // 1. Atualiza o estado local (UI instantânea)
      const oldIndex = blocos.findIndex((b) => b.id === active.id);
      const newIndex = blocos.findIndex((b) => b.id === over.id);
      
      // O arrayMove é do @dnd-kit/sortable
      const newBlocosOrder = arrayMove(blocos, oldIndex, newIndex);
      setBlocos(newBlocosOrder);

      // 2. Cria o array de updates para o Supabase
      // Diferente dos Itens, aqui é mais simples: a ordem é o índice.
      const updates = newBlocosOrder.map((bloco, index) => ({
        id: bloco.id,
        ordem_exibicao: index, // A nova ordem é o índice no array
      }));

      // 3. Envia os updates em paralelo
      const updatePromises = updates.map((upd) =>
        supabase
          .from('BlocosAnotacoes')
          .update({ ordem_exibicao: upd.ordem_exibicao })
          .eq('id', upd.id)
      );

      const responses = await Promise.all(updatePromises);
      const updateError = responses.find((res) => res.error)?.error;

      if (updateError) {
        console.error('Falha ao reordenar anotações:', updateError);
        setError('Não foi possível salvar a nova ordem das anotações.');
        // Reverte a ordem buscando os dados do banco
        fetchBlocos();
      }
    }
  }
  // --- Fim da Mudança ---

  return (
    // --- MUDANÇA: DndContext envolve o container ---
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        {/* Header (Novo Estilo) */}
        <div className="flex items-center p-4 md:p-5 border-b border-gray-200 bg-gray-100 text-gray-800 rounded-t-xl">
          <ChatBubbleLeftRightIcon className="h-6 w-6 mr-3 flex-shrink-0" />
          <h2 className="text-xl font-bold">Anotações</h2>
        </div>

        {/* Formulário (Novo Estilo) */}
        <form
          onSubmit={handleAddBloco}
          className="bg-white p-5 rounded-b-xl shadow-lg -mt-6"
        >
          <div className="flex items-center mb-3">
            <PencilSquareIcon className="h-5 w-5 mr-2 text-gray-600" />
            <h3 className="text-lg font-bold text-gray-800">
              Criar Nova Anotação
            </h3>
          </div>
          {error && (
            <div
              className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm"
              onClick={() => setError(null)}
            >
              {error} (Clique para fechar)
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={novoBlocoTitulo}
              onChange={(e) => {
                setNovoBlocoTitulo(e.target.value);
                setError(null);
              }}
              className="flex-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm text-gray-900 placeholder-gray-500"
              placeholder="Título (Ex: Lista do Churrasco)"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto inline-flex justify-center rounded-lg border border-transparent bg-emerald-600 py-2 px-5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:bg-gray-300"
            >
              {loading ? 'Criando...' : 'Criar'}
            </button>
          </div>
        </form>

        {pageLoading && (
          <div className="bg-white p-6 rounded-xl shadow-lg h-full text-center text-gray-500">
            Carregando anotações...
          </div>
        )}

        {!pageLoading && blocos.length === 0 && (
          <p className="text-gray-500 text-center py-4">
            Nenhuma anotação. Crie uma acima!
          </p>
        )}

        {/* --- MUDANÇA: SortableContext envolve os cards --- */}
        <SortableContext
          items={blocos.map((b) => b.id)}
          strategy={verticalListSortingStrategy}
        >
          {/* O .sort() aqui é desnecessário pois o realtime já ordena */}
          {blocos.map((bloco) => (
            <SortableBlocoCard
              key={bloco.id}
              bloco={bloco}
              onDelete={handleDeleteBloco}
              onUpdate={handleUpdateBloco}
            />
          ))}
        </SortableContext>
        {/* --- Fim da Mudança --- */}
      </div>
    </DndContext>
  );
}

