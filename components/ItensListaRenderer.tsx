'use client'; 

import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabase/client'; 

// O tipo Item agora é definido E exportado aqui
export type Item = {
  id: string;
  created_at: string;
  descricao_item: string;
  responsavel: string | null;
  categoria: 'Itens Pendentes' | 'Jogos' | 'Cardápio' | 'Snacks' | 'Bebidas' | 'Lazer' | 'Limpeza';
  completo: boolean;
};

// O componente agora recebe um 'refreshKey' para saber quando recarregar
type ItensListaRendererProps = {
  refreshKey: boolean;
};

export default function ItensListaRenderer({ refreshKey }: ItensListaRendererProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); // Começa carregando
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');

  // O componente agora busca seus próprios dados
  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('ItensLista')
        .select('*')
        .order('created_at', { ascending: true }); // Você pode mudar para 'ordem_item' se criou

      if (error) {
        console.error("Erro ao buscar ItensLista:", error);
        setError("Não foi possível carregar os itens.");
      } else {
        setItems(data as Item[]);
      }
      setLoading(false);
    };

    fetchItems();
  }, [refreshKey]); // Recarrega os dados quando refreshKey mudar

  // Agrupamos os itens por categoria
  const groupedItems = useMemo(() => {
    const jogos = items.filter(i => i.categoria === 'Jogos');
    const lazer = items.filter(i => i.categoria === 'Lazer');
    const cardapio = items.filter(i => i.categoria === 'Cardápio');
    const snacks = items.filter(i => i.categoria === 'Snacks');
    const bebidas = items.filter(i => i.categoria === 'Bebidas');
    const limpeza = items.filter(i => i.categoria === 'Limpeza');
    const itensPendentes = items.filter(i => i.categoria === 'Itens Pendentes');

    return { jogos, lazer, cardapio, snacks, bebidas, limpeza, itensPendentes };
  }, [items]);

  // (Funções de toggle, delete, update permanecem iguais)
  const handleToggleComplete = async (itemId: string, currentStatus: boolean) => {
    if (editingId === itemId) return;
    const newStatus = !currentStatus;
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, completo: newStatus } : item
      )
    );
    setError(null);
    const { error: updateError } = await supabase
      .from('ItensLista')
      .update({ completo: newStatus })
      .match({ id: itemId });

    if (updateError) {
      console.error('Erro ao atualizar item:', updateError.message);
      setItems(prevItems =>
        prevItems.map(item =>
          item.id === itemId ? { ...item, completo: currentStatus } : item
        )
      );
    }
  };
  const handleDeleteItem = async (itemId: string) => {
    const itemToDelete = items.find(i => i.id === itemId);
    if (!itemToDelete) return;
    setItems(prevItems => prevItems.filter(item => item.id !== itemId));
    setError(null);
    const { error: deleteError } = await supabase
      .from('ItensLista')
      .delete()
      .match({ id: itemId });

    if (deleteError) {
      console.error('Erro ao deletar item (RLS?):', deleteError);
      setError('Falha ao deletar o item. Tente novamente.');
      setItems(prevItems => [...prevItems, itemToDelete]);
    }
  };
  const handleUpdateItem = async (itemId: string, newDescription: string) => {
    const oldItems = [...items];
    const originalItem = oldItems.find(i => i.id === itemId);
    if (!originalItem || newDescription.trim() === originalItem.descricao_item.trim() || newDescription.trim().length === 0) {
      setEditingId(null);
      setEditingText("");
      return;
    }
    setItems(prev => prev.map(i =>
      i.id === itemId ? { ...i, descricao_item: newDescription.trim() } : i
    ));
    setEditingId(null);
    setEditingText("");
    setError(null);
    const { error: updateError } = await supabase
      .from('ItensLista')
      .update({ descricao_item: newDescription.trim() })
      .match({ id: itemId });

    if (updateError) {
      console.error('Erro ao atualizar item:', updateError.message);
      setError('Falha ao salvar a edição.');
      setItems(oldItems);
    }
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditingText("");
  };

  // Componente auxiliar para renderizar uma coluna da lista
  const ListColumn = ({ title, items }: { title: string; items: Item[] }) => (
    <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg h-full">
      <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhum item nesta categoria.</p>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="flex items-center space-x-3 group">
              <input
                type="checkbox"
                id={`item-${item.id}`}
                checked={item.completo}
                onChange={() => handleToggleComplete(item.id, item.completo)}
                disabled={editingId === item.id}
                className="h-5 w-5 rounded text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
              />
              <div className="flex-1">
                {editingId === item.id ? (
                  <input
                    type="text"
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onBlur={() => handleUpdateItem(item.id, editingText)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUpdateItem(item.id, editingText);
                      if (e.key === 'Escape') cancelEdit();
                    }}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
                    autoFocus
                  />
                ) : (
                  <label
                    htmlFor={`item-${item.id}`}
                    className={`flex-1 ${item.completo ? 'line-through text-gray-400' : 'text-gray-700'} ${editingId ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {item.descricao_item}
                    {item.responsavel && (
                      <span className={`ml-2 text-xs font-medium px-2 py-0.5 rounded-full ${item.completo ? 'bg-gray-100 text-gray-400' : 'bg-blue-100 text-blue-700'}`}>
                        {item.responsavel}
                      </span>
                    )}
                  </label>
                )}
              </div>
              <div className="flex items-center space-x-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => {
                    if (!editingId) {
                      setEditingId(item.id);
                      setEditingText(item.descricao_item);
                    }
                  }}
                  disabled={!!editingId}
                  className="text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Editar item"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  disabled={!!editingId}
                  className="text-gray-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Excluir item"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full space-y-6">
      {/* Mostra um erro, se houver */}
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Mostra um loader enquanto os dados iniciais carregam */}
      {loading && items.length === 0 && (
         <div className="bg-white p-6 rounded-xl shadow-lg h-full text-center text-gray-500">
           Carregando itens...
         </div>
      )}

      {/* Renderiza as 7 colunas empilhadas */}
      <ListColumn title="Itens Pendentes" items={groupedItems.itensPendentes} />
      <ListColumn title="Limpeza" items={groupedItems.limpeza} />
      <ListColumn title="Jogos" items={groupedItems.jogos} />
      <ListColumn title="Lazer" items={groupedItems.lazer} />
      <ListColumn title="Cardápio" items={groupedItems.cardapio} />
      <ListColumn title="Snacks" items={groupedItems.snacks} />
      <ListColumn title="Bebidas" items={groupedItems.bebidas} />
    </div>
  );
}