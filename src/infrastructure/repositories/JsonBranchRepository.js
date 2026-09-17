const fs = require('fs');
const path = require('path');
const Branch = require('../../domain/entities/Branch');

class JsonBranchRepository {
  constructor(filePath = path.join(__dirname, '../../../data/branches.json')) {
    this.filePath = filePath;
    this._ensureFileExists();
  }

  _ensureFileExists() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.filePath)) {
      const defaultBranches = [
        new Branch({ code: '0001', name: 'Filial Matriz', cnpj: '00.000.000/0001-00', active: true })
      ];
      fs.writeFileSync(this.filePath, JSON.stringify(defaultBranches.map(b => b.toJSON()), null, 2), 'utf8');
    }
  }

  _readData() {
    try {
      const content = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(content);
      return parsed.map(b => new Branch(b));
    } catch (e) {
      return [];
    }
  }

  _writeData(branches) {
    fs.writeFileSync(this.filePath, JSON.stringify(branches.map(b => b.toJSON()), null, 2), 'utf8');
  }

  async findAll() {
    return this._readData();
  }

  async findByCode(code) {
    if (!code) return null;
    const branches = this._readData();
    return branches.find(b => b.code === code.trim()) || null;
  }

  async save(branch) {
    const branches = this._readData();
    const index = branches.findIndex(b => b.code === branch.code);
    if (index >= 0) {
      branches[index] = branch;
    } else {
      branches.push(branch);
    }
    this._writeData(branches);
    return branch;
  }

  async delete(code) {
    if (code === '0001') {
      throw new Error('A filial matriz "0001" não pode ser excluída.');
    }
    let branches = this._readData();
    branches = branches.filter(b => b.code !== code);
    this._writeData(branches);
    return true;
  }
}

module.exports = JsonBranchRepository;
