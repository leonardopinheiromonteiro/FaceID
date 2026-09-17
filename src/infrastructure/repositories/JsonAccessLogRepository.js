const fs = require('fs');
const path = require('path');
const IAccessLogRepository = require('../../domain/repositories/IAccessLogRepository');
const AccessLog = require('../../domain/entities/AccessLog');

/**
 * JsonAccessLogRepository (Infrastructure Layer)
 * Implements IAccessLogRepository with 5-minute cooldown replacement logic.
 */
class JsonAccessLogRepository extends IAccessLogRepository {
  constructor(dbPath) {
    super();
    this.dbPath = dbPath;
  }

  _readDB() {
    try {
      if (!fs.existsSync(this.dbPath)) {
        const initial = { users: [], logs: [] };
        const dir = path.dirname(this.dbPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(this.dbPath, JSON.stringify(initial, null, 2), 'utf-8');
        return initial;
      }
      const raw = fs.readFileSync(this.dbPath, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      console.error('[JsonAccessLogRepository] Erro ao ler banco de dados:', err);
      return { users: [], logs: [] };
    }
  }

  _writeDB(data) {
    try {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[JsonAccessLogRepository] Erro ao gravar no banco de dados:', err);
    }
  }

  async getLogs() {
    const db = this._readDB();
    return (db.logs || []).map(lData => new AccessLog(lData));
  }

  /**
   * Saves new access log or replaces recent log if within specified interval (5 mins)
   * @param {AccessLog} accessLog 
   * @param {number} replacementIntervalMinutes 
   */
  async saveOrReplaceLog(accessLog, replacementIntervalMinutes = 5) {
    const db = this._readDB();
    db.logs = db.logs || [];

    const cooldownMs = replacementIntervalMinutes * 60 * 1000;
    const nowMs = Date.now();
    let existingLogIndex = -1;

    if (accessLog.success && accessLog.matchedUserId) {
      existingLogIndex = db.logs.findIndex(l => {
        if (!l.matchedUserId || l.matchedUserId !== accessLog.matchedUserId) return false;
        const logTime = new Date(l.timestamp).getTime();
        return (nowMs - logTime) < cooldownMs;
      });
    }

    if (existingLogIndex !== -1) {
      // Preserve original ID, update timestamp and metrics
      accessLog.id = db.logs[existingLogIndex].id;
      db.logs[existingLogIndex] = accessLog.toJSON();
      console.log(`[FACEID REPOSITORY] Log do usuário "${accessLog.matchedUserName}" atualizado (substituição em janela de ${replacementIntervalMinutes} min).`);
    } else {
      db.logs.unshift(accessLog.toJSON());
    }

    // Limit log entries history size
    if (db.logs.length > 100) {
      db.logs = db.logs.slice(0, 100);
    }

    this._writeDB(db);
    return accessLog;
  }

  async clearLogs() {
    const db = this._readDB();
    db.logs = [];
    this._writeDB(db);
    return true;
  }
}

module.exports = JsonAccessLogRepository;
