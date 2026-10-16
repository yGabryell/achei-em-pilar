-- ==============================================================================
-- MIGRAÇÃO DE SISTEMA DE LOJISTAS E STATUS DE PAGAMENTO - ACHEI EM PILAR
-- Execute este script no SQL Editor do seu Painel Supabase
-- ==============================================================================

-- 1. Adicionar colunas de controle de proprietário, status e vigência
ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo',
ADD COLUMN IF NOT EXISTS plano TEXT DEFAULT 'basico',
ADD COLUMN IF NOT EXISTS pago_ate TIMESTAMPTZ;

-- 2. Garantir que todas as 33 lojas existentes continuem com status 'ativo'
UPDATE stores 
SET status = 'ativo' 
WHERE status IS NULL OR status = '';

-- 3. Criar índices para busca rápida por status e proprietário
CREATE INDEX IF NOT EXISTS idx_stores_status ON stores(status);
CREATE INDEX IF NOT EXISTS idx_stores_owner_id ON stores(owner_id);

-- 4. Comentário explicativo sobre os status:
-- 'ativo'     -> Comércio aprovado/pago, aparece publicamente no guia
-- 'rascunho'  -> Cadastrado pelo lojista, aguardando pagamento Pix / liberação
-- 'expirado'  -> Mensalidade vencida, fica oculto até renovar
