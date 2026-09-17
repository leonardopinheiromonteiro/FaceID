const fs = require('fs');
const path = require('path');
const Profile = require('../../domain/entities/Profile');

/**
 * JsonProfileRepository (Infrastructure Layer)
 * Manages Profile/Group persistence in local JSON file
 */
class JsonProfileRepository {
  /**
   * @param {string} dbPath Absolute or relative path to database.json
   */
  constructor(dbPath) {
    this.dbPath = dbPath;
  }

  _readDB() {
    try {
      if (!fs.existsSync(this.dbPath)) {
        const initial = { users: [], logs: [], systemUsers: [], systemLogs: [], systemProfiles: [] };
        const dir = path.dirname(this.dbPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(this.dbPath, JSON.stringify(initial, null, 2), 'utf-8');
        return initial;
      }
      const raw = fs.readFileSync(this.dbPath, 'utf-8');
      const data = JSON.parse(raw);
      if (!data.systemProfiles) data.systemProfiles = [];
      return data;
    } catch (err) {
      console.error('[JsonProfileRepository] Erro ao ler JSON:', err);
      return { users: [], logs: [], systemUsers: [], systemLogs: [], systemProfiles: [] };
    }
  }

  _writeDB(data) {
    try {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[JsonProfileRepository] Erro ao gravar JSON:', err);
    }
  }

  async findAll() {
    const db = this._readDB();
    return (db.systemProfiles || []).map(p => new Profile(p));
  }

  async findById(id) {
    const profiles = await this.findAll();
    return profiles.find(p => p.id === id) || null;
  }

  async findByName(name) {
    if (!name) return null;
    const searchName = name.trim().toLowerCase();
    const profiles = await this.findAll();
    return profiles.find(p => p.name.toLowerCase() === searchName) || null;
  }

  async save(profile) {
    const db = this._readDB();
    if (!db.systemProfiles) db.systemProfiles = [];

    const index = db.systemProfiles.findIndex(p => p.id === profile.id);
    const itemData = {
      id: profile.id,
      code: profile.code,
      name: profile.name,
      description: profile.description,
      permissions: profile.permissions,
      allowedBranches: profile.allowedBranches,
      isSystem: profile.isSystem,
      createdAt: profile.createdAt
    };

    if (index >= 0) {
      db.systemProfiles[index] = itemData;
    } else {
      db.systemProfiles.push(itemData);
    }

    this._writeDB(db);
    return new Profile(itemData);
  }

  async delete(id) {
    const db = this._readDB();
    if (!db.systemProfiles) return false;
    const initialLen = db.systemProfiles.length;
    db.systemProfiles = db.systemProfiles.filter(p => p.id !== id || p.isSystem);
    this._writeDB(db);
    return db.systemProfiles.length < initialLen;
  }
}

module.exports = JsonProfileRepository;
