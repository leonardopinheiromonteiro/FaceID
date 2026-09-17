class GetUsersUseCase {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }
  async execute() {
    const users = await this.userRepository.findAll();
    return users.map(u => u.toPublicJSON());
  }
}

class DeleteUserUseCase {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }
  async execute(id) {
    if (!id) throw new Error('ID do usuário é obrigatório.');
    return await this.userRepository.delete(id);
  }
}

class GetLogsUseCase {
  constructor({ accessLogRepository }) {
    this.accessLogRepository = accessLogRepository;
  }
  async execute() {
    const logs = await this.accessLogRepository.getLogs();
    return logs.map(l => l.toJSON());
  }
  async clearLogs() {
    return await this.accessLogRepository.clearLogs();
  }
}

class UpdateUserUseCase {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }
  async execute(id, { branch, branch_code, registration, name, email, department, role, isBlocked, descriptor, image }) {
    if (!id) throw new Error('ID do usuário é obrigatório.');
    const user = await this.userRepository.findById(id);
    if (!user) throw new Error('Usuário não encontrado.');

    if (registration && typeof registration === 'string' && registration.trim()) {
      const cleanReg = registration.trim().substring(0, 10);
      const existingByReg = await this.userRepository.findByRegistration(cleanReg);
      if (existingByReg && existingByReg.id !== id) {
        throw new Error(`A matrícula "${cleanReg}" já pertence a outro colaborador (${existingByReg.name}). Não é permitido duplicar matrículas.`);
      }
    }

    user.updateProfile({ branch, branch_code, registration, name, email, department, role, isBlocked, descriptor, image });
    await this.userRepository.save(user);
    return user.toPublicJSON();
  }
}

module.exports = {
  GetUsersUseCase,
  DeleteUserUseCase,
  UpdateUserUseCase,
  GetLogsUseCase
};
