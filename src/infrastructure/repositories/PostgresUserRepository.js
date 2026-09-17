const IUserRepository = require('../../domain/repositories/IUserRepository');
const User = require('../../domain/entities/User');

/**
 * PostgresUserRepository (Infrastructure Layer)
 * Implements IUserRepository using PostgreSQL Database.
 */
class PostgresUserRepository extends IUserRepository {
  /**
   * @param {import('pg').Pool} pool PostgreSQL Connection Pool
   */
  constructor(pool) {
    super();
    this.pool = pool;
  }

  _mapRowToUser(row) {
    if (!row) return null;
    const descriptor = typeof row.descriptor === 'string' ? JSON.parse(row.descriptor) : row.descriptor;
    return new User({
      id: row.id,
      branch: row.branch_code || row.branch || '0101',
      branch_code: row.branch_code || row.branch || '0101',
      registration: row.registration,
      name: row.name,
      email: row.email || '',
      department: row.department,
      role: row.role,
      isBlocked: row.is_blocked,
      descriptor: descriptor,
      image: row.image,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
    });
  }

  async findAll() {
    const query = 'SELECT id, branch, branch_code, registration, name, email, department, role, is_blocked, descriptor, image, created_at, updated_at FROM users ORDER BY created_at DESC';
    const res = await this.pool.query(query);
    return res.rows.map(row => this._mapRowToUser(row));
  }

  async findById(id) {
    const query = 'SELECT id, branch, branch_code, registration, name, email, department, role, is_blocked, descriptor, image, created_at, updated_at FROM users WHERE id = $1';
    const res = await this.pool.query(query, [id]);
    return res.rows.length > 0 ? this._mapRowToUser(res.rows[0]) : null;
  }

  async findByName(name) {
    if (!name) return null;
    const searchName = name.trim().toLowerCase();
    const query = 'SELECT id, branch, branch_code, registration, name, email, department, role, is_blocked, descriptor, image, created_at, updated_at FROM users WHERE LOWER(name) = $1';
    const res = await this.pool.query(query, [searchName]);
    return res.rows.length > 0 ? this._mapRowToUser(res.rows[0]) : null;
  }

  async findByRegistration(registration) {
    if (!registration) return null;
    const searchReg = registration.trim().toLowerCase();
    const query = 'SELECT id, branch, branch_code, registration, name, email, department, role, is_blocked, descriptor, image, created_at, updated_at FROM users WHERE LOWER(registration) = $1';
    const res = await this.pool.query(query, [searchReg]);
    return res.rows.length > 0 ? this._mapRowToUser(res.rows[0]) : null;
  }

  async save(user) {
    const query = `
      INSERT INTO users (id, branch, branch_code, registration, name, email, department, role, is_blocked, descriptor, image, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO UPDATE SET
        branch = EXCLUDED.branch,
        branch_code = EXCLUDED.branch_code,
        registration = EXCLUDED.registration,
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        department = EXCLUDED.department,
        role = EXCLUDED.role,
        is_blocked = EXCLUDED.is_blocked,
        descriptor = EXCLUDED.descriptor,
        image = EXCLUDED.image,
        updated_at = EXCLUDED.updated_at;
    `;

    const userObj = user.toJSON();
    const branchVal = userObj.branch_code || userObj.branch || '0101';
    const params = [
      userObj.id,
      branchVal,
      branchVal,
      userObj.registration || '',
      userObj.name,
      userObj.email || '',
      userObj.department || 'Geral',
      userObj.role,
      userObj.isBlocked || false,
      JSON.stringify(userObj.descriptor),
      userObj.image,
      new Date(userObj.createdAt),
      new Date(userObj.updatedAt)
    ];

    await this.pool.query(query, params);
    return user;
  }

  async delete(id) {
    const query = 'DELETE FROM users WHERE id = $1';
    const res = await this.pool.query(query, [id]);
    return res.rowCount > 0;
  }
}

module.exports = PostgresUserRepository;
