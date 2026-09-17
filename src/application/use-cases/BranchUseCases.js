const Branch = require('../../domain/entities/Branch');

class CreateBranchUseCase {
  constructor(branchRepository) {
    this.branchRepository = branchRepository;
  }

  async execute(branchData) {
    const existing = await this.branchRepository.findByCode(branchData.code);
    if (existing) {
      throw new Error(`Já existe uma filial cadastrada com o código "${branchData.code}".`);
    }

    const branch = new Branch(branchData);
    return await this.branchRepository.save(branch);
  }
}

class GetBranchesUseCase {
  constructor(branchRepository) {
    this.branchRepository = branchRepository;
  }

  async execute() {
    return await this.branchRepository.findAll();
  }
}

class UpdateBranchUseCase {
  constructor(branchRepository) {
    this.branchRepository = branchRepository;
  }

  async execute(code, branchData) {
    const existing = await this.branchRepository.findByCode(code);
    if (!existing) {
      throw new Error(`Filial com código "${code}" não encontrada.`);
    }

    const updated = new Branch({
      ...existing.toJSON(),
      ...branchData,
      code: existing.code
    });

    return await this.branchRepository.save(updated);
  }
}

class DeleteBranchUseCase {
  constructor(branchRepository) {
    this.branchRepository = branchRepository;
  }

  async execute(code) {
    return await this.branchRepository.delete(code);
  }
}

module.exports = {
  CreateBranchUseCase,
  GetBranchesUseCase,
  UpdateBranchUseCase,
  DeleteBranchUseCase
};
