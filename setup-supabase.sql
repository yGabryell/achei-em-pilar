-- ====================================================================
-- BANCO DE DADOS: ACHEI EM PILAR (SUPABASE)
-- Execute este script no SQL Editor do Supabase (https://supabase.com)
-- ====================================================================

-- 1. TABELA DE ESTATÍSTICAS E CLIQUES POR LOJA
CREATE TABLE IF NOT EXISTS public.store_stats (
    store_id TEXT PRIMARY KEY,
    whatsapp_clicks INT DEFAULT 0,
    instagram_clicks INT DEFAULT 0,
    maps_clicks INT DEFAULT 0,
    likes INT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TABELA DE AVALIAÇÕES E COMENTÁRIOS DOS MORADORES
CREATE TABLE IF NOT EXISTS public.store_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    rating INT DEFAULT 5,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABELA DE VISITAS GERAIS DO SITE (PAGEVIEWS)
CREATE TABLE IF NOT EXISTS public.site_visits (
    id BIGSERIAL PRIMARY KEY,
    visited_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. HABILITAR SEGURANÇA ROW LEVEL SECURITY (RLS)
ALTER TABLE public.store_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

-- 5. POLÍTICAS DE ACESSO (PERMITIR LEITURA E REGISTRO PÚBLICO)
CREATE POLICY "Permitir leitura de estatísticas" ON public.store_stats FOR SELECT USING (true);
CREATE POLICY "Permitir leitura de comentários" ON public.store_reviews FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de comentários" ON public.store_reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir exclusão de comentários" ON public.store_reviews FOR DELETE USING (true);
CREATE POLICY "Permitir registro de visitas" ON public.site_visits FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir leitura de visitas" ON public.site_visits FOR SELECT USING (true);

-- 6. FUNÇÃO RPC PARA INCREMENTO ATÔMICO DE CLIQUES
CREATE OR REPLACE FUNCTION public.increment_store_click(p_store_id TEXT, p_click_type TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.store_stats (store_id, whatsapp_clicks, instagram_clicks, maps_clicks, likes)
    VALUES (
        p_store_id,
        CASE WHEN p_click_type = 'whatsapp' THEN 1 ELSE 0 END,
        CASE WHEN p_click_type = 'instagram' THEN 1 ELSE 0 END,
        CASE WHEN p_click_type = 'maps' THEN 1 ELSE 0 END,
        0
    )
    ON CONFLICT (store_id) DO UPDATE SET
        whatsapp_clicks = store_stats.whatsapp_clicks + CASE WHEN p_click_type = 'whatsapp' THEN 1 ELSE 0 END,
        instagram_clicks = store_stats.instagram_clicks + CASE WHEN p_click_type = 'instagram' THEN 1 ELSE 0 END,
        maps_clicks = store_stats.maps_clicks + CASE WHEN p_click_type = 'maps' THEN 1 ELSE 0 END,
        updated_at = timezone('utc'::text, now());
END;
$$;

-- 7. FUNÇÃO RPC PARA INCREMENTO ATÔMICO DE CURTIDAS (❤️)
CREATE OR REPLACE FUNCTION public.increment_store_like(p_store_id TEXT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_likes INT;
BEGIN
    INSERT INTO public.store_stats (store_id, whatsapp_clicks, instagram_clicks, maps_clicks, likes)
    VALUES (p_store_id, 0, 0, 0, 1)
    ON CONFLICT (store_id) DO UPDATE SET
        likes = store_stats.likes + 1,
        updated_at = timezone('utc'::text, now())
    RETURNING likes INTO v_new_likes;
    
    RETURN v_new_likes;
END;
$$;
