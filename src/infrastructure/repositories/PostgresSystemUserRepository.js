const SystemUser = require('../../domain/entities/SystemUser');

/**
 * PostgresSystemUserRepository (Infrastructure Layer)
 * Manages system operators/logins persistence in PostgreSQL
 */
class PostgresSystemUserRepository {
  /**
   * @param {import('pg').Pool} pool 
   */
  constructor(pool) {
    this.pool = pool;
  }

  _mapRowToEntity(row) {
    if (!row) return null;
    const perms = typeof row.permissions === 'string' ? JSON.parse(row.permissions) : row.permissions;
    return new SystemUser({
      id: row.id,
      username: row.username,
      name: row.name,
      email: row.email || '',
      branchCode: row.branch_code || '0101',
      passwordHash: row.password_hash,
      role: row.role,
      profileId: row.profile_id || null,
      permissions: perms,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
    });
  }

  async findAll() {
    const query = 'SELECT id, username, name, email, branch_code, password_hash, role, profile_id, permissions, created_at FROM system_users ORDER BY created_at DESC';
    const res = await this.pool.query(query);
    return res.rows.map(row => this._mapRowToEntity(row));
  }

  async findById(id) {
    const query = 'SELECT id, username, name, email, branch_code, password_hash, role, profile_id, permissions, created_at FROM system_users WHERE id = $1';
    const res = await this.pool.query(query, [id]);
    return res.rows.length > 0 ? this._mapRowToEntity(res.rows[0]) : null;
  }

  async findByUsername(username) {
    if (!username) return null;
    const searchUser = username.trim().toLowerCase();
    const query = 'SELECT id, username, name, email, branch_code, password_hash, role, profile_id, permissions, created_at FROM system_users WHERE LOWER(username) = $1';
    const res = await this.pool.query(query, [searchUser]);
    return res.rows.length > 0 ? this._mapRowToEntity(res.rows[0]) : null;
  }

  async save(systemUser) {
    const query = `
      INSERT INTO system_users (id, username, name, email, branch_code, password_hash, role, profile_id, permissions, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        branch_code = EXCLUDED.branch_code,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        profile_id = EXCLUDED.profile_id,
        permissions = EXCLUDED.permissions
      RETURNING *;
    `;
    const values = [
      systemUser.id,
      systemUser.username,
      systemUser.name,
      systemUser.email || '',
      systemUser.branchCode || '0101',
      systemUser.passwordHash,
      systemUser.role,
      systemUser.profileId || null,
      JSON.stringify(systemUser.permissions || []),
      systemUser.createdAt ? new Date(systemUser.createdAt) : new Date()
    ];

    const res = await this.pool.query(query, values);
    return this._mapRowToEntity(res.rows[0]);
  }

  async delete(id) {
    const query = 'DELETE FROM system_users WHERE id = $1';
    const res = await this.pool.query(query, [id]);
    return res.rowCount > 0;
  }
}

module.exports = PostgresSystemUserRepository;
