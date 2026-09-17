-- ==============================================================================
-- FaceID Biometrics - Supabase Complete Schema & Initial Data
-- Execute este script no SQL Editor do Supabase para inicializar todas as tabelas.
-- ==============================================================================

-- 1. Habilitar extensões
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Tabela de Migrações
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabela de Empresas / Filiais
CREATE TABLE IF NOT EXISTS branches (
  code VARCHAR(10) PRIMARY KEY,
  branch_code VARCHAR(10),
  name VARCHAR(255) NOT NULL,
  cnpj VARCHAR(20),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inserir Filiais Padrão
INSERT INTO branches (code, branch_code, name, cnpj, active)
VALUES 
  ('0101', '0101', 'Matriz', '00.000.000/0001-00', true),
  ('0102', '0102', 'Adoro', '00.000.000/0002-00', true)
ON CONFLICT (code) DO NOTHING;

-- 4. Tabela de Perfis de Acesso (RBAC)
CREATE TABLE IF NOT EXISTS system_profiles (
  id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code VARCHAR(20),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL,
  allowed_branches TEXT[] DEFAULT ARRAY['*'],
  branch_code VARCHAR(10) DEFAULT '0101',
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inserir Perfis Padrão
INSERT INTO system_profiles (id, code, name, description, permissions, allowed_branches, is_system)
VALUES 
  ('prf_admin', 'ADM', 'Administrador', 'Acesso total a todos os módulos e configurações do sistema', '["auth", "register", "credentials", "status", "audit", "system_users", "profiles", "branches"]'::jsonb, ARRAY['*'], true),
  ('prf_portaria', 'PORT', 'Operador de Portaria', 'Acesso para leitura facial e cadastro biométrico de colaboradores', '["auth", "register"]'::jsonb, ARRAY['*'], true),
  ('prf_auditor', 'AUD', 'Auditor / SGQ', 'Acesso para consulta de relatórios de auditoria e credenciais', '["audit", "credentials", "status"]'::jsonb, ARRAY['*'], true)
ON CONFLICT (id) DO NOTHING;

-- 5. Tabela de Operadores do Sistema
CREATE TABLE IF NOT EXISTS system_users (
  id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  username VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) DEFAULT '',
  branch_code VARCHAR(10) DEFAULT '0101' REFERENCES branches(code),
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'operator',
  profile_id VARCHAR(64) REFERENCES system_profiles(id) ON DELETE SET NULL,
  permissions JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inserir Usuário Administrador Master Padrão (Senha: admin123)
-- Hash SHA-256 de 'admin123'
INSERT INTO system_users (id, username, name, email, branch_code, password_hash, role, profile_id, permissions)
VALUES (
  'sys_admin_master',
  'admin',
  'Administrador do Sistema',
  'admin@empresa.com.br',
  '0101',
  '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
  'admin',
  'prf_admin',
  '["auth", "register", "credentials", "status", "audit", "system_users", "profiles", "branches"]'::jsonb
)
ON CONFLICT (username) DO NOTHING;

-- 6. Tabela de Credenciais Biométricas / Usuários
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  branch VARCHAR(10) DEFAULT '0101',
  branch_code VARCHAR(10) DEFAULT '0101',
  registration VARCHAR(20) DEFAULT '',
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) DEFAULT '',
  department VARCHAR(100) DEFAULT '',
  role VARCHAR(100) DEFAULT 'Colaborador',
  is_blocked BOOLEAN DEFAULT FALSE,
  descriptor JSONB NOT NULL,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabela de Histórico de Acessos Biométricos (Auditoria Imutável)
CREATE TABLE IF NOT EXISTS access_logs (
  id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  matched_user_id VARCHAR(64),
  matched_user_name VARCHAR(255),
  branch VARCHAR(10) DEFAULT '0101',
  branch_code VARCHAR(10) DEFAULT '0101',
  registration VARCHAR(20) DEFAULT '',
  image TEXT,
  match_distance NUMERIC(6,4),
  match_percentage INT,
  success BOOLEAN NOT NULL,
  status_text TEXT NOT NULL
);

-- 8. Tabela de Logs de Alterações do Sistema
CREATE TABLE IF NOT EXISTS system_logs (
  id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  level VARCHAR(20) NOT NULL,
  action VARCHAR(100) NOT NULL,
  branch_code VARCHAR(10) DEFAULT '0101',
  message TEXT NOT NULL,
  metadata JSONB,
  ip VARCHAR(45)
);

-- 9. Índices de Otimização
CREATE INDEX IF NOT EXISTS idx_users_registration ON users(registration);
CREATE INDEX IF NOT EXISTS idx_users_branch_code ON users(branch_code);
CREATE INDEX IF NOT EXISTS idx_access_logs_timestamp ON access_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_branch_code ON access_logs(branch_code);
CREATE INDEX IF NOT EXISTS idx_access_logs_registration ON access_logs(registration);
CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_action ON system_logs(action);

-- Registrar Migrações como Aplicadas
INSERT INTO schema_migrations (version, name) VALUES
  (1, '001_initial_schema.sql'),
  (2, '002_create_profiles.sql'),
  (3, '003_branches_and_user_email.sql'),
  (4, '004_update_branches_and_profiles.sql'),
  (5, '005_add_email_to_users.sql'),
  (6, '006_add_branch_code_to_all_tables.sql'),
  (7, '007_set_uuid_defaults.sql'),
  (8, '008_fix_system_users_branch_default.sql')
ON CONFLICT (version) DO NOTHING;
