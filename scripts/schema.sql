-- Habilitar UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Tabela de Funis
CREATE TABLE public.funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  accent_color TEXT DEFAULT '#00ff00',
  bg_color TEXT DEFAULT '#0a0a0a',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tabela de Produtos (Focada apenas em metadados de marketing e rota)
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  checkout_url TEXT NOT NULL,          -- Link da Cakto caso esteja bloqueado
  product_route TEXT NOT NULL,         -- Rota interna do Next.js (Ex: '/dashboard/treino-glp1')
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  access_days int4,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT products_funnel_slug_unique UNIQUE (funnel_id, slug)
);

-- 3. Tabela de Controle de Acesso
CREATE TABLE public.user_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_product_unique UNIQUE (user_id, product_id)
);

-- RLS para segurança
ALTER TABLE public.user_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own access" ON public.user_access
  FOR SELECT USING (user_id = auth.uid());