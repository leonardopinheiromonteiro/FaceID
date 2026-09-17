-- Migration 004: Atualizar filiais padrão para 0101-Matriz e 0102-Adoro, e adicionar código do perfil/grupo

-- 1. Inserir/atualizar filiais padrão 0101 (Matriz) e 0102 (Adoro)
INSERT INTO branches (code, name, cnpj, active)
VALUES 
  ('0101', 'Matriz', '00.000.000/0001-00', true),
  ('0102', 'Adoro', '00.000.000/0002-00', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  active = EXCLUDED.active;

-- 2. Adicionar coluna code na tabela system_profiles com tamanho VARCHAR(50) se não existir
ALTER TABLE system_profiles ADD COLUMN IF NOT EXISTS code VARCHAR(50);
ALTER TABLE system_profiles ALTER COLUMN code TYPE VARCHAR(50);

-- Definir códigos padrão para perfis de sistema legados
UPDATE system_profiles SET code = 'ADM' WHERE id = 'prf_admin' OR name = 'Administrador';
UPDATE system_profiles SET code = 'PORT' WHERE id = 'prf_portaria' OR name = 'Operador de Portaria';
UPDATE system_profiles SET code = 'AUD' WHERE id = 'prf_auditor' OR name = 'Auditor / SGQ';
UPDATE system_profiles SET code = UPPER(SUBSTRING(id FROM 1 FOR 20)) WHERE code IS NULL OR code = '';
