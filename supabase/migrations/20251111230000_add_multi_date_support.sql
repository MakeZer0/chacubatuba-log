-- Converte a coluna data_alvo para armazenar múltiplas datas
ALTER TABLE public."ItensLista"
  ALTER COLUMN data_alvo TYPE date[]
  USING CASE
    WHEN data_alvo IS NULL THEN NULL
    ELSE ARRAY[data_alvo]
  END;

-- Recria a função que retorna os itens com contagem de comentários,
-- garantindo que data_alvo seja devolvida como array (vazio quando nulo)
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
  subcategoria_cardapio text,
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
    itens.subcategoria_cardapio,
    COUNT(comentarios.id)::int AS comment_count
  FROM public."ItensLista" itens
  LEFT JOIN public.comentarios comentarios
    ON comentarios.item_id = itens.id
  GROUP BY itens.id
  ORDER BY itens.ordem_item NULLS LAST, itens.created_at;
$$;
