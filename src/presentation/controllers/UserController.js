class UserController {
  constructor({ registerUserUseCase, getUsersUseCase, deleteUserUseCase, updateUserUseCase, loggerService = null }) {
    this.registerUserUseCase = registerUserUseCase;
    this.getUsersUseCase = getUsersUseCase;
    this.deleteUserUseCase = deleteUserUseCase;
    this.updateUserUseCase = updateUserUseCase;
    this.loggerService = loggerService;
  }

  async getAll(req, res) {
    try {
      const users = await this.getUsersUseCase.execute();
      res.json({ success: true, users });
    } catch (err) {
      console.error('[UserController getAll Error]', err);
      res.status(500).json({ success: false, message: 'Erro ao buscar usuários.' });
    }
  }

  async register(req, res) {
    try {
      const result = await this.registerUserUseCase.execute(req.body);
      if (this.loggerService && result.success) {
        await this.loggerService.audit(
          'USER_CREATE',
          `Novo registro criado no banco: ${req.body.name} (Matrícula: ${req.body.registration})`,
          {
            userId: result.user?.id,
            registration: req.body.registration,
            branch: req.body.branch,
            name: req.body.name,
            email: req.body.email,
            department: req.body.department,
            role: req.body.role
          },
          req.ip
        );
      }
      res.json(result);
    } catch (err) {
      console.error('[UserController register Error]', err);
      res.status(400).json({ success: false, message: err.message || 'Erro ao registrar usuário.' });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const updatedUser = await this.updateUserUseCase.execute(id, req.body);
      if (this.loggerService) {
        const actionType = req.body.isBlocked !== undefined
          ? (req.body.isBlocked ? 'USER_BLOCK' : 'USER_UNBLOCK')
          : 'USER_UPDATE';
        await this.loggerService.audit(
          actionType,
          `Registro alterado no banco: ${updatedUser.name} (Matrícula: ${updatedUser.registration})`,
          {
            userId: id,
            name: updatedUser.name,
            registration: updatedUser.registration,
            email: updatedUser.email,
            branch: updatedUser.branch,
            isBlocked: updatedUser.isBlocked,
            changes: req.body
          },
          req.ip
        );
      }
      res.json({ success: true, message: 'Credencial biométrica atualizada com sucesso!', user: updatedUser });
    } catch (err) {
      console.error('[UserController update Error]', err);
      res.status(400).json({ success: false, message: err.message || 'Erro ao atualizar credencial.' });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      const success = await this.deleteUserUseCase.execute(id);
      if (!success) {
        return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
      }
      if (this.loggerService) {
        await this.loggerService.audit(
          'USER_DELETE',
          `Registro excluído do banco (ID: ${id})`,
          { userId: id },
          req.ip
        );
      }
      res.json({ success: true, message: 'Usuário removido com sucesso.' });
    } catch (err) {
      console.error('[UserController delete Error]', err);
      res.status(400).json({ success: false, message: err.message });
    }
  }
}

module.exports = UserController;
