class BranchController {
  constructor({ createBranchUseCase, getBranchesUseCase, updateBranchUseCase, deleteBranchUseCase }) {
    this.createBranchUseCase = createBranchUseCase;
    this.getBranchesUseCase = getBranchesUseCase;
    this.updateBranchUseCase = updateBranchUseCase;
    this.deleteBranchUseCase = deleteBranchUseCase;
  }

  async getAll(req, res) {
    try {
      const branches = await this.getBranchesUseCase.execute();
      return res.status(200).json(branches.map(b => b.toJSON()));
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  async create(req, res) {
    try {
      const newBranch = await this.createBranchUseCase.execute(req.body);
      return res.status(201).json(newBranch.toJSON());
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  async update(req, res) {
    try {
      const { code } = req.params;
      const updated = await this.updateBranchUseCase.execute(code, req.body);
      return res.status(200).json(updated.toJSON());
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  async delete(req, res) {
    try {
      const { code } = req.params;
      await this.deleteBranchUseCase.execute(code);
      return res.status(200).json({ message: 'Filial excluída com sucesso.' });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
}

module.exports = BranchController;
