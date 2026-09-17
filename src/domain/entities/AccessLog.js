const crypto = require('crypto');

/**
 * AccessLog Entity (Domain Layer)
 * Represents an authentication or verification attempt log entry.
 */
class AccessLog {
  /**
   * @param {Object} params
   * @param {string} [params.id]
   * @param {string} [params.timestamp]
   * @param {string|null} [params.matchedUserId]
   * @param {string} [params.matchedUserName]
   * @param {string} [params.branch]
   * @param {string} [params.registration]
   * @param {string|null} [params.image]
   * @param {number|null} [params.matchDistance]
   * @param {number} [params.matchPercentage]
   * @param {boolean} params.success
   * @param {string} params.statusText
   */
  constructor({
    id,
    timestamp,
    matchedUserId = null,
    matchedUserName = 'Desconhecido',
    branch = '0101',
    branch_code,
    registration = 'N/A',
    image = null,
    matchDistance = null,
    matchPercentage = 0,
    success,
    statusText
  }) {
    const branchVal = (branch_code || branch || '0101').trim().substring(0, 10);
    this.id = id || crypto.randomUUID();
    this.timestamp = timestamp || new Date().toISOString();
    this.matchedUserId = matchedUserId;
    this.matchedUserName = matchedUserName;
    this.branch = branchVal;
    this.branch_code = branchVal;
    this.registration = registration || 'N/A';
    this.image = image || null;
    this.matchDistance = matchDistance !== null ? Number(matchDistance) : null;
    this.matchPercentage = Number(matchPercentage) || 0;
    this.success = Boolean(success);
    this.statusText = statusText || (this.success ? 'Acesso Concedido' : 'Acesso Negado');
  }

  toJSON() {
    return {
      id: this.id,
      timestamp: this.timestamp,
      matchedUserId: this.matchedUserId,
      matchedUserName: this.matchedUserName,
      branch: this.branch,
      branch_code: this.branch_code,
      registration: this.registration,
      image: this.image,
      matchDistance: this.matchDistance,
      matchPercentage: this.matchPercentage,
      success: this.success,
      statusText: this.statusText
    };
  }
}

module.exports = AccessLog;
