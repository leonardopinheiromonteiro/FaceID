const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * LoggerService (Infrastructure Layer)
 * Provides structured audit logging with dual persistence (File + PostgreSQL database).
 */
class LoggerService {
  /**
   * @param {Object} [options]
   * @param {import('pg').Pool|null} [options.pool] PostgreSQL pool reference
   * @param {string} [options.logFilePath] Path to log file
   */
  constructor({ pool = null, logFilePath = null } = {}) {
    this.pool = pool;
    this.logFilePath = logFilePath || path.join(__dirname, '../../../logs/app.log');
    this._ensureLogDirectory();
  }

  setPool(pool) {
    this.pool = pool;
  }

  _ensureLogDirectory() {
    try {
      const dir = path.dirname(this.logFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (err) {
      console.error('[LOGGER ERROR] Falha ao criar diretório de logs:', err);
    }
  }

  /**
   * Primary log writer method
   * @param {string} level 'INFO' | 'WARN' | 'ERROR' | 'AUDIT'
   * @param {string} action Category or operation identifier
   * @param {string} message Human readable message
   * @param {Object} [metadata] Extra data payload
   * @param {string} [ip] Client IP address
   */
  async log(level, action, message, metadata = {}, ip = '127.0.0.1') {
    const timestamp = new Date().toISOString();
    const logId = crypto.randomUUID();
    const branchCode = (metadata && (metadata.branch_code || metadata.branchCode || metadata.branch))
      ? String(metadata.branch_code || metadata.branchCode || metadata.branch).trim().substring(0, 10)
      : '0101';

    const logRecord = {
      id: logId,
      timestamp,
      level: level.toUpperCase(),
      action: action.toUpperCase(),
      branch_code: branchCode,
      message,
      metadata: metadata || {},
      ip: ip || '127.0.0.1'
    };

    // 1. Console Output
    const consoleMsg = `[${timestamp}] [${logRecord.level}] [${logRecord.action}] [FILIAL: ${branchCode}] ${message}`;
    if (logRecord.level === 'ERROR') console.error(consoleMsg);
    else if (logRecord.level === 'WARN') console.warn(consoleMsg);
    else console.log(consoleMsg);

    // 2. Append to File (logs/app.log)
    try {
      const line = JSON.stringify(logRecord) + '\n';
      fs.appendFileSync(this.logFilePath, line, 'utf-8');
    } catch (err) {
      console.error('[LOGGER FILE ERROR]', err.message);
    }

    // 3. Persist to PostgreSQL system_logs table if active
    if (this.pool) {
      try {
        const query = `
          INSERT INTO system_logs (id, timestamp, level, action, branch_code, message, metadata, ip)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
        `;
        await this.pool.query(query, [
          logRecord.id,
          new Date(logRecord.timestamp),
          logRecord.level,
          logRecord.action,
          logRecord.branch_code,
          logRecord.message,
          JSON.stringify(logRecord.metadata),
          logRecord.ip
        ]);
      } catch (dbErr) {
        // Silently ignore DB log write error if pool is reconnecting
      }
    }

    return logRecord;
  }

  info(action, message, metadata, ip) { return this.log('INFO', action, message, metadata, ip); }
  warn(action, message, metadata, ip) { return this.log('WARN', action, message, metadata, ip); }
  error(action, message, metadata, ip) { return this.log('ERROR', action, message, metadata, ip); }
  audit(action, message, metadata, ip) { return this.log('AUDIT', action, message, metadata, ip); }

  async getSystemLogs(limit = 10000) {
    if (this.pool) {
      try {
        const query = 'SELECT id, timestamp, level, action, branch_code, message, metadata, ip FROM system_logs ORDER BY timestamp DESC LIMIT $1';
        const res = await this.pool.query(query, [limit]);
        return res.rows;
      } catch (err) {
        console.warn('[LOGGER GET ERROR] Falha ao ler logs do DB, fallback para arquivo:', err.message);
      }
    }

    // Fallback reading log file
    try {
      if (!fs.existsSync(this.logFilePath)) return [];
      const content = fs.readFileSync(this.logFilePath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);
      return lines.slice(-limit).reverse().map(l => JSON.parse(l));
    } catch (err) {
      return [];
    }
  }
}

module.exports = LoggerService;
