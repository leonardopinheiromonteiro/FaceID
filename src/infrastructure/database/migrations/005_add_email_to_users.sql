-- Migration 005: Adicionar coluna email na tabela de usuários biométricos (users)
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255) DEFAULT '';
