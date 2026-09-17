-- Migration 007: Habilitar extensão pgcrypto e definir defaults UUID nas tabelas

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Default UUID para access_logs
ALTER TABLE access_logs ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

-- Default UUID para system_logs
ALTER TABLE system_logs ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

-- Default UUID para users
ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

-- Default UUID para system_users
ALTER TABLE system_users ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

-- Default UUID para system_profiles
ALTER TABLE system_profiles ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
