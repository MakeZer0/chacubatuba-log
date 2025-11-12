-- Habilita Row Level Security para a tabela de subcategorias
ALTER TABLE public."ItensListaSubcategorias"
  ENABLE ROW LEVEL SECURITY;

-- Permite leitura para usuários autenticados
CREATE POLICY "ItensListaSubcategorias select authenticated"
  ON public."ItensListaSubcategorias"
  FOR SELECT
  TO authenticated
  USING (true);

-- Permite inserção para usuários autenticados
CREATE POLICY "ItensListaSubcategorias insert authenticated"
  ON public."ItensListaSubcategorias"
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Permite atualização para usuários autenticados
CREATE POLICY "ItensListaSubcategorias update authenticated"
  ON public."ItensListaSubcategorias"
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Permite exclusão para usuários autenticados
CREATE POLICY "ItensListaSubcategorias delete authenticated"
  ON public."ItensListaSubcategorias"
  FOR DELETE
  TO authenticated
  USING (true);
