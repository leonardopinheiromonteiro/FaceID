const crypto = require('crypto');

/**
 * Profile / Group Entity (Domain Layer)
 * Represents a security profile/group with specific menu access rights and privileges.
 * SystemUsers belong to a Profile and inherit its permissions.
 */
class Profile {
  /**
   * @param {Object} params
   * @param {string} [params.id]
   * @param {string} [params.code] - Group/Profile code (e.g. 'ADM', 'PORT', 'AUD')
   * @param {string} params.name - Profile name (e.g., 'Administrador', 'Portaria', 'Auditor')
   * @param {string} [params.description]
   * @param {string[]} [params.permissions] - Array of allowed menu tabs: ['auth', 'register', 'credentials', 'status', 'audit', 'system_users', 'profiles', 'branches']
   * @param {string[]} [params.allowedBranches] - Array of allowed branch codes or ['*'] for all branches
   * @param {boolean} [params.isSystem] - System master profiles cannot be deleted
   * @param {string} [params.createdAt]
   */
  constructor({ id, code, name, description = '', permissions = [], allowedBranches = ['*'], isSystem = false, createdAt }) {
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new Error('O nome do perfil/grupo é obrigatório.');
    }

    this.id = id || crypto.randomUUID();
    this.code = (code || name.substring(0, 10)).toUpperCase().trim();
    this.name = name.trim();
    this.description = description ? description.trim() : '';
    
    const allValidPerms = ['auth', 'register', 'credentials', 'status', 'audit', 'system_users', 'profiles', 'branches'];
    this.permissions = Array.isArray(permissions) ? permissions.filter(p => allValidPerms.includes(p)) : [];
    this.allowedBranches = Array.isArray(allowedBranches) && allowedBranches.length > 0 ? allowedBranches : ['*'];
    this.isSystem = Boolean(isSystem);
    this.createdAt = createdAt || new Date().toISOString();
  }

  /**
   * Checks if this profile grants access to a specific tab
   * @param {string} perm 
   * @returns {boolean}
   */
  hasPermission(perm) {
    return this.permissions.includes(perm);
  }

  /**
   * Checks if profile has access to a specific branch code
   * @param {string} branchCode 
   * @returns {boolean}
   */
  hasBranchAccess(branchCode) {
    if (this.allowedBranches.includes('*')) return true;
    return this.allowedBranches.includes(branchCode);
  }

  /**
   * JSON representation of Profile
   */
  toJSON() {
    return {
      id: this.id,
      code: this.code,
      name: this.name,
      description: this.description,
      permissions: this.permissions,
      allowedBranches: this.allowedBranches,
      isSystem: this.isSystem,
      createdAt: this.createdAt
    };
  }
}

module.exports = Profile;
