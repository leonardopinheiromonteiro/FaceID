const Profile = require('../../domain/entities/Profile');

class CreateProfileUseCase {
  constructor({ profileRepository, loggerService }) {
    this.profileRepository = profileRepository;
    this.loggerService = loggerService;
  }

  async execute({ code, name, description, permissions, allowedBranches, ip = '127.0.0.1', operatorName = 'Sistema' }) {
    if (!name || !name.trim()) {
      throw new Error('O nome do perfil/grupo de acesso é obrigatório.');
    }

    const existing = await this.profileRepository.findByName(name);
    if (existing) {
      return { success: false, message: `Já existe um perfil/grupo com o nome "${name.trim()}".` };
    }

    const newProfile = new Profile({
      code,
      name,
      description,
      permissions,
      allowedBranches
    });

    const saved = await this.profileRepository.save(newProfile);

    if (this.loggerService) {
      await this.loggerService.info('PROFILE_CREATE', `Perfil/Grupo "${saved.name}" (${saved.code}) criado por "${operatorName}"`, {
        profileId: saved.id,
        code: saved.code,
        permissions: saved.permissions,
        allowedBranches: saved.allowedBranches
      }, ip);
    }

    return {
      success: true,
      message: `Perfil/Grupo "${saved.name}" criado com sucesso!`,
      profile: saved.toJSON()
    };
  }
}

class GetProfilesUseCase {
  constructor({ profileRepository }) {
    this.profileRepository = profileRepository;
  }

  async execute() {
    const profiles = await this.profileRepository.findAll();
    return profiles.map(p => p.toJSON());
  }
}

class UpdateProfileUseCase {
  constructor({ profileRepository, loggerService }) {
    this.profileRepository = profileRepository;
    this.loggerService = loggerService;
  }

  async execute({ id, code, name, description, permissions, allowedBranches, ip = '127.0.0.1', operatorName = 'Sistema' }) {
    const profile = await this.profileRepository.findById(id);
    if (!profile) {
      return { success: false, message: 'Perfil/Grupo não encontrado.' };
    }

    const updated = new Profile({
      id: profile.id,
      code: (code && code.trim()) ? code.trim() : profile.code,
      name: (name && name.trim()) ? name.trim() : profile.name,
      description: description !== undefined ? description : profile.description,
      permissions: Array.isArray(permissions) ? permissions : profile.permissions,
      allowedBranches: Array.isArray(allowedBranches) ? allowedBranches : profile.allowedBranches,
      isSystem: profile.isSystem,
      createdAt: profile.createdAt
    });

    const saved = await this.profileRepository.save(updated);

    if (this.loggerService) {
      await this.loggerService.info('PROFILE_UPDATE', `Perfil/Grupo "${saved.name}" (${saved.code}) atualizado por "${operatorName}"`, {
        profileId: saved.id,
        code: saved.code,
        permissions: saved.permissions,
        allowedBranches: saved.allowedBranches
      }, ip);
    }

    return {
      success: true,
      message: `Perfil/Grupo "${saved.name}" atualizado com sucesso!`,
      profile: saved.toJSON()
    };
  }
}

class DeleteProfileUseCase {
  constructor({ profileRepository, loggerService }) {
    this.profileRepository = profileRepository;
    this.loggerService = loggerService;
  }

  async execute({ id, ip = '127.0.0.1', operatorName = 'Sistema' }) {
    const profile = await this.profileRepository.findById(id);
    if (!profile) {
      return { success: false, message: 'Perfil/Grupo não encontrado.' };
    }

    if (profile.isSystem) {
      return { success: false, message: 'Perfis do sistema (Administrador, Operador, Auditor) são protegidos e não podem ser excluídos.' };
    }

    const ok = await this.profileRepository.delete(id);

    if (ok && this.loggerService) {
      await this.loggerService.info('PROFILE_DELETE', `Perfil/Grupo "${profile.name}" removido por "${operatorName}"`, {
        profileId: profile.id
      }, ip);
    }

    return {
      success: ok,
      message: ok ? `Perfil/Grupo "${profile.name}" removido com sucesso!` : 'Falha ao remover perfil.'
    };
  }
}

module.exports = {
  CreateProfileUseCase,
  GetProfilesUseCase,
  UpdateProfileUseCase,
  DeleteProfileUseCase
};
