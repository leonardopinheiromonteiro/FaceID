const IAccessLogRepository = require('../../domain/repositories/IAccessLogRepository');
const AccessLog = require('../../domain/entities/AccessLog');

/**
 * PostgresAccessLogRepository (Infrastructure Layer)
 * Implements IAccessLogRepository using PostgreSQL Database.
 */
class PostgresAccessLogRepository extends IAccessLogRepository {
  /**
   * @param {import('pg').Pool} pool PostgreSQL Connection Pool
   */
  constructor(pool) {
    super();
    this.pool = pool;
  }

  _mapRowToAccessLog(row) {
    if (!row) return null;
    return new AccessLog({
      id: row.id,
      timestamp: row.timestamp ? new Date(row.timestamp).toISOString() : new Date().toISOString(),
      matchedUserId: row.matched_user_id,
      matchedUserName: row.matched_user_name,
      branch: row.branch_code || row.branch || '0101',
      branch_code: row.branch_code || row.branch || '0101',
      registration: row.registration,
      image: row.image,
      matchDistance: row.match_distance !== null ? Number(row.match_distance) : null,
      matchPercentage: row.match_percentage || 0,
      success: row.success,
      statusText: row.status_text
    });
  }

  async getLogs(allowedBranches = null) {
    let query = 'SELECT id, timestamp, matched_user_id, matched_user_name, branch, branch_code, registration, image, match_distance, match_percentage, success, status_text FROM access_logs';
    const params = [];

    if (Array.isArray(allowedBranches) && !allowedBranches.includes('*') && allowedBranches.length > 0) {
      query += ' WHERE (branch = ANY($1) OR branch_code = ANY($1))';
      params.push(allowedBranches);
    }

    query += ' ORDER BY timestamp DESC';
    const res = await this.pool.query(query, params);
    return res.rows.map(row => this._mapRowToAccessLog(row));
  }

  /**
   * Saves new access log or replaces recent log if within specified interval (5 mins)
   * @param {AccessLog} accessLog 
   * @param {number} replacementIntervalMinutes 
   */
  async saveOrReplaceLog(accessLog, replacementIntervalMinutes = 5) {
    const cooldownMs = replacementIntervalMinutes * 60 * 1000;
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - cooldownMs);

    let existingLogId = null;

    if (accessLog.success && accessLog.matchedUserId) {
      const searchRecentQuery = `
        SELECT id FROM access_logs
        WHERE matched_user_id = $1 AND timestamp >= $2
        ORDER BY timestamp DESC LIMIT 1;
      `;
      const searchRes = await this.pool.query(searchRecentQuery, [accessLog.matchedUserId, cutoffDate]);
      if (searchRes.rows.length > 0) {
        existingLogId = searchRes.rows[0].id;
      }
    }

    const logObj = accessLog.toJSON();
    const branchVal = logObj.branch_code || logObj.branch || '0101';

    if (existingLogId) {
      // Update recent log entry
      logObj.id = existingLogId;
      const updateQuery = `
        UPDATE access_logs
        SET timestamp = $1, match_distance = $2, match_percentage = $3, success = $4, status_text = $5, branch = $6, branch_code = $7, registration = $8, image = $9
        WHERE id = $10;
      `;
      await this.pool.query(updateQuery, [
        now,
        logObj.matchDistance,
        logObj.matchPercentage,
        logObj.success,
        logObj.statusText,
        branchVal,
        branchVal,
        logObj.registration,
        logObj.image,
        existingLogId
      ]);
      console.log(`[POSTGRES REPOSITORY] Log do usuário "${logObj.matchedUserName}" atualizado (substituição no intervalo de ${replacementIntervalMinutes} min no Postgres).`);
    } else {
      // Insert new log entry
      const insertQuery = `
        INSERT INTO access_logs (id, timestamp, matched_user_id, matched_user_name, branch, branch_code, registration, image, match_distance, match_percentage, success, status_text)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);
      `;
      await this.pool.query(insertQuery, [
        logObj.id,
        now,
        logObj.matchedUserId,
        logObj.matchedUserName,
        branchVal,
        branchVal,
        logObj.registration,
        logObj.image,
        logObj.matchDistance,
        logObj.matchPercentage,
        logObj.success,
        logObj.statusText
      ]);
    }

    return accessLog;
  }

  async clearLogs() {
    const query = 'TRUNCATE TABLE access_logs';
    await this.pool.query(query);
    return true;
  }
}

module.exports = PostgresAccessLogRepository;
