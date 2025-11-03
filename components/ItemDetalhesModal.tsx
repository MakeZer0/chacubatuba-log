'use client';

import { useState, useEffect, Fragment } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import type { Item } from './ItensListaRenderer';
import FormularioAddItem from './FormularioAddItem';
// --- MUDANÇA: Importar toast ---
import toast from 'react-hot-toast';
// --- Fim da Mudança ---
import { Tab } from '@headlessui/react';
import {
  PencilSquareIcon,
  ChatBubbleBottomCenterTextIcon,
  UserCircleIcon,
  XMarkIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Comentario = {
  id: string;
  created_at: string;
  conteudo: string;
  item_id: string;
  user_id: string;
  user: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

type ItemDetalhesModalProps = {
  item: Item | 'novo';
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'detalhes' | 'comentarios';
};

function AbaComentarios({ itemId }: { itemId: string }) {
  const { user } = useAuth();
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [novoComentario, setNovoComentario] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [postError, setPostError] = useState<string | null>(null);

  const fetchComentarios = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('comentarios')
      .select('*, user:users(full_name, avatar_url)')
      .eq('item_id', itemId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar comentários:', error);
      setError('Não foi possível carregar os comentários.');
    } else {
      setComentarios(data as Comentario[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (itemId) {
      fetchComentarios();

      const channel = supabase
        .channel(`comentarios-item-${itemId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'comentarios',
            filter: `item_id=eq.${itemId}`,
          },
          (payload) => {
            const fetchNovoComentario = async () => {
              const { data, error } = await supabase
                .from('comentarios')
                .select('*, user:users(full_name, avatar_url)')
                .eq('id', payload.new.id)
                .single();
              if (data) {
                setComentarios((prev) => [data as Comentario, ...prev]);
              }
            };
            fetchNovoComentario();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'comentarios',
            filter: `item_id=eq.${itemId}`,
          },
          (payload) => {
            setComentarios((prev) =>
              prev.filter((c) => c.id !== payload.old.id)
            );
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [itemId]);

  const handleSubmitComentario = async (e: React.FormEvent) => {
    e.preventDefault();
    setPostError(null);

    if (!user) {
      setPostError('Você precisa estar logado para comentar.');
      return;
    }
    if (novoComentario.trim().length < 3) {
      setPostError('O comentário deve ter pelo menos 3 caracteres.');
      return;
    }

    // --- MUDANÇA: Toasts ---
    const toastId = toast.loading('Enviando comentário...'); // ID para atualizar

    const { error: insertError } = await supabase
      .from('comentarios')
      .insert({
        conteudo: novoComentario,
        item_id: itemId,
        user_id: user.id,
      });

    if (insertError) {
      console.error('Erro ao postar comentário:', insertError);
      setPostError('Falha ao enviar comentário.');
      toast.error('Falha ao enviar comentário.', { id: toastId });
    } else {
      setNovoComentario('');
      setPostError(null);
      toast.success('Comentário enviado!', { id: toastId });
    }
    // --- Fim da Mudança ---
  };

  const formatarData = (dataString: string) => {
    try {
      return format(parseISO(dataString), "dd 'de' MMM, HH:mm", {
        locale: ptBR,
      });
    } catch (e) {
      return 'Data inválida';
    }
  };

  const getNomeAutor = (comentario: Comentario) => {
    return comentario.user?.full_name || 'Usuário Anônimo';
  };

  return (
    <div className="p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4">Comentários</h3>
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm mb-4">
          {error} (Clique para fechar)
        </div>
      )}

      <form onSubmit={handleSubmitComentario} className="mb-6">
        <textarea
          value={novoComentario}
          onChange={(e) => setNovoComentario(e.target.value)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm text-gray-900 placeholder-gray-500"
          placeholder={
            user
              ? 'Escreva seu comentário...'
              : 'Você precisa estar logado para comentar'
          }
          rows={3}
          disabled={!user}
        />
        {postError && (
          <p className="text-red-600 text-sm mt-2">{postError}</p>
        )}
        <button
          type="submit"
          disabled={!user || novoComentario.trim().length === 0}
          className="mt-3 w-full inline-flex justify-center items-center rounded-lg border border-transparent bg-emerald-600 py-2 px-5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:bg-gray-300"
        >
          <PaperAirplaneIcon className="h-5 w-5 mr-2" />
          Comentar
        </button>
      </form>

      <div className="space-y-4">
        {loading && <p className="text-gray-500">Carregando comentários...</p>}
        {!loading && comentarios.length === 0 && (
          <p className="text-gray-500 text-center py-4">
            Nenhum comentário ainda. Seja o primeiro!
          </p>
        )}
        {comentarios.map((comentario) => (
          <div key={comentario.id} className="flex space-x-3">
            <div className="flex-shrink-0">
              {comentario.user?.avatar_url ? (
                <img
                  className="h-10 w-10 rounded-full"
                  src={comentario.user.avatar_url}
                  alt={getNomeAutor(comentario)}
                />
              ) : (
                <span className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <UserCircleIcon className="h-8 w-8 text-gray-500" />
                </span>
              )}
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">
                {getNomeAutor(comentario)}
              </div>
              <p className="text-xs text-gray-500 mb-1">
                {formatarData(comentario.created_at)}
              </p>
              {/* --- MUDANÇA: Correção do typo --- */}
              <p className="text-gray-700 whitespace-pre-wrap">
                {comentario.conteudo}
              </p>
              {/* --- Fim da Mudança --- */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ItemDetalhesModal({
  item,
  isOpen,
  onClose,
  initialTab = 'detalhes',
}: ItemDetalhesModalProps) {
  const isEditMode = item !== 'novo';
  const itemTitulo = isEditMode ? item.descricao_item : 'Adicionar Novo Item';
  const itemParaForm = isEditMode ? item : null;
  const defaultTabIndex = initialTab === 'detalhes' ? 0 : 1;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      } transition-opacity duration-300`}
    >
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        className={`bg-white rounded-2xl shadow-xl w-full max-w-lg z-10 ${
          isOpen ? 'scale-100' : 'scale-95'
        } transition-transform duration-300 overflow-hidden`}
      >
        <div className="flex justify-between items-center p-5 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 truncate pr-4">
            {itemTitulo}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-7 w-7" />
          </button>
        </div>

        <Tab.Group defaultIndex={defaultTabIndex}>
          <Tab.List className="flex space-x-1 rounded-t-none bg-gray-100 p-1 px-4">
            <Tab as={Fragment}>
              {({ selected }) => (
                <button
                  className={`
                    w-full rounded-lg py-2.5 text-sm font-medium leading-5
                    focus:outline-none focus:ring-2 ring-offset-2 ring-offset-emerald-400 ring-white ring-opacity-60
                    ${
                      selected
                        ? 'bg-white text-emerald-700 shadow'
                        : 'text-gray-600 hover:bg-white/[0.6]'
                    }
                  `}
                >
                  <PencilSquareIcon className="h-5 w-5 inline mr-1.5" />
                  Detalhes
                </button>
              )}
            </Tab>
            <Tab as={Fragment} disabled={!isEditMode}>
              {({ selected }) => (
                <button
                  className={`
                    w-full rounded-lg py-2.5 text-sm font-medium leading-5
                    focus:outline-none focus:ring-2 ring-offset-2 ring-offset-emerald-400 ring-white ring-opacity-60
                    ${
                      selected
                        ? 'bg-white text-emerald-700 shadow'
                        : 'text-gray-600 hover:bg-white/[0.6]'
                    }
                    ${
                      !isEditMode
                        ? 'opacity-50 cursor-not-allowed'
                        : ''
                    }
                  `}
                >
                  <ChatBubbleBottomCenterTextIcon className="h-5 w-5 inline mr-1.5" />
                  Comentários
                </button>
              )}
            </Tab>
          </Tab.List>
          <Tab.Panels className="max-h-[70vh] overflow-y-auto">
            <Tab.Panel>
              <FormularioAddItem
                isModal={true}
                onSave={onClose}
                onClose={onClose}
                itemParaEditar={itemParaForm}
              />
            </Tab.Panel>
            <Tab.Panel>
              {isEditMode && <AbaComentarios itemId={item.id} />}
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
  );
}

