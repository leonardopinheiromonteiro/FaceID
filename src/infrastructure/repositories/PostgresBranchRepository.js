const { getPool } = require('../database/initPostgres');
const Branch = require('../../domain/entities/Branch');

class PostgresBranchRepository {
  /**
   * @param {import('pg').Pool} pool 
   */
  constructor(pool) {
    this.pool = pool;
  }

  async findAll() {
    const query = 'SELECT code, name, cnpj, active, created_at FROM branches ORDER BY code ASC';
    const result = await this.pool.query(query);
    return result.rows.map(row => new Branch({
      code: row.code,
      name: row.name,
      cnpj: row.cnpj,
      active: row.active,
      createdAt: row.created_at
    }));
  }

  async findByCode(code) {
    if (!code) return null;
    const query = 'SELECT code, name, cnpj, active, created_at FROM branches WHERE code = $1';
    const result = await this.pool.query(query, [code.trim()]);
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return new Branch({
      code: row.code,
      name: row.name,
      cnpj: row.cnpj,
      active: row.active,
      createdAt: row.created_at
    });
  }

  async save(branch) {
    const query = `
      INSERT INTO branches (code, name, cnpj, active, created_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        cnpj = EXCLUDED.cnpj,
        active = EXCLUDED.active
      RETURNING code, name, cnpj, active, created_at;
    `;
    const values = [
      branch.code,
      branch.name,
      branch.cnpj,
      branch.active,
      branch.createdAt
    ];
    const result = await this.pool.query(query, values);
    const row = result.rows[0];
    return new Branch({
      code: row.code,
      name: row.name,
      cnpj: row.cnpj,
      active: row.active,
      createdAt: row.created_at
    });
  }

  async delete(code) {
    if (code === '0001') {
      throw new Error('A filial matriz "0001" não pode ser excluída.');
    }
    const query = 'DELETE FROM branches WHERE code = $1';
    await this.pool.query(query, [code]);
    return true;
  }
}

module.exports = PostgresBranchRepository;
