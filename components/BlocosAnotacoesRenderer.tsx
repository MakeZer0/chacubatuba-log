'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase/client';
// --- MUDANÇA: Ícones ---
import {
  ChatBubbleLeftRightIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';

// O tipo Bloco permanece o mesmo
export type Bloco = {
  id: string;
  created_at: string;
  titulo_bloco: string;
  conteudo_bloco: string | null;
  ordem_exibicao: number;
};

// --- Hook de Debounce ---
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
// --- Fim Hook ---

// --- Componente de Card (Auto-Save CORRIGIDO) ---
type BlocoCardProps = {
  bloco: Bloco;
  onDelete: (id: string) => void;
  // onUpdate agora retorna uma Promessa
  onUpdate: (id: string, novoConteudo: string) => Promise<any>;
};

function BlocoCard({ bloco, onDelete, onUpdate }: BlocoCardProps) {
  const [conteudo, setConteudo] = useState(bloco.conteudo_bloco || '');
  // Adicionado status 'typing' e 'error'
  const [status, setStatus] =
    useState<'idle' | 'typing' | 'saving' | 'saved' | 'error'>('idle');

  const debouncedConteudo = useDebounce(conteudo, 1000);

  // Efeito para salvar automaticamente
  useEffect(() => {
    // Lógica de salvamento corrigida
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

  // Sincroniza o estado local se o prop (do DB) mudar
  useEffect(() => {
    // Só atualiza se o usuário não estiver digitando
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
    <div className="bg-white p-5 rounded-xl shadow-lg relative">
      <button
        onClick={() => onDelete(bloco.id)}
        className="absolute top-3 right-3 text-gray-400 hover:text-red-600 transition-colors"
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

      <h3 className="font-bold text-xl text-gray-800 mb-3 pr-6">
        {bloco.titulo_bloco}
      </h3>
      <textarea
        value={conteudo}
        onChange={(e) => {
          setConteudo(e.target.value);
          // Define como 'digitando'
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
  // Remove 'initialData' e busca seus próprios dados
  const [blocos, setBlocos] = useState<Bloco[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false); // Loading do 'Adicionar'
  const [pageLoading, setPageLoading] = useState(true); // Loading inicial
  const [novoBlocoTitulo, setNovoBlocoTitulo] = useState('');

  // Hook para buscar os dados das anotações
  useEffect(() => {
    const fetchBlocos = async () => {
      setPageLoading(true);
      const { data, error } = await supabase
        .from('BlocosAnotacoes')
        .select('*')
        .order('ordem_exibicao', { ascending: true });

      if (error) {
        console.error('Erro ao buscar BlocosAnotacoes:', error);
        setError('Não foi possível carregar as anotações.');
      } else {
        setBlocos(data as Bloco[]);
      }
      setPageLoading(false);
    };
    fetchBlocos();
  }, []);
  // *******************

  // Função para adicionar um novo bloco de anotação
  const handleAddBloco = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novoBlocoTitulo.trim().length < 3) {
      setError('O título deve ter pelo menos 3 caracteres.');
      return;
    }
    setLoading(true);
    setError(null);
    const { data: newBlocoData, error: insertError } = await supabase
      .from('BlocosAnotacoes')
      .insert({
        titulo_bloco: novoBlocoTitulo,
        conteudo_bloco: '',
        ordem_exibicao: blocos.length + 1,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao adicionar bloco:', insertError.message);
      setError('Falha ao adicionar bloco.');
      setLoading(false);
      return;
    }
    if (newBlocoData) {
      setBlocos((prevBlocos) => [...prevBlocos, newBlocoData as Bloco]);
    }
    setNovoBlocoTitulo('');
    setLoading(false);
  };

  // Função para DELETAR um bloco
  const handleDeleteBloco = async (blocoId: string) => {
    const blocoParaDeletar = blocos.find((b) => b.id === blocoId);
    if (!blocoParaDeletar) return;
    setBlocos((prevBlocos) => prevBlocos.filter((b) => b.id !== blocoId));
    const { error: deleteError } = await supabase
      .from('BlocosAnotacoes')
      .delete()
      .match({ id: blocoId });

    if (deleteError) {
      console.error('Erro ao deletar bloco:', deleteError);
      setError('Falha ao deletar o bloco.');
      setBlocos((prevBlocos) => [...prevBlocos, blocoParaDeletar]);
    }
  };

  // Função para ATUALIZAR o conteúdo de um bloco
  const handleUpdateBloco = async (blocoId: string, novoConteudo: string) => {
    // Atualiza o estado principal (para garantir)
    setBlocos((prevBlocos) =>
      prevBlocos.map((b) =>
        b.id === blocoId ? { ...b, conteudo_bloco: novoConteudo } : b
      )
    );

    // Retorna a promessa para o BlocoCard saber quando terminou
    return supabase
      .from('BlocosAnotacoes')
      .update({ conteudo_bloco: novoConteudo })
      .match({ id: blocoId });

    // (A lógica de erro agora é tratada no BlocoCard)
  };

  return (
    <div className="space-y-6">
      {/* --- MUDANÇA: Header Temático --- */}
      <div className="bg-stone-100 text-stone-800 flex items-center p-4 md:p-5 rounded-t-xl border-b">
        <ChatBubbleLeftRightIcon className="h-6 w-6 mr-3 flex-shrink-0" />
        <h2 className="text-2xl font-semibold">Anotações</h2>
      </div>
      {/* --- Fim da Mudança --- */}

      {/* --- MUDANÇA: Form com Header Temático --- */}
      <form
        onSubmit={handleAddBloco}
        className="bg-white rounded-xl shadow-lg overflow-hidden"
      >
        <div className="flex items-center p-4 bg-gray-50 border-b">
          <PencilSquareIcon className="h-5 w-5 mr-3 text-gray-600" />
          <h3 className="text-lg font-bold text-gray-800">
            Criar Nova Anotação
          </h3>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div
              className="bg-red-100 text-red-700 p-3 rounded-lg text-sm"
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
        </div>
      </form>
      {/* --- Fim da Mudança --- */}

      {/* Loader da página */}
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

      {/* Mapeia para os cards individuais */}
      {blocos
        .sort(
          (a, b) =>
            (a.ordem_exibicao || 0) - (b.ordem_exibicao || 0) ||
            a.created_at.localeCompare(b.created_at)
        )
        .map((bloco) => (
          <BlocoCard
            key={bloco.id}
            bloco={bloco}
            onDelete={handleDeleteBloco}
            onUpdate={handleUpdateBloco}
          />
        ))}
    </div>
  );
}

