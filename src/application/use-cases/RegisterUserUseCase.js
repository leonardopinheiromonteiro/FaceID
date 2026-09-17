const User = require('../../domain/entities/User');

/**
 * RegisterUserUseCase (Application Layer)
 * Handles registering new users or updating existing biometric profiles.
 */
class RegisterUserUseCase {
  /**
   * @param {Object} dependencies
   * @param {import('../../domain/repositories/IUserRepository')} dependencies.userRepository
   */
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  /**
   * @param {Object} inputData
   * @param {string} [inputData.branch]
   * @param {string} inputData.registration
   * @param {string} inputData.name
   * @param {string} [inputData.email]
   * @param {string} [inputData.department]
   * @param {string} [inputData.role]
   * @param {number[]} inputData.descriptor
   * @param {string|null} [inputData.image]
   */
  async execute({ branch, registration, name, email, department, role, descriptor, image }) {
    if (!registration || typeof registration !== 'string' || !registration.trim()) {
      throw new Error('A matrícula do colaborador é obrigatória.');
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new Error('O nome do usuário é obrigatório.');
    }

    if (!descriptor || !Array.isArray(descriptor) || descriptor.length === 0) {
      throw new Error('Nenhum vetor descritor de rosto foi fornecido.');
    }

    const cleanReg = registration.trim().substring(0, 10);
    const cleanName = name.trim();
    const cleanEmail = (email && typeof email === 'string') ? email.trim() : '';

    // Check if user exists by Registration (Matrícula) - Prevent duplicate registrations!
    const existingByReg = await this.userRepository.findByRegistration(cleanReg);
    if (existingByReg) {
      throw new Error(`A matrícula "${cleanReg}" já está cadastrada para o colaborador "${existingByReg.name}". Não é permitido cadastrar matrículas duplicadas.`);
    }

    // Create new domain user
    const newUser = new User({
      branch: branch || '0101',
      registration: cleanReg,
      name: cleanName,
      email: cleanEmail,
      department: department || 'Geral',
      role: role || 'Colaborador',
      descriptor: descriptor,
      image: image || null
    });

    await this.userRepository.save(newUser);
    console.log(`[USE CASE REGISTER] Novo usuário cadastrado: "${newUser.name}" (Matrícula: ${newUser.registration}).`);

    return {
      success: true,
      isNew: true,
      message: `Face e credencial registradas com sucesso no FaceID! (Matrícula: ${newUser.registration})`,
      user: newUser.toPublicJSON()
    };
  }
}

module.exports = RegisterUserUseCase;
