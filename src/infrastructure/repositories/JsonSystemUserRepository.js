const fs = require('fs');
const path = require('path');
const SystemUser = require('../../domain/entities/SystemUser');

/**
 * JsonSystemUserRepository (Infrastructure Layer)
 * Manages system operators/logins persistence in local JSON file
 */
class JsonSystemUserRepository {
  /**
   * @param {string} dbPath Absolute or relative path to database.json
   */
  constructor(dbPath) {
    this.dbPath = dbPath;
  }

  _readDB() {
    try {
      if (!fs.existsSync(this.dbPath)) {
        const initial = { users: [], logs: [], systemUsers: [], systemLogs: [] };
        const dir = path.dirname(this.dbPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(this.dbPath, JSON.stringify(initial, null, 2), 'utf-8');
        return initial;
      }
      const raw = fs.readFileSync(this.dbPath, 'utf-8');
      const data = JSON.parse(raw);
      if (!data.systemUsers) data.systemUsers = [];
      return data;
    } catch (err) {
      console.error('[JsonSystemUserRepository] Erro ao ler JSON:', err);
      return { users: [], logs: [], systemUsers: [], systemLogs: [] };
    }
  }

  _writeDB(data) {
    try {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[JsonSystemUserRepository] Erro ao gravar JSON:', err);
    }
  }

  async findAll() {
    const db = this._readDB();
    return (db.systemUsers || []).map(u => new SystemUser(u));
  }

  async findById(id) {
    const users = await this.findAll();
    return users.find(u => u.id === id) || null;
  }

  async findByUsername(username) {
    if (!username) return null;
    const searchUser = username.trim().toLowerCase();
    const users = await this.findAll();
    return users.find(u => u.username === searchUser) || null;
  }

  async save(systemUser) {
    const db = this._readDB();
    if (!db.systemUsers) db.systemUsers = [];

    const index = db.systemUsers.findIndex(u => u.id === systemUser.id);
    const itemData = {
      id: systemUser.id,
      username: systemUser.username,
      name: systemUser.name,
      passwordHash: systemUser.passwordHash,
      role: systemUser.role,
      permissions: systemUser.permissions,
      createdAt: systemUser.createdAt
    };

    if (index >= 0) {
      db.systemUsers[index] = itemData;
    } else {
      db.systemUsers.push(itemData);
    }

    this._writeDB(db);
    return new SystemUser(itemData);
  }

  async delete(id) {
    const db = this._readDB();
    if (!db.systemUsers) return false;
    const initialLen = db.systemUsers.length;
    db.systemUsers = db.systemUsers.filter(u => u.id !== id);
    this._writeDB(db);
    return db.systemUsers.length < initialLen;
  }
}

module.exports = JsonSystemUserRepository;
