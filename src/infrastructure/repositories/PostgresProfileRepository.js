const Profile = require('../../domain/entities/Profile');

/**
 * PostgresProfileRepository (Infrastructure Layer)
 * Manages Profile/Group persistence in PostgreSQL
 */
class PostgresProfileRepository {
  /**
   * @param {import('pg').Pool} pool 
   */
  constructor(pool) {
    this.pool = pool;
  }

  _mapRowToEntity(row) {
    if (!row) return null;
    const perms = typeof row.permissions === 'string' ? JSON.parse(row.permissions) : (row.permissions || []);
    let branches = row.allowed_branches;
    if (typeof branches === 'string') {
      try {
        branches = JSON.parse(branches);
      } catch (e) {
        branches = branches.replace(/[{}]/g, '').split(',').filter(Boolean);
      }
    }
    if (!Array.isArray(branches) || branches.length === 0) {
      branches = ['*'];
    }
    return new Profile({
      id: row.id,
      code: row.code || '',
      name: row.name,
      description: row.description,
      permissions: perms,
      allowedBranches: branches,
      isSystem: row.is_system,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
    });
  }

  async findAll() {
    const query = 'SELECT id, code, name, description, permissions, allowed_branches, is_system, created_at FROM system_profiles ORDER BY code ASC, name ASC';
    const res = await this.pool.query(query);
    return res.rows.map(row => this._mapRowToEntity(row));
  }

  async findById(id) {
    const query = 'SELECT id, code, name, description, permissions, allowed_branches, is_system, created_at FROM system_profiles WHERE id = $1';
    const res = await this.pool.query(query, [id]);
    return res.rows.length > 0 ? this._mapRowToEntity(res.rows[0]) : null;
  }

  async findByCode(code) {
    if (!code) return null;
    const searchCode = code.trim().toUpperCase();
    const query = 'SELECT id, code, name, description, permissions, allowed_branches, is_system, created_at FROM system_profiles WHERE UPPER(code) = $1';
    const res = await this.pool.query(query, [searchCode]);
    return res.rows.length > 0 ? this._mapRowToEntity(res.rows[0]) : null;
  }

  async findByName(name) {
    if (!name) return null;
    const searchName = name.trim().toLowerCase();
    const query = 'SELECT id, code, name, description, permissions, allowed_branches, is_system, created_at FROM system_profiles WHERE LOWER(name) = $1';
    const res = await this.pool.query(query, [searchName]);
    return res.rows.length > 0 ? this._mapRowToEntity(res.rows[0]) : null;
  }

  async save(profile) {
    const query = `
      INSERT INTO system_profiles (id, code, name, description, permissions, allowed_branches, is_system, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        code = EXCLUDED.code,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        permissions = EXCLUDED.permissions,
        allowed_branches = EXCLUDED.allowed_branches,
        is_system = EXCLUDED.is_system
      RETURNING *;
    `;
    const allowedBranchesArray = Array.isArray(profile.allowedBranches) && profile.allowedBranches.length > 0
      ? profile.allowedBranches
      : ['*'];

    const values = [
      profile.id,
      profile.code,
      profile.name,
      profile.description,
      JSON.stringify(profile.permissions || []),
      allowedBranchesArray,
      profile.isSystem,
      profile.createdAt ? new Date(profile.createdAt) : new Date()
    ];

    const res = await this.pool.query(query, values);
    return this._mapRowToEntity(res.rows[0]);
  }

  async delete(id) {
    const query = 'DELETE FROM system_profiles WHERE id = $1 AND is_system = FALSE';
    const res = await this.pool.query(query, [id]);
    return res.rowCount > 0;
  }
}

module.exports = PostgresProfileRepository;
