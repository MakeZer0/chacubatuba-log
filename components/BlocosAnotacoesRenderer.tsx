'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase/client';
// --- MUDANÇA: Importar toast ---
import toast from 'react-hot-toast';
// --- Fim da Mudança ---
import {
  ChatBubbleLeftRightIcon,
  PencilSquareIcon,
  Bars3Icon,
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

export type Bloco = {
  id: string;
  created_at: string;
  titulo_bloco: string;
  conteudo_bloco: string | null;
  ordem_exibicao: number | null;
};

function useDebounce(value: string, delay: number) {
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

// --- MUDANÇA: Agora é um Card "Sortable" ---
function SortableBlocoCard({
  bloco,
  onDelete,
  onUpdate,
}: {
  bloco: Bloco;
  onDelete: (id: string) => void;
  onUpdate: (id: string, novoConteudo: string) => Promise<any>;
}) {
  const [conteudo, setConteudo] = useState(bloco.conteudo_bloco || '');
  const [status, setStatus] = useState<
    'idle' | 'typing' | 'saving' | 'saved' | 'error'
  >('idle');

  const debouncedConteudo = useDebounce(conteudo, 1000);

  // --- MUDANÇA: Hook 'useSortable' ---
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: bloco.id, data: bloco });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  // --- Fim da Mudança ---

  useEffect(() => {
    if (status === 'typing' && debouncedConteudo !== (bloco.conteudo_bloco || '')) {
      setStatus('saving');

      // --- MUDANÇA: Toasts para o Autosave ---
      const savePromise = onUpdate(bloco.id, debouncedConteudo);
      toast.promise(
        savePromise,
        {
          loading: 'Salvando...',
          success: 'Anotação salva!',
          error: 'Falha ao salvar.',
        },
        { id: `save-${bloco.id}` } // ID para evitar toasts duplicados
      );
      // --- Fim da Mudança ---

      savePromise
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

  return (
    <div
      ref={setNodeRef} // <-- MUDANÇA
      style={style} // <-- MUDANÇA
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

      <div className="flex items-center mb-3 pr-6">
        {/* --- MUDANÇA: Drag Handle --- */}
        <button
          {...attributes}
          {...listeners}
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center text-gray-400 hover:bg-gray-100 rounded-md cursor-grab active:cursor-grabbing mr-2"
          style={{ touchAction: 'none' }}
          title="Reordenar anotação"
        >
          <Bars3Icon className="h-5 w-5" />
        </button>
        {/* --- Fim da Mudança --- */}
        <h3 className="font-bold text-xl text-gray-800">
          {bloco.titulo_bloco}
        </h3>
      </div>

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

export default function BlocosAnotacoesRenderer() {
  const [blocos, setBlocos] = useState<Bloco[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [novoBlocoTitulo, setNovoBlocoTitulo] = useState('');

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

  useEffect(() => {
    fetchBlocos();

    const channel = supabase
      .channel('public:BlocosAnotacoes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'BlocosAnotacoes' },
        (payload) => {
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
      toast.error('Falha ao adicionar anotação.'); // <-- MUDANÇA
      setLoading(false);
      return;
    }

    toast.success('Anotação criada!'); // <-- MUDANÇA
    setNovoBlocoTitulo('');
    setLoading(false);
  };

  const handleDeleteBloco = async (blocoId: string) => {
    const oldBlocos = blocos;
    setBlocos((prevBlocos) => prevBlocos.filter((b) => b.id !== blocoId));
    
    const { error: deleteError } = await supabase
      .from('BlocosAnotacoes')
      .delete()
      .match({ id: blocoId });

    if (deleteError) {
      console.error('Erro ao deletar bloco:', deleteError);
      setError('Falha ao deletar o bloco.');
      toast.error('Falha ao eliminar anotação.'); // <-- MUDANÇA
      setBlocos(oldBlocos); // Reverte
    } else {
      toast.success('Anotação eliminada.'); // <-- MUDANÇA
    }
  };

  const handleUpdateBloco = async (blocoId: string, novoConteudo: string) => {
    // A atualização otimista é tratada pelo hook de debounce
    return supabase
      .from('BlocosAnotacoes')
      .update({ conteudo_bloco: novoConteudo })
      .match({ id: blocoId });
  };

  // --- MUDANÇA: Lógica de Drag-n-Drop ---
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

    const activeBloco =
      (active.data.current as Bloco | undefined) ||
      blocos.find((bloco) => bloco.id === active.id);

    if (!activeBloco) {
      return;
    }

    const previousBlocos = blocos.map((bloco) => ({ ...bloco }));

    const oldIndex = previousBlocos.findIndex((bloco) => bloco.id === active.id);
    const newIndex = previousBlocos.findIndex((bloco) => bloco.id === over.id);

    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
      return;
    }

    const reordered = arrayMove(previousBlocos, oldIndex, newIndex).map(
      (bloco, index) => ({ ...bloco, ordem_exibicao: index })
    );

    setBlocos(reordered);

    const updatePromises = reordered.map((bloco) =>
      supabase
        .from('BlocosAnotacoes')
        .update({ ordem_exibicao: bloco.ordem_exibicao })
        .match({ id: bloco.id })
    );

    try {
      const responses = await Promise.all(updatePromises);
      const updateError = responses.find((res) => res.error)?.error;

      if (updateError) {
        console.error('Falha ao reordenar anotações:', updateError);
        toast.error('Falha ao salvar nova ordem.');
        setBlocos(previousBlocos);
      } else {
        toast.success('Ordem das anotações salva!');
      }
    } catch (error) {
      console.error('Erro ao persistir nova ordem:', error);
      toast.error('Falha ao salvar nova ordem.');
      setBlocos(previousBlocos);
    }
  }
  // --- Fim da Mudança ---

  return (
    <div className="space-y-6">
      <div className="flex items-center p-4 md:p-5 border-b border-gray-200 bg-gray-100 text-gray-800 rounded-t-xl">
        <ChatBubbleLeftRightIcon className="h-6 w-6 mr-3 flex-shrink-0" />
        <h2 className="text-xl font-bold">Anotações</h2>
      </div>

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

      {/* --- MUDANÇA: Contexto de Sortable --- */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={blocos.map((b) => b.id)}
          strategy={verticalListSortingStrategy}
        >
          {blocos.map((bloco) => (
            <SortableBlocoCard
              key={bloco.id}
              bloco={bloco}
              onDelete={handleDeleteBloco}
              onUpdate={handleUpdateBloco}
            />
          ))}
        </SortableContext>
      </DndContext>
      {/* --- Fim da Mudança --- */}
    </div>
  );
}

