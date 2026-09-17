/**
 * AuthController (Presentation Layer)
 * Manages operator login/logout HTTP requests
 */
class AuthController {
  /**
   * @param {Object} params
   * @param {import('../../application/use-cases/SystemUserUseCases').LoginSystemUserUseCase} params.loginSystemUserUseCase
   * @param {import('../../infrastructure/repositories/PostgresSystemUserRepository')} params.systemUserRepository
   */
  constructor({ loginSystemUserUseCase, systemUserRepository, profileRepository }) {
    this.loginSystemUserUseCase = loginSystemUserUseCase;
    this.systemUserRepository = systemUserRepository;
    this.profileRepository = profileRepository;
  }

  async login(req, res) {
    try {
      const { username, password } = req.body;
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      const result = await this.loginSystemUserUseCase.execute({ username, password, ip });

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(401).json(result);
      }
    } catch (err) {
      console.error('[AUTH CONTROLLER LOGIN ERROR]', err);
      return res.status(500).json({ success: false, message: err.message || 'Erro interno no servidor ao realizar login.' });
    }
  }

  async logout(req, res) {
    return res.status(200).json({ success: true, message: 'Logout realizado com sucesso.' });
  }

  async me(req, res) {
    try {
      const userId = req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Não autenticado.' });
      }

      let user = await this.systemUserRepository.findById(userId);
      if (!user) {
        return res.status(401).json({ success: false, message: 'Usuário não encontrado.' });
      }

      if (user.profileId && this.profileRepository) {
        const profile = await this.profileRepository.findById(user.profileId);
        if (profile) {
          const SystemUser = require('../../domain/entities/SystemUser');
          user = new SystemUser({ ...user, profile });
        }
      }

      return res.status(200).json({ success: true, user: user.toJSON() });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = AuthController;
