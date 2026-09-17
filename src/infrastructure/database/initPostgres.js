const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

function createPgPool() {
  const host = process.env.POSTGRES_HOST || 'localhost';
  const port = parseInt(process.env.POSTGRES_PORT, 10) || 5432;
  const user = process.env.POSTGRES_USER || 'faceid_user';
  const password = process.env.POSTGRES_PASSWORD || 'faceid_pass_secure_2026';
  const database = process.env.POSTGRES_DB || 'faceid_db';

  const pool = new Pool({
    host,
    port,
    user,
    password,
    database,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  });

  return pool;
}

async function initPostgresTables(pool) {
  const createUsersTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
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
  `;

  const alterUsersTableQuery = `
    ALTER TABLE users ADD COLUMN IF NOT EXISTS branch VARCHAR(10) DEFAULT '0101';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS branch_code VARCHAR(10) DEFAULT '0101';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS registration VARCHAR(20) DEFAULT '';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255) DEFAULT '';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100) DEFAULT '';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;
    UPDATE users SET branch_code = COALESCE(NULLIF(branch, ''), '0101') WHERE branch_code IS NULL OR branch_code = '';
  `;

  const createLogsTableQuery = `
    CREATE TABLE IF NOT EXISTS access_logs (
      id VARCHAR(64) PRIMARY KEY,
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
  `;

  const alterLogsTableQuery = `
    ALTER TABLE access_logs ADD COLUMN IF NOT EXISTS branch VARCHAR(10) DEFAULT '0101';
    ALTER TABLE access_logs ADD COLUMN IF NOT EXISTS branch_code VARCHAR(10) DEFAULT '0101';
    ALTER TABLE access_logs ADD COLUMN IF NOT EXISTS registration VARCHAR(20) DEFAULT '';
    ALTER TABLE access_logs ADD COLUMN IF NOT EXISTS image TEXT;
    UPDATE access_logs SET branch_code = COALESCE(NULLIF(branch, ''), '0101') WHERE branch_code IS NULL OR branch_code = '';
  `;

  const createSystemLogsTableQuery = `
    CREATE TABLE IF NOT EXISTS system_logs (
      id VARCHAR(64) PRIMARY KEY,
      timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      level VARCHAR(20) NOT NULL,
      action VARCHAR(100) NOT NULL,
      branch_code VARCHAR(10) DEFAULT '0101',
      message TEXT NOT NULL,
      metadata JSONB,
      ip VARCHAR(45)
    );
  `;

  const alterSystemLogsTableQuery = `
    ALTER TABLE system_logs ADD COLUMN IF NOT EXISTS branch_code VARCHAR(10) DEFAULT '0101';
    UPDATE system_logs SET branch_code = '0101' WHERE branch_code IS NULL OR branch_code = '';
  `;

  const createSystemUsersTableQuery = `
    CREATE TABLE IF NOT EXISTS system_users (
      id VARCHAR(64) PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) DEFAULT '',
      branch_code VARCHAR(10) DEFAULT '0101',
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'operator',
      profile_id VARCHAR(64),
      permissions JSONB NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const alterSystemUsersTableQuery = `
    ALTER TABLE system_users ADD COLUMN IF NOT EXISTS email VARCHAR(255) DEFAULT '';
    ALTER TABLE system_users ADD COLUMN IF NOT EXISTS branch_code VARCHAR(10) DEFAULT '0101';
    ALTER TABLE system_users ADD COLUMN IF NOT EXISTS profile_id VARCHAR(64);
    UPDATE system_users SET branch_code = '0101' WHERE branch_code IS NULL OR branch_code = '';
  `;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(createUsersTableQuery);
    await client.query(alterUsersTableQuery);
    await client.query(createLogsTableQuery);
    await client.query(alterLogsTableQuery);
    await client.query(createSystemLogsTableQuery);
    await client.query(alterSystemLogsTableQuery);
    await client.query(createSystemUsersTableQuery);
    await client.query(alterSystemUsersTableQuery);

    // Seed default administrator if system_users is empty
    const sysUserRes = await client.query('SELECT COUNT(*) FROM system_users');
    if (parseInt(sysUserRes.rows[0].count, 10) === 0) {
      const SystemUser = require('../../domain/entities/SystemUser');
      const adminHash = SystemUser.hashPassword('admin123');
      const allPerms = JSON.stringify(['auth', 'register', 'credentials', 'status', 'audit', 'system_users']);
      await client.query(
        `INSERT INTO system_users (id, username, name, password_hash, role, permissions)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['sys_admin_master', 'admin', 'Administrador do Sistema', adminHash, 'admin', allPerms]
      );
      console.log('[POSTGRES INIT] Operador administrador mestre "admin" (senha: admin123) criado com sucesso.');
    }

    await client.query('COMMIT');
    console.log('[POSTGRES INIT] Tabelas "users", "access_logs", "system_logs" e "system_users" verificadas com sucesso.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[POSTGRES INIT ERROR] Erro ao criar tabelas:', err);
    throw err;
  } finally {
    client.release();
  }

  // Auto-migrate legacy data from database.json if PostgreSQL table is empty
  await migrateLegacyJsonData(pool);
}

async function migrateLegacyJsonData(pool) {
  const jsonPath = process.env.DB_PATH ? path.resolve(__dirname, '../../../', process.env.DB_PATH) : path.join(__dirname, '../../../data/database.json');
  if (!fs.existsSync(jsonPath)) return;

  try {
    const raw = fs.readFileSync(jsonPath, 'utf-8');
    const legacy = JSON.parse(raw);

    const client = await pool.connect();
    try {
      // Check if users table is empty
      const userRes = await client.query('SELECT COUNT(*) FROM users');
      const userCount = parseInt(userRes.rows[0].count, 10);

      if (userCount === 0 && Array.isArray(legacy.users) && legacy.users.length > 0) {
        console.log(`[POSTGRES MIGRATION] Migrando ${legacy.users.length} usuários legados do JSON para o PostgreSQL...`);
        for (const u of legacy.users) {
          await client.query(
            `INSERT INTO users (id, name, role, descriptor, image, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (id) DO NOTHING`,
            [
              u.id,
              u.name,
              u.role || 'Colaborador',
              JSON.stringify(u.descriptor),
              u.image || null,
              u.createdAt ? new Date(u.createdAt) : new Date(),
              u.updatedAt ? new Date(u.updatedAt) : new Date()
            ]
          );
        }
        console.log('[POSTGRES MIGRATION] Migração de usuários concluída com sucesso!');
      }

      // Check if logs table is empty
      const logRes = await client.query('SELECT COUNT(*) FROM access_logs');
      const logCount = parseInt(logRes.rows[0].count, 10);

      if (logCount === 0 && Array.isArray(legacy.logs) && legacy.logs.length > 0) {
        console.log(`[POSTGRES MIGRATION] Migrando ${legacy.logs.length} logs legados do JSON para o PostgreSQL...`);
        for (const l of legacy.logs) {
          await client.query(
            `INSERT INTO access_logs (id, timestamp, matched_user_id, matched_user_name, match_distance, match_percentage, success, status_text)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (id) DO NOTHING`,
            [
              l.id,
              l.timestamp ? new Date(l.timestamp) : new Date(),
              l.matchedUserId || null,
              l.matchedUserName || 'Desconhecido',
              l.matchDistance !== null ? l.matchDistance : null,
              l.matchPercentage || 0,
              l.success || false,
              l.statusText || 'Sem registro'
            ]
          );
        }
        console.log('[POSTGRES MIGRATION] Migração de logs concluída com sucesso!');
      }
    } finally {
      client.release();
    }
  } catch (err) {
    console.warn('[POSTGRES MIGRATION WARN] Não foi possível migrar dados legados:', err.message);
  }
}

module.exports = {
  createPgPool,
  initPostgresTables
};
