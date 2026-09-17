-- Migration 003: Criar tabela de filiais, adicionar email e filial no cadastro de usuário/operador e adicionar permissões por filial nos perfis

-- 1. Criar tabela de empresas/filiais
CREATE TABLE IF NOT EXISTS branches (
    code VARCHAR(10) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(20),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir filial matriz padrão se não existir
INSERT INTO branches (code, name, cnpj, active)
VALUES ('0001', 'Filial Matriz', '00.000.000/0001-00', true)
ON CONFLICT (code) DO NOTHING;

-- 2. Adicionar email e filial na tabela de operadores do sistema
ALTER TABLE system_users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE system_users ADD COLUMN IF NOT EXISTS branch_code VARCHAR(10) DEFAULT '0001' REFERENCES branches(code);

-- 3. Adicionar filiais permitidas na tabela de perfis de acesso
ALTER TABLE system_profiles ADD COLUMN IF NOT EXISTS allowed_branches TEXT[] DEFAULT ARRAY['*'];

-- 4. Garantir que a tabela de usuários biométricos possui a coluna branch
ALTER TABLE users ADD COLUMN IF NOT EXISTS branch VARCHAR(10) DEFAULT '0001';

-- Update em cadastros antigos para atribuir filial padrão 0001 caso esteja nulo
UPDATE system_users SET branch_code = '0001' WHERE branch_code IS NULL;
UPDATE users SET branch = '0001' WHERE branch IS NULL OR branch = '';
