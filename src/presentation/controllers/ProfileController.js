/**
 * ProfileController (Presentation Layer)
 * Manages HTTP endpoints for Profiles & Groups
 */
class ProfileController {
  /**
   * @param {Object} params
   * @param {import('../../application/use-cases/ProfileUseCases').CreateProfileUseCase} params.createProfileUseCase
   * @param {import('../../application/use-cases/ProfileUseCases').GetProfilesUseCase} params.getProfilesUseCase
   * @param {import('../../application/use-cases/ProfileUseCases').UpdateProfileUseCase} params.updateProfileUseCase
   * @param {import('../../application/use-cases/ProfileUseCases').DeleteProfileUseCase} params.deleteProfileUseCase
   */
  constructor({ createProfileUseCase, getProfilesUseCase, updateProfileUseCase, deleteProfileUseCase }) {
    this.createProfileUseCase = createProfileUseCase;
    this.getProfilesUseCase = getProfilesUseCase;
    this.updateProfileUseCase = updateProfileUseCase;
    this.deleteProfileUseCase = deleteProfileUseCase;
  }

  async getAll(req, res) {
    try {
      const profiles = await this.getProfilesUseCase.execute();
      return res.status(200).json({ success: true, count: profiles.length, profiles });
    } catch (err) {
      console.error('[PROFILE CONTROLLER GET ALL ERROR]', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async create(req, res) {
    try {
      const { code, name, description, permissions, allowedBranches, allowed_branches } = req.body;
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      const operatorName = req.headers['x-user-name'] ? decodeURIComponent(req.headers['x-user-name']) : 'Administrador';

      const branches = allowedBranches || allowed_branches || ['*'];
      const result = await this.createProfileUseCase.execute({ code, name, description, permissions, allowedBranches: branches, ip, operatorName });
      const statusCode = result.success ? 201 : 400;
      return res.status(statusCode).json(result);
    } catch (err) {
      console.error('[PROFILE CONTROLLER CREATE ERROR]', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const { code, name, description, permissions, allowedBranches, allowed_branches } = req.body;
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      const operatorName = req.headers['x-user-name'] ? decodeURIComponent(req.headers['x-user-name']) : 'Administrador';

      const branches = allowedBranches !== undefined ? allowedBranches : (allowed_branches !== undefined ? allowed_branches : undefined);
      const result = await this.updateProfileUseCase.execute({ id, code, name, description, permissions, allowedBranches: branches, ip, operatorName });
      const statusCode = result.success ? 200 : 400;
      return res.status(statusCode).json(result);
    } catch (err) {
      console.error('[PROFILE CONTROLLER UPDATE ERROR]', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      const operatorName = req.headers['x-user-name'] ? decodeURIComponent(req.headers['x-user-name']) : 'Administrador';

      const result = await this.deleteProfileUseCase.execute({ id, ip, operatorName });
      const statusCode = result.success ? 200 : 400;
      return res.status(statusCode).json(result);
    } catch (err) {
      console.error('[PROFILE CONTROLLER DELETE ERROR]', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = ProfileController;
