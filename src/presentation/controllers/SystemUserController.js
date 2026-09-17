/**
 * SystemUserController (Presentation Layer)
 * Manages system user CRUD HTTP requests
 */
class SystemUserController {
  /**
   * @param {Object} params
   * @param {import('../../application/use-cases/SystemUserUseCases').CreateSystemUserUseCase} params.createSystemUserUseCase
   * @param {import('../../application/use-cases/SystemUserUseCases').GetSystemUsersUseCase} params.getSystemUsersUseCase
   * @param {import('../../application/use-cases/SystemUserUseCases').UpdateSystemUserUseCase} params.updateSystemUserUseCase
   * @param {import('../../application/use-cases/SystemUserUseCases').DeleteSystemUserUseCase} params.deleteSystemUserUseCase
   */
  constructor({ createSystemUserUseCase, getSystemUsersUseCase, updateSystemUserUseCase, deleteSystemUserUseCase }) {
    this.createSystemUserUseCase = createSystemUserUseCase;
    this.getSystemUsersUseCase = getSystemUsersUseCase;
    this.updateSystemUserUseCase = updateSystemUserUseCase;
    this.deleteSystemUserUseCase = deleteSystemUserUseCase;
  }

  async getAll(req, res) {
    try {
      const users = await this.getSystemUsersUseCase.execute();
      return res.status(200).json({ success: true, count: users.length, users });
    } catch (err) {
      console.error('[SYSTEM USER CONTROLLER GET ALL ERROR]', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async create(req, res) {
    try {
      const { username, name, email, branchCode, branch_code, password, role, profileId, permissions } = req.body;
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      const operatorName = req.headers['x-user-name'] ? decodeURIComponent(req.headers['x-user-name']) : 'Administrador';
      const cleanBranch = branchCode || branch_code || '0101';

      const result = await this.createSystemUserUseCase.execute({
        username,
        name,
        email: email || '',
        branchCode: cleanBranch,
        password,
        role,
        profileId,
        permissions,
        ip,
        operatorName
      });
      const statusCode = result.success ? 201 : 400;
      return res.status(statusCode).json(result);
    } catch (err) {
      console.error('[SYSTEM USER CONTROLLER CREATE ERROR]', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const { name, email, branchCode, branch_code, password, role, profileId, permissions } = req.body;
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      const operatorName = req.headers['x-user-name'] ? decodeURIComponent(req.headers['x-user-name']) : 'Administrador';

      const result = await this.updateSystemUserUseCase.execute({
        id,
        name,
        email,
        branchCode: branchCode || branch_code,
        password,
        role,
        profileId,
        permissions,
        ip,
        operatorName
      });
      const statusCode = result.success ? 200 : 400;
      return res.status(statusCode).json(result);
    } catch (err) {
      console.error('[SYSTEM USER CONTROLLER UPDATE ERROR]', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      const operatorName = req.headers['x-user-name'] ? decodeURIComponent(req.headers['x-user-name']) : 'Administrador';

      const result = await this.deleteSystemUserUseCase.execute({ id, ip, operatorName });
      const statusCode = result.success ? 200 : 400;
      return res.status(statusCode).json(result);
    } catch (err) {
      console.error('[SYSTEM USER CONTROLLER DELETE ERROR]', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = SystemUserController;
