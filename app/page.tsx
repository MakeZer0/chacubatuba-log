// Esta é uma Server Component por padrão.
// Ela é responsável pelo fetch inicial dos dados no servidor.

import { createClient } from '@supabase/supabase-js';
// FIX: Alterado de alias ('@/...') para caminho relativo para corrigir o erro de build.
import ItensListaRenderer from '../components/ItensListaRenderer';

// Tipagem básica para os dados (idealmente viria da geração de tipos do Supabase)
type Bloco = {
  id: string;
  titulo_bloco: string | null;
  conteudo_bloco: string | null;
  ordem_exibicao: number | null;
};

type Item = {
  id: string;
  categoria: 'Jogos' | 'Cardápio' | 'Snacks' | 'Bebidas' | 'Limpeza' | 'Itens Pendentes';
  descricao_item: string;
  responsavel: string | null;
  completo: boolean;
};

// Componente "fantasma" que você pediu para não criar.
// Apenas para o <BlocosAnotacoesRenderer /> funcionar na página.
const BlocosAnotacoesRenderer = ({ data }: { data: Bloco[] }) => {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-gray-700 border-b pb-2">Anotações</h2>
      {data.length === 0 && <p className="text-gray-500">Nenhum bloco de anotação encontrado.</p>}
      {data.map((bloco) => (
        <div key={bloco.id} className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="font-bold text-lg">{bloco.titulo_bloco}</h3>
          <p className="whitespace-pre-wrap">{bloco.conteudo_bloco}</p>
        </div>
      ))}
    </div>
  );
};


// Função principal da página
export default async function ChacaraPage() {
  // Para Server Components, criamos um cliente one-off.
  // Como não há autenticação, podemos usar as chaves públicas com segurança.
  // Em um app com auth, usaríamos o createServerComponentClient do @supabase/ssr
  // e chaves de serviço.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 1. Buscar dados das duas tabelas em paralelo
  const blocosPromise = supabase
    .from('BlocosAnotacoes')
    .select('*')
    .order('ordem_exibicao');
    
  const itensPromise = supabase
    .from('ItensLista')
    .select('*')
    .order('created_at', { ascending: true }); // Ordenar por criação

  const [blocosResult, itensResult] = await Promise.all([blocosPromise, itensPromise]);

  // Extrair os dados (ou arrays vazios em caso de falha)
  const blocos: Bloco[] = blocosResult.data ?? [];
  const itens: Item[] = itensResult.data ?? [];

  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-8 md:p-12 bg-gray-100 font-sans">
      {/* Container principal com largura máxima */}
      <div className="w-full max-w-5xl space-y-12">
        
        {/* Cabeçalho */}
        <header className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800">
            Plano da Chácara
          </h1>
          <p className="text-lg text-gray-600 mt-2">
            Organização em tempo real. Qualquer um pode editar.
          </p>
        </header>

        {/* Seção 1: Listas de Itens (Client Component)
          Passamos os 'itens' como props iniciais para o Client Component.
        */}
        <section>
          <ItensListaRenderer initialData={itens} />
        </section>

        {/* Seção 2: Blocos de Anotações (Renderizado no Servidor)
          Este componente é simples e não precisa de interatividade,
          então renderizamos diretamente aqui.
        */}
        <section>
          <BlocosAnotacoesRenderer data={blocos} />
        </section>

      </div>
    </main>
  );
}

