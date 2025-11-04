## Contexto rápido

- Projeto: Next.js (App Router) com TypeScript (Next v16, React 19).
- Estrutura principal: `app/` contém as rotas e `app/layout.tsx` fornece o Provider de autenticação e o Toaster.
- Backend: Supabase usado no cliente via `lib/supabase/client.ts` (singleton criado com NEXT_PUBLIC_* env vars).

## Objetivo do agente

- Ajude a manter e evoluir a UI/UX (componentes em `components/`), integrações realtime (Supabase Realtime) e rotinas de autenticação (Google OAuth via Supabase).

## Padrões e convenções importantes

- App Router: código em `app/` usa Client Components onde necessário (`'use client'` no topo dos arquivos). Siga esse padrão ao criar componentes que usam hooks ou estado.
- Cliente Supabase: use o singleton exportado em `lib/supabase/client.ts`. Não crie novos clientes no browser — use as variáveis `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Auth: `lib/auth-context.tsx` provê `AuthProvider` e `useAuth()` — integre-se a ele para login/logout e para checar `user`/`session`.
- Realtime: os componentes usam canais nomeados (ex.: `public:ItensLista:dashboard`, `public:ItensLista:itinerario`). Ao adicionar listeners, nomeie canais de forma explícita e lembre-se de remover canais com `supabase.removeChannel(channel)`.
- RPC/Functions: a contagem de comentários é obtida via RPC `get_items_with_comment_count` — preserve esse uso ao buscar dados que agregam informações.
- Drag & Drop: usa `@dnd-kit/*`. Novos componentes com reorder devem reutilizar o padrão SortableItem / ListColumn presente em `components/ItensListaRenderer.tsx` e `components/ItinerarioRenderer.tsx`.
- Feedback: `react-hot-toast` é padrão para toasts (Toaster está no `layout.tsx`). Use `toast.success` / `toast.error` para mensagens rápidas.
- Gráficos: `recharts` é usado no `DashboardRenderer.tsx`. Reutilize estilos e constantes de cores quando possível.

## Scripts e fluxo de desenvolvimento

- Rodar em dev: `npm run dev` (usa `next dev`).
- Build: `npm run build` e executar produção local: `npm run start`.
- Lint: `npm run lint` (ESLint).

## Variáveis de ambiente críticas

- NEXT_PUBLIC_SUPABASE_URL — URL do projeto Supabase (necessária no cliente).
- NEXT_PUBLIC_SUPABASE_ANON_KEY — chave anon pública do Supabase (cliente).
- NEXT_PUBLIC_SITE_URL — usada pelo `AuthProvider` como site URL/redirect; importante ajustar no Vercel.
- Nota: em `lib/supabase/client.ts` o código lança erro se as NEXT_PUBLIC_* não existirem — não processar PRs que removam essas checagens sem validação.

## Exemplo de instrução específica para PRs/commits

- Quando adicionar uma nova subscription realtime:
  - Nomeie o canal seguindo `public:<Tabela>:<contexto>` (ex.: `public:ItensLista:dashboard`).
  - Garanta chamada de cleanup com `supabase.removeChannel(channel)` no return do `useEffect`.

- Quando adicionar uma nova query que precisa do número de comentários, prefira reutilizar a RPC `get_items_with_comment_count` em vez de recalcular no cliente.

## Onde tocar para funcionalidades comuns

- Autenticação/Session: `lib/auth-context.tsx` — fluxo de login (Google) e toasts.
- Cliente Supabase: `lib/supabase/client.ts` — não substitua o singleton.
- Listas e reordenação: `components/ItensListaRenderer.tsx` e `components/ItinerarioRenderer.tsx`.
- Dashboard / gráficos: `components/DashboardRenderer.tsx`.
- Modal de item/detalhes: `components/ItemDetalhesModal.tsx` (exibir/editar itens).

## Restrições / coisas a não fazer

- Não coloque chaves privadas no código fonte — use apenas variáveis `NEXT_PUBLIC_*` para o cliente e mantenha segredos no servidor/Secrets.
- Não instancie outro cliente Supabase no browser. Evite usar chaves não-prefixadas (não- NEXT_PUBLIC) no cliente.

## Se algo estiver errado ou faltando

- Procure por usos de `supabase.channel` / `.rpc('get_items_with_comment_count')` para entender o padrão antes de alterar.
- Para dúvidas sobre URLs de callback de OAuth, verifique `getRedirectURL` em `lib/auth-context.tsx` e a configuração do Supabase/Google Cloud.

---
Se quiser, eu já aplico este arquivo no repositório — diga se prefere que eu mescle com conteúdo existente ou sobrescreva. Quer que eu ajuste tom/nível de detalhe?
