const fs = require('fs');
const path = require('path');

class MigrationRunner {
  /**
   * @param {import('pg').Pool} pool PostgreSQL Pool
   */
  constructor(pool) {
    this.pool = pool;
    this.migrationsDir = path.join(__dirname, 'migrations');
  }

  async runMigrations() {
    if (!this.pool) return;
    const client = await this.pool.connect();
    try {
      // Ensure migrations table exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      const appliedRes = await client.query('SELECT version FROM schema_migrations ORDER BY version ASC');
      const appliedVersions = new Set(appliedRes.rows.map(r => r.version));

      const files = fs.readdirSync(this.migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

      for (const file of files) {
        const versionMatch = file.match(/^(\d+)_/);
        if (!versionMatch) continue;

        const version = parseInt(versionMatch[1], 10);
        if (appliedVersions.has(version)) continue;

        console.log(`[MIGRATION RUNNER] Executando migration ${file}...`);
        const filePath = path.join(this.migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf-8');

        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version, name) VALUES ($1, $2)', [version, file]);
        await client.query('COMMIT');

        console.log(`[MIGRATION RUNNER] Migration ${file} concluída com sucesso.`);
      }
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[MIGRATION RUNNER ERROR] Erro durante a execução das migrations:', err);
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = MigrationRunner;
