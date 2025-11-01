'use client';

import { useState, useEffect, Fragment, useRef } from 'react';
import { supabase } from '../lib/supabase/client';
import { Item } from './ItensListaRenderer';
import FormularioAddItem from './FormularioAddItem'; // Reutilizamos o formulário

// --- MUDANÇA: Imports de Auth ---
import { useAuth } from '../lib/auth-context';
import { UserIcon } from '@heroicons/react/24/solid';
// --- Fim da Mudança ---

type Comentario = {
  id: string;
  created_at: string;
  conteudo: string;
  item_id: string;
  user_id: string;
  // --- MUDANÇA: 'autor_name' removido ---
  // Vamos buscar os detalhes do usuário
  users: {
    raw_user_meta_data: {
      name: string;
      avatar_url: string;
    };
  } | null;
};

type Tab = 'detalhes' | 'comentarios';

type ItemDetalhesModalProps = {
  item: Item | 'novo';
  isOpen: boolean;
  onClose: () => void;
  initialTab?: Tab;
};

export default function ItemDetalhesModal({
  item,
  isOpen,
  onClose,
  initialTab = 'detalhes',
}: ItemDetalhesModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  // Zera a aba para 'detalhes' se for um item novo
  useEffect(() => {
    if (item === 'novo') {
      setActiveTab('detalhes');
    } else {
      setActiveTab(initialTab);
    }
  }, [item, initialTab]);

  // Lógica de fechar (clique fora, etc.)
  if (!isOpen) return null;

  const isNewItem = item === 'novo';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho com Título e Tabs */}
        <div className="bg-gray-50 p-5 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {isNewItem
              ? 'Adicionar Novo Item'
              : (item as Item).descricao_item}
          </h2>

          {/* Botão de Fechar */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
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

          {/* Navegação por Tabs (só aparece se NÃO for um item novo) */}
          {!isNewItem && (
            <div className="mt-4">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-6">
                  <button
                    onClick={() => setActiveTab('detalhes')}
                    className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'detalhes'
                        ? 'border-emerald-500 text-emerald-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Detalhes
                  </button>
                  <button
                    onClick={() => setActiveTab('comentarios')}
                    className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'comentarios'
                        ? 'border-emerald-500 text-emerald-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Comentários
                  </button>
                </nav>
              </div>
            </div>
          )}
        </div>

        {/* Conteúdo das Tabs */}
        <div className="max-h-[70vh] overflow-y-auto">
          {/* Aba 1: Detalhes (Formulário) */}
          <div className={activeTab === 'detalhes' ? 'block' : 'hidden'}>
            <FormularioAddItem
              isModal={true}
              itemParaEditar={isNewItem ? undefined : (item as Item)}
              onSave={() => {
                onClose(); // Fecha o modal ao salvar
              }}
              onClose={onClose}
            />
          </div>

          {/* Aba 2: Comentários (Só existe se NÃO for item novo) */}
          {!isNewItem && (
            <div className={activeTab === 'comentarios' ? 'block' : 'hidden'}>
              <ComentariosAba item={item as Item} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Componente da Aba de Comentários ---
function ComentariosAba({ item }: { item: Item }) {
  // --- MUDANÇA: Hook de Auth ---
  const { user } = useAuth();
  // --- Fim da Mudança ---

  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [novoComentario, setNovoComentario] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const finalListaRef = useRef<HTMLDivElement>(null);

  // Função de Busca
  const fetchComentarios = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('comentarios') // Nome da tabela em minúsculo
      .select(
        `
        *,
        users (
          raw_user_meta_data
        )
      `
      )
      .eq('item_id', item.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erro ao buscar comentários:', error);
      setError('Não foi possível carregar os comentários.');
    } else {
      setComentarios(data as any[]);
    }
    setLoading(false);
  };

  // Efeito de Busca Inicial e Realtime
  useEffect(() => {
    fetchComentarios();

    // Realtime
    const channel = supabase
      .channel(`comentarios-item-${item.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comentarios',
          filter: `item_id=eq.${item.id}`,
        },
        async (payload) => {
          // Precisamos buscar o comentário + dados do usuário
          const { data, error } = await supabase
            .from('comentarios')
            .select(
              `
              *,
              users (
                raw_user_meta_data
              )
            `
            )
            .eq('id', payload.new.id)
            .single();

          if (!error && data) {
            setComentarios((prev) => [...prev, data as any]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [item.id]);

  // Efeito para rolar para o final
  useEffect(() => {
    finalListaRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comentarios]);

  // Enviar Comentário
  const handleSubmitComentario = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // --- MUDANÇA: Verificação de Auth ---
    if (!user) {
      setFormError('Você precisa estar logado para comentar.');
      return;
    }
    // --- Fim da Mudança ---

    if (novoComentario.trim().length < 3) {
      setFormError('O comentário deve ter pelo menos 3 caracteres.');
      return;
    }

    const { error: insertError } = await supabase
      .from('comentarios')
      .insert({
        conteudo: novoComentario.trim(),
        item_id: item.id,
        // --- MUDANÇA: 'user_id' e 'autor_name' removidos ---
        // O user_id é pego automaticamente pelo Supabase (auth.uid())
        // O autor_name foi removido da tabela
        // --- Fim da Mudança ---
      });

    if (insertError) {
      console.error('Erro ao inserir comentário:', insertError);
      setFormError('Falha ao enviar comentário.');
    } else {
      setNovoComentario('');
      // O Realtime cuidará de adicionar o comentário à UI
    }
  };

  // Helper para pegar o nome/avatar
  const getUserDisplay = (comentario: Comentario) => {
    const metadata = comentario.users?.raw_user_meta_data;
    return {
      name: metadata?.name || 'Usuário',
      avatarUrl: metadata?.avatar_url || null,
    };
  };

  return (
    <div className="p-5">
      {/* Lista de Comentários */}
      <div className="space-y-4 mb-5">
        {loading && <p className="text-gray-500">Carregando comentários...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {!loading && comentarios.length === 0 && (
          <p className="text-gray-500 text-center text-sm py-4">
            Nenhum comentário ainda. Seja o primeiro!
          </p>
        )}

        {comentarios.map((comentario) => {
          const { name, avatarUrl } = getUserDisplay(comentario);
          return (
            <div key={comentario.id} className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                {avatarUrl ? (
                  <img
                    className="h-8 w-8 rounded-full"
                    src={avatarUrl}
                    alt={name}
                  />
                ) : (
                  <span className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <UserIcon className="h-5 w-5 text-gray-500" />
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{name}</p>
                <p className="text-sm text-gray-700">{comentario.conteudo}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(comentario.created_at).toLocaleString('pt-BR', {
                    day: 'numeric',
                    month: 'short',
                    hour: 'numeric',
                    minute: 'numeric',
                  })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={finalListaRef} />
      </div>

      {/* Formulário de Novo Comentário */}
      <form onSubmit={handleSubmitComentario} className="mt-4 border-t pt-4">
        <textarea
          value={novoComentario}
          onChange={(e) => {
            setNovoComentario(e.target.value);
            setFormError(null);
          }}
          className="w-full p-2 border rounded-md shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm text-gray-900 placeholder-gray-500"
          placeholder="Escreva seu comentário..."
          rows={3}
        />
        {/* --- MUDANÇA: Campo 'Seu nome' removido --- */}

        {formError && (
          <p className="text-red-500 text-sm mt-2">{formError}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-3 inline-flex justify-center rounded-lg border border-transparent bg-emerald-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:bg-gray-300"
        >
          {loading ? 'Enviando...' : 'Comentar'}
        </button>
      </form>
    </div>
  );
}

