-- Migration 006: Garantir coluna branch_code em todas as tabelas do sistema

-- 1. Tabela system_logs
ALTER TABLE system_logs ADD COLUMN IF NOT EXISTS branch_code VARCHAR(10) DEFAULT '0101';
UPDATE system_logs SET branch_code = '0101' WHERE branch_code IS NULL OR branch_code = '';

-- 2. Tabela access_logs
ALTER TABLE access_logs ADD COLUMN IF NOT EXISTS branch_code VARCHAR(10) DEFAULT '0101';
UPDATE access_logs SET branch_code = COALESCE(NULLIF(branch, ''), '0101') WHERE branch_code IS NULL OR branch_code = '';

-- 3. Tabela users (credenciais biométricas)
ALTER TABLE users ADD COLUMN IF NOT EXISTS branch_code VARCHAR(10) DEFAULT '0101';
UPDATE users SET branch_code = COALESCE(NULLIF(branch, ''), '0101') WHERE branch_code IS NULL OR branch_code = '';

-- 4. Tabela system_users (operadores)
ALTER TABLE system_users ADD COLUMN IF NOT EXISTS branch_code VARCHAR(10) DEFAULT '0101';
UPDATE system_users SET branch_code = '0101' WHERE branch_code IS NULL OR branch_code = '';

-- 5. Tabela system_profiles (perfis de acesso)
ALTER TABLE system_profiles ADD COLUMN IF NOT EXISTS branch_code VARCHAR(10) DEFAULT '0101';
UPDATE system_profiles SET branch_code = '0101' WHERE branch_code IS NULL OR branch_code = '';

-- 6. Tabela branches (filiais)
ALTER TABLE branches ADD COLUMN IF NOT EXISTS branch_code VARCHAR(10);
UPDATE branches SET branch_code = code WHERE branch_code IS NULL OR branch_code = '';
