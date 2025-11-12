-- Habilita função gen_random_uuid (caso ainda não exista)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabela de subcategorias dinâmicas
CREATE TABLE IF NOT EXISTS public."ItensListaSubcategorias" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  categoria text NOT NULL,
  nome text NOT NULL,
  ordem integer,
  CONSTRAINT itenslista_subcategorias_unique UNIQUE (categoria, nome)
);

-- Semeia as subcategorias atuais do Cardápio
INSERT INTO public."ItensListaSubcategorias" (categoria, nome, ordem)
VALUES
  ('Cardápio', 'Menu', 1),
  ('Cardápio', 'Utensílios', 2),
  ('Cardápio', 'Ingredientes Gerais', 3),
  ('Cardápio', 'Café da Manhã', 4),
  ('Cardápio', 'Refeição', 5)
ON CONFLICT (categoria, nome) DO NOTHING;

-- Nova coluna de referência na lista de itens
ALTER TABLE public."ItensLista"
  ADD COLUMN IF NOT EXISTS subcategoria_id uuid;

ALTER TABLE public."ItensLista"
  ADD CONSTRAINT itenslista_subcategoria_fk
  FOREIGN KEY (subcategoria_id)
  REFERENCES public."ItensListaSubcategorias" (id)
  ON UPDATE CASCADE
  ON DELETE SET NULL;

-- Migra subcategorias existentes do Cardápio
UPDATE public."ItensLista" itens
SET subcategoria_id = sub.id
FROM public."ItensListaSubcategorias" sub
WHERE itens.categoria = 'Cardápio'
  AND itens.subcategoria_cardapio = sub.nome;

-- Remove coluna antiga baseada em texto
ALTER TABLE public."ItensLista"
  DROP COLUMN IF EXISTS subcategoria_cardapio;

-- Atualiza a função compartilhada para refletir o novo esquema
DROP FUNCTION IF EXISTS public.get_items_with_comment_count();

CREATE OR REPLACE FUNCTION public.get_items_with_comment_count()
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  descricao_item text,
  responsavel text,
  categoria text,
  completo boolean,
  ordem_item integer,
  data_alvo date[],
  subcategoria_id uuid,
  subcategoria_nome text,
  comment_count integer
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    itens.id,
    itens.created_at,
    itens.descricao_item,
    itens.responsavel,
    itens.categoria,
    itens.completo,
    itens.ordem_item,
    COALESCE(itens.data_alvo, ARRAY[]::date[]) AS data_alvo,
    itens.subcategoria_id,
    sub.nome AS subcategoria_nome,
    COUNT(comentarios.id)::int AS comment_count
  FROM public."ItensLista" itens
  LEFT JOIN public."ItensListaSubcategorias" sub
    ON sub.id = itens.subcategoria_id
  LEFT JOIN public.comentarios comentarios
    ON comentarios.item_id = itens.id
  GROUP BY
    itens.id,
    sub.id,
    sub.nome
  ORDER BY
    itens.ordem_item NULLS LAST,
    itens.created_at;
$$;
