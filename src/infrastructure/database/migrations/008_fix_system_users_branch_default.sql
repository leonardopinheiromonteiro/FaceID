-- Migration 008: Atualizar default de filial para 0101 e corrigir referências legadas 0001

-- Atualizar registros legados com 0001 para a filial Matriz 0101
UPDATE system_users SET branch_code = '0101' WHERE branch_code = '0001' OR branch_code IS NULL;
UPDATE users SET branch_code = '0101' WHERE branch_code = '0001' OR branch_code IS NULL;
UPDATE access_logs SET branch_code = '0101' WHERE branch_code = '0001' OR branch_code IS NULL;

-- Atualizar constraint default para 0101
ALTER TABLE system_users ALTER COLUMN branch_code SET DEFAULT '0101';
