const crypto = require('crypto');
const FaceDescriptor = require('../value-objects/FaceDescriptor');

/**
 * User Entity (Aggregate Root - Domain Layer)
 */
class User {
  /**
   * @param {Object} params
   * @param {string} [params.id]
   * @param {string} [params.branch]
   * @param {string} params.registration
   * @param {string} params.name
   * @param {string} [params.department]
   * @param {string} [params.email]
   * @param {string} [params.role]
   * @param {boolean} [params.isBlocked]
   * @param {number[]|FaceDescriptor} params.descriptor
   * @param {string|null} [params.image]
   * @param {string} [params.createdAt]
   * @param {string} [params.updatedAt]
   */
  constructor({ id, branch, branch_code, registration, name, email = '', department, role, isBlocked = false, descriptor, image = null, createdAt, updatedAt }) {
    const cleanReg = (registration && typeof registration === 'string' && registration.trim())
      ? registration.trim().substring(0, 10)
      : ('MAT_' + (id || Date.now().toString()).slice(-6));

    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new Error('O nome completo do usuário é obrigatório.');
    }

    const branchVal = (branch || branch_code) && typeof (branch || branch_code) === 'string'
      ? (branch || branch_code).trim().substring(0, 4)
      : '0101';

    this.id = id || crypto.randomUUID();
    this.branch = branchVal;
    this.branch_code = branchVal;
    this.registration = cleanReg;
    this.name = name.trim();
    this.email = (email && typeof email === 'string' && email.trim()) ? email.trim() : '';
    this.department = (department && typeof department === 'string' && department.trim()) ? department.trim() : 'Geral';
    this.role = (role && typeof role === 'string' && role.trim()) ? role.trim() : 'Colaborador';
    this.isBlocked = Boolean(isBlocked);
    this.faceDescriptor = descriptor instanceof FaceDescriptor ? descriptor : new FaceDescriptor(descriptor);
    this.image = image || null;
    this.createdAt = createdAt || new Date().toISOString();
    this.updatedAt = updatedAt || new Date().toISOString();
  }

  /**
   * Updates user profile attributes
   * @param {Object} updateParams
   */
  updateProfile({ branch, branch_code, registration, name, email, department, role, isBlocked, descriptor, image }) {
    const newBranch = branch || branch_code;
    if (newBranch !== undefined && typeof newBranch === 'string') {
      this.branch = newBranch.trim().substring(0, 4);
      this.branch_code = this.branch;
    }
    if (registration && typeof registration === 'string' && registration.trim()) {
      this.registration = registration.trim().substring(0, 10);
    }
    if (name && typeof name === 'string' && name.trim()) {
      this.name = name.trim();
    }
    if (email !== undefined && typeof email === 'string') {
      this.email = email.trim();
    }
    if (department !== undefined && typeof department === 'string') {
      this.department = department.trim();
    }
    if (role && typeof role === 'string' && role.trim()) {
      this.role = role.trim();
    }
    if (isBlocked !== undefined) {
      this.isBlocked = Boolean(isBlocked);
    }
    if (descriptor) {
      this.faceDescriptor = descriptor instanceof FaceDescriptor ? descriptor : new FaceDescriptor(descriptor);
    }
    if (image !== undefined) {
      this.image = image;
    }
    this.updatedAt = new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      branch: this.branch,
      branch_code: this.branch_code,
      registration: this.registration,
      name: this.name,
      email: this.email,
      department: this.department,
      role: this.role,
      isBlocked: this.isBlocked,
      descriptor: this.faceDescriptor.vector,
      image: this.image,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  toPublicJSON() {
    return {
      id: this.id,
      branch: this.branch,
      branch_code: this.branch_code,
      registration: this.registration,
      name: this.name,
      email: this.email,
      department: this.department,
      role: this.role,
      isBlocked: this.isBlocked,
      image: this.image,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = User;
