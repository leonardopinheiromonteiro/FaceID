const crypto = require('crypto');

/**
 * SystemUser Entity (Domain Layer)
 * Represents system operators/logins who authenticate into the FaceID application.
 * Belongs to a Profile/Group and inherits permissions from that Profile.
 */
class SystemUser {
  /**
   * @param {Object} params
   * @param {string} [params.id]
   * @param {string} params.username
   * @param {string} params.name
   * @param {string} [params.passwordHash]
   * @param {string} [params.password]
   * @param {string} [params.role] - 'admin' | 'operator'
   * @param {string} [params.profileId] - Associated Profile/Group ID
   * @param {Object} [params.profile] - Attached Profile entity / object
   * @param {string[]} [params.permissions] - Direct custom permissions (override or additional)
   * @param {string} [params.email]
   * @param {string} [params.branchCode] - Código da Filial (ex: '0101')
   * @param {string} [params.branch_code]
   * @param {string} [params.createdAt]
   */
  constructor({ id, username, name, email = '', branchCode = '0101', branch_code, passwordHash, password, role = 'operator', profileId = null, profile = null, permissions, createdAt }) {
    if (!username || typeof username !== 'string' || !username.trim()) {
      throw new Error('O nome de usuário (login) é obrigatório.');
    }
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new Error('O nome completo do usuário é obrigatório.');
    }

    this.id = id || crypto.randomUUID();
    this.username = username.trim().toLowerCase();
    this.name = name.trim();
    this.email = (email || '').trim().toLowerCase();
    this.branchCode = (branchCode || branch_code || '0101').trim();
    this.role = role || 'operator';
    this.profileId = profileId || (profile ? profile.id : null);
    this.profile = profile || null;

    if (password) {
      this.passwordHash = SystemUser.hashPassword(password);
    } else if (passwordHash) {
      this.passwordHash = passwordHash;
    } else {
      throw new Error('A senha ou hash de senha é obrigatória.');
    }

    // Determine effective permissions (User explicit + Profile inherited)
    const defaultAllPerms = ['auth', 'register', 'credentials', 'status', 'audit', 'system_users', 'profiles', 'branches'];
    let computedPerms = [];
    let computedBranches = ['*'];

    if (this.role === 'admin') {
      computedPerms = defaultAllPerms;
      computedBranches = ['*'];
    } else if (this.profile) {
      if (Array.isArray(this.profile.permissions)) {
        computedPerms = [...this.profile.permissions];
      }
      if (Array.isArray(this.profile.allowedBranches) && this.profile.allowedBranches.length > 0) {
        computedBranches = [...this.profile.allowedBranches];
      } else {
        computedBranches = this.branchCode ? [this.branchCode] : ['*'];
      }
    } else if (Array.isArray(permissions)) {
      computedPerms = [...permissions];
      computedBranches = this.branchCode ? [this.branchCode] : ['*'];
    } else {
      computedPerms = ['auth', 'register'];
      computedBranches = this.branchCode ? [this.branchCode] : ['*'];
    }

    // Deduplicate permissions & branches
    this.permissions = Array.from(new Set(computedPerms));
    this.allowedBranches = Array.from(new Set(computedBranches));
    this.createdAt = createdAt || new Date().toISOString();
  }

  /**
   * Hashes plain text password using SHA-256 with salt
   * @param {string} plainPassword 
   * @returns {string}
   */
  static hashPassword(plainPassword) {
    if (!plainPassword || typeof plainPassword !== 'string') {
      throw new Error('Senha inválida para geração de hash.');
    }
    const salt = 'faceid_secure_salt_2026';
    return crypto.createHmac('sha256', salt).update(plainPassword).digest('hex');
  }

  /**
   * Verifies plain text password against hashed password
   * @param {string} plainPassword 
   * @returns {boolean}
   */
  verifyPassword(plainPassword) {
    if (!plainPassword) return false;
    const computed = SystemUser.hashPassword(plainPassword);
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(this.passwordHash));
  }

  /**
   * Checks if user has permission to access a specific tab/action (via inherited profile or admin role)
   * @param {string} perm 
   * @returns {boolean}
   */
  hasPermission(perm) {
    if (this.role === 'admin') return true;
    return Array.isArray(this.permissions) && this.permissions.includes(perm);
  }

  /**
   * Checks if user has access to a specific branch
   * @param {string} branchCode 
   * @returns {boolean}
   */
  hasBranchAccess(branchCode) {
    if (this.role === 'admin') return true;
    if (this.allowedBranches.includes('*')) return true;
    return this.allowedBranches.includes(branchCode);
  }

  /**
   * Converts SystemUser to JSON representation
   */
  toJSON() {
    return {
      id: this.id,
      username: this.username,
      name: this.name,
      email: this.email,
      branchCode: this.branchCode,
      role: this.role,
      profileId: this.profileId,
      profileName: this.profile ? this.profile.name : (this.role === 'admin' ? 'Administrador' : 'Sem Perfil'),
      profileCode: this.profile ? this.profile.code : (this.role === 'admin' ? 'ADM' : 'SEM'),
      permissions: this.permissions,
      allowedBranches: this.allowedBranches,
      createdAt: this.createdAt
    };
  }
}

module.exports = SystemUser;
