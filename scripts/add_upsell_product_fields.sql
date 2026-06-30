-- Adiciona campos de upsell progressivo na tabela products
-- Seguro para rodar mais de uma vez.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS vimeo_url TEXT,
  ADD COLUMN IF NOT EXISTS price_anchor_text TEXT,
  ADD COLUMN IF NOT EXISTS price_offer_text TEXT;