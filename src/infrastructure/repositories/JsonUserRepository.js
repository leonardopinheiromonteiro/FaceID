const fs = require('fs');
const path = require('path');
const IUserRepository = require('../../domain/repositories/IUserRepository');
const User = require('../../domain/entities/User');

/**
 * JsonUserRepository (Infrastructure Layer)
 * Implements IUserRepository using local JSON database file.
 */
class JsonUserRepository extends IUserRepository {
  /**
   * @param {string} dbPath Absolute or relative path to database.json
   */
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
      console.error('[JsonUserRepository] Erro ao ler banco de dados:', err);
      return { users: [], logs: [] };
    }
  }

  _writeDB(data) {
    try {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[JsonUserRepository] Erro ao gravar no banco de dados:', err);
    }
  }

  async findAll() {
    const db = this._readDB();
    return (db.users || []).map(uData => new User(uData));
  }

  async findById(id) {
    const users = await this.findAll();
    return users.find(u => u.id === id) || null;
  }

  async findByName(name) {
    if (!name) return null;
    const searchName = name.trim().toLowerCase();
    const users = await this.findAll();
    return users.find(u => u.name.toLowerCase() === searchName) || null;
  }

  async findByRegistration(registration) {
    if (!registration) return null;
    const searchReg = registration.trim().toLowerCase();
    const users = await this.findAll();
    return users.find(u => u.registration && u.registration.toLowerCase() === searchReg) || null;
  }

  async save(user) {
    const db = this._readDB();
    db.users = db.users || [];
    const index = db.users.findIndex(u => u.id === user.id);

    if (index !== -1) {
      db.users[index] = user.toJSON();
    } else {
      db.users.push(user.toJSON());
    }

    this._writeDB(db);
    return user;
  }

  async delete(id) {
    const db = this._readDB();
    db.users = db.users || [];
    const initialCount = db.users.length;
    db.users = db.users.filter(u => u.id !== id);
    const deleted = db.users.length < initialCount;
    if (deleted) {
      this._writeDB(db);
    }
    return deleted;
  }
}

module.exports = JsonUserRepository;
