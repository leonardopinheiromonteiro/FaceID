const SystemUser = require('../../domain/entities/SystemUser');

class LoginSystemUserUseCase {
  constructor({ systemUserRepository, profileRepository, loggerService }) {
    this.systemUserRepository = systemUserRepository;
    this.profileRepository = profileRepository;
    this.loggerService = loggerService;
  }

  async execute({ username, password, ip = '127.0.0.1' }) {
    if (!username || !password) {
      throw new Error('Usuário e senha são obrigatórios.');
    }

    let user = await this.systemUserRepository.findByUsername(username);
    if (!user) {
      if (this.loggerService) {
        await this.loggerService.warn('SYSTEM_USER_LOGIN_FAILED', `Tentativa de login com usuário inexistente: "${username}"`, {}, ip);
      }
      return { success: false, message: 'Usuário ou senha inválidos.' };
    }

    if (user.profileId && this.profileRepository) {
      const profile = await this.profileRepository.findById(user.profileId);
      if (profile) {
        user = new SystemUser({ ...user, profile });
      }
    }

    const isValid = user.verifyPassword(password);
    if (!isValid) {
      if (this.loggerService) {
        await this.loggerService.warn('SYSTEM_USER_LOGIN_FAILED', `Senha incorreta para usuário: "${username}"`, { username: user.username }, ip);
      }
      return { success: false, message: 'Usuário ou senha inválidos.' };
    }

    if (this.loggerService) {
      await this.loggerService.info('SYSTEM_USER_LOGIN', `Login efetuado com sucesso pelo usuário "${user.name}" (${user.username})`, { userId: user.id, username: user.username, role: user.role, profileId: user.profileId }, ip);
    }

    return {
      success: true,
      message: `Bem-vindo(a), ${user.name}!`,
      user: user.toJSON()
    };
  }
}

class CreateSystemUserUseCase {
  constructor({ systemUserRepository, profileRepository, loggerService }) {
    this.systemUserRepository = systemUserRepository;
    this.profileRepository = profileRepository;
    this.loggerService = loggerService;
  }

  async execute({ username, name, email, branchCode, branch_code, password, role, profileId, permissions, ip = '127.0.0.1', operatorName = 'Sistema' }) {
    if (!username || !name || !password) {
      throw new Error('Usuário (login), nome completo e senha são obrigatórios.');
    }

    const existing = await this.systemUserRepository.findByUsername(username);
    if (existing) {
      return { success: false, message: `Já existe um usuário com o login "${username.trim().toLowerCase()}".` };
    }

    let attachedProfile = null;
    if (profileId && this.profileRepository) {
      attachedProfile = await this.profileRepository.findById(profileId);
    }

    const cleanBranch = (branchCode || branch_code || '0101').trim();

    const newUser = new SystemUser({
      username,
      name,
      email: email || '',
      branchCode: cleanBranch,
      password,
      role: role || 'operator',
      profileId,
      profile: attachedProfile,
      permissions
    });

    const saved = await this.systemUserRepository.save(newUser);
    const resultUser = new SystemUser({ ...saved, profile: attachedProfile });

    if (this.loggerService) {
      await this.loggerService.info('SYSTEM_USER_CREATE', `Usuário "${resultUser.name}" (${resultUser.username}) cadastrado por "${operatorName}"`, {
        createdUserId: resultUser.id,
        username: resultUser.username,
        role: resultUser.role,
        branchCode: resultUser.branchCode,
        profileId: resultUser.profileId,
        permissions: resultUser.permissions
      }, ip);
    }

    return {
      success: true,
      message: `Usuário "${resultUser.name}" cadastrado com sucesso!`,
      user: resultUser.toJSON()
    };
  }
}

class GetSystemUsersUseCase {
  constructor({ systemUserRepository, profileRepository }) {
    this.systemUserRepository = systemUserRepository;
    this.profileRepository = profileRepository;
  }

