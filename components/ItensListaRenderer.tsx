'use client'; // Marca este como um Client Component

import { useState, useMemo } from 'react';
// Importamos o cliente BROWSER singleton
import { supabase } from '@/lib/supabase/client';

// Tipagem para os itens (deve ser consistente com a de page.tsx)
type Item = {
  id: string;
  categoria: 'Jogos' | 'Cardápio' | 'Snacks' | 'Bebidas' | 'Limpeza' | 'Itens Pendentes';
  descricao_item: string;
  responsavel: string | null;
  completo: boolean;
};

// Tipagem para as props do componente
type ItensListaRendererProps = {
  initialData: Item[];
};

export default function ItensListaRenderer({ initialData }: ItensListaRendererProps) {
  // Armazenamos os dados no estado para reatividade imediata na UI
  const [items, setItems] = useState<Item[]>(initialData);
  const [error, setError] = useState<string | null>(null);

  // Agrupamos os itens por categoria usando useMemo para performance
  const groupedItems = useMemo(() => {
    const jogos = items.filter(i => i.categoria === 'Jogos');
    const comidas = items.filter(i => ['Cardápio', 'Snacks', 'Bebidas'].includes(i.categoria));
    const tarefas = items.filter(i => ['Limpeza', 'Itens Pendentes'].includes(i.categoria));
    
    return { jogos, comidas, tarefas };
  }, [items]); // Recalcula apenas quando 'items' muda

  // Função para lidar com o clique no checkbox
  const handleToggleComplete = async (itemId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;

    // 1. Atualização Otimista da UI
    // Atualizamos o estado local imediatamente para uma UI responsiva.
    setItems(prevItems => 
      prevItems.map(item => 
        item.id === itemId ? { ...item, completo: newStatus } : item
      )
    );
    setError(null); // Limpa erros anteriores

    // 2. Atualização no Supabase (em segundo plano)
    const { error: updateError } = await supabase
      .from('ItensLista')
      .update({ completo: newStatus })
      .match({ id: itemId });

    // 3. Reversão em caso de erro
    if (updateError) {
      console.error('Erro ao atualizar item:', updateError.message);
      setError('Falha ao salvar. Tente novamente.');
      // Reverte o estado local para o estado anterior
      setItems(prevItems => 
        prevItems.map(item => 
          item.id === itemId ? { ...item, completo: currentStatus } : item
        )
      );
    }
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
                className="h-5 w-5 rounded text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
              />
              <label 
                htmlFor={`item-${item.id}`} 
                className={`flex-1 cursor-pointer ${item.completo ? 'line-through text-gray-400' : 'text-gray-700'}`}
              >
                {item.descricao_item}
                {item.responsavel && (
                  <span className={`ml-2 text-xs font-medium px-2 py-0.5 rounded-full ${item.completo ? 'bg-gray-100 text-gray-400' : 'bg-blue-100 text-blue-700'}`}>
                    {item.responsavel}
                  </span>
                )}
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      {/* Grid responsivo: 1 coluna em mobile, 3 em desktop */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ListColumn title="Jogos & Lazer" items={groupedItems.jogos} />
        <ListColumn title="Comidas & Bebidas" items={groupedItems.comidas} />
        <ListColumn title="Tarefas & Pendências" items={groupedItems.tarefas} />
      </div>
    </div>
  );
}
