'use client';

import { useState } from 'react';
// Ignorando erros de importação, conforme solicitado
import { supabase } from '@/lib/supabase/client'; 

// Definimos o tipo para uma anotação
export type Anotacao = {
  id: string;
  conteudo: string;
  created_at: string;
};

type AnotacoesRendererProps = {
  initialData: Anotacao[];
};

export default function AnotacoesRenderer({ initialData }: AnotacoesRendererProps) {
  const [anotacoes, setAnotacoes] = useState<Anotacao[]>(initialData);
  const [novaAnotacao, setNovaAnotacao] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Adiciona uma nova anotação
   */
  const handleAddAnotacao = async (e: React.FormEvent) => {
    e.preventDefault();
    const conteudo = novaAnotacao.trim();
    
    if (conteudo.length < 3) {
      setError('A anotação deve ter pelo menos 3 caracteres.');
      return;
    }

    setLoading(true);
    setError(null);

    // 1. Insere no Supabase
    const { data, error: insertError } = await supabase
      .from('Anotacoes')
      .insert({ conteudo })
      .select()
      .single();

    // 2. Trata erro
    if (insertError) {
      console.error('Erro ao adicionar anotação:', insertError.message);
      setError('Falha ao adicionar anotação. Tente novamente.');
      setLoading(false);
      return;
    }

    // 3. Atualiza UI Otimista
    if (data) {
      setAnotacoes(prev => [...prev, data as Anotacao]);
    }
    
    // 4. Limpa o formulário
    setNovaAnotacao('');
    setLoading(false);
  };

  /**
   * Deleta uma anotação
   */
  const handleDeleteAnotacao = async (id: string) => {
    const oldAnotacoes = [...anotacoes];

    // 1. UI Otimista
    setAnotacoes(prev => prev.filter(a => a.id !== id));
    setError(null);

    // 2. Supabase Delete
    const { error: deleteError } = await supabase
      .from('Anotacoes')
      .delete()
      .match({ id });

    // 3. Reversão em caso de erro
    if (deleteError) {
      console.error('Erro ao deletar anotação:', deleteError.message);
      setError('Falha ao deletar a anotação.');
      setAnotacoes(oldAnotacoes); // Reverte
    }
  };

  return (
    <div className="mt-8 bg-white p-6 rounded-xl shadow-lg">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Anotações</h3>
      
      {/* Formulário de Adição */}
      <form onSubmit={handleAddAnotacao} className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mb-6">
        <input
          type="text"
          value={novaAnotacao}
          onChange={(e) => setNovaAnotacao(e.target.value)}
          placeholder="Digite uma nova anotação ou lembrete..."
          className="flex-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto inline-flex justify-center rounded-lg border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300"
        >
          {loading ? 'Criando...' : 'Criar'}
        </button>
      </form>

      {/* Mensagem de Erro */}
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm" onClick={() => setError(null)}>
          {error} (Clique para fechar)
        </div>
      )}

      {/* Lista de Anotações */}
      <div className="space-y-3">
        {anotacoes.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Nenhuma anotação encontrada. Crie uma acima!</p>
        ) : (
          [...anotacoes].reverse().map(anotacao => ( // Mostra as mais novas primeiro
            <div 
              key={anotacao.id} 
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group"
            >
              <p className="text-sm text-gray-800 break-words">{anotacao.conteudo}</p>
              
              {/* Botão Deletar */}
              <button
                onClick={() => handleDeleteAnotacao(anotacao.id)}
                className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity ml-4"
                title="Excluir anotação"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