  async execute() {
    const users = await this.systemUserRepository.findAll();
    const profiles = this.profileRepository ? await this.profileRepository.findAll() : [];
    const profilesMap = new Map(profiles.map(p => [p.id, p]));

    return users.map(u => {
      const p = u.profileId ? profilesMap.get(u.profileId) : null;
      const fullUser = new SystemUser({ ...u, profile: p });
      return fullUser.toJSON();
    });
  }
}

class UpdateSystemUserUseCase {
  constructor({ systemUserRepository, profileRepository, loggerService }) {
    this.systemUserRepository = systemUserRepository;
    this.profileRepository = profileRepository;
    this.loggerService = loggerService;
  }

  async execute({ id, name, email, branchCode, branch_code, password, role, profileId, permissions, ip = '127.0.0.1', operatorName = 'Sistema' }) {
    const user = await this.systemUserRepository.findById(id);
    if (!user) {
      return { success: false, message: 'Usuário do sistema não encontrado.' };
    }

    let passwordHash = user.passwordHash;
    if (password && password.trim()) {
      passwordHash = SystemUser.hashPassword(password.trim());
    }

    let attachedProfile = null;
    const targetProfileId = profileId !== undefined ? profileId : user.profileId;
    if (targetProfileId && this.profileRepository) {
      attachedProfile = await this.profileRepository.findById(targetProfileId);
    }

    const cleanBranch = branchCode !== undefined ? branchCode : (branch_code !== undefined ? branch_code : (user.branchCode || '0101'));

    const updatedUser = new SystemUser({
      id: user.id,
      username: user.username,
      name: (name && name.trim()) ? name.trim() : user.name,
      email: email !== undefined ? email : user.email,
      branchCode: cleanBranch,
      passwordHash,
      role: role || user.role,
      profileId: targetProfileId,
      profile: attachedProfile,
      permissions: Array.isArray(permissions) ? permissions : user.permissions,
      createdAt: user.createdAt
    });

    const saved = await this.systemUserRepository.save(updatedUser);
    const resultUser = new SystemUser({ ...saved, profile: attachedProfile });

    if (this.loggerService) {
      await this.loggerService.info('SYSTEM_USER_UPDATE', `Usuário "${resultUser.name}" (${resultUser.username}) atualizado por "${operatorName}"`, {
        updatedUserId: resultUser.id,
        role: resultUser.role,
        branchCode: resultUser.branchCode,
        profileId: resultUser.profileId,
        permissions: resultUser.permissions
      }, ip);
    }

    return {
      success: true,
      message: `Usuário "${resultUser.name}" atualizado com sucesso!`,
      user: resultUser.toJSON()
    };
  }
}

class DeleteSystemUserUseCase {
  constructor({ systemUserRepository, loggerService }) {
    this.systemUserRepository = systemUserRepository;
    this.loggerService = loggerService;
  }

  async execute({ id, ip = '127.0.0.1', operatorName = 'Sistema' }) {
    const user = await this.systemUserRepository.findById(id);
    if (!user) {
      return { success: false, message: 'Usuário do sistema não encontrado.' };
    }

    if (user.username === 'admin') {
      return { success: false, message: 'O usuário mestre "admin" não pode ser removido.' };
    }

    const ok = await this.systemUserRepository.delete(id);

    if (ok && this.loggerService) {
      await this.loggerService.info('SYSTEM_USER_DELETE', `Usuário "${user.name}" (${user.username}) removido por "${operatorName}"`, {
        deletedUserId: user.id,
        username: user.username
      }, ip);
    }

    return {
      success: ok,
      message: ok ? `Usuário "${user.name}" removido com sucesso!` : 'Falha ao remover usuário.'
    };
  }
}

module.exports = {
  LoginSystemUserUseCase,
  CreateSystemUserUseCase,
  GetSystemUsersUseCase,
  UpdateSystemUserUseCase,
  DeleteSystemUserUseCase
};
