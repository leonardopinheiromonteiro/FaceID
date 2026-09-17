class VerificationController {
  constructor({ verifyFaceUseCase }) {
    this.verifyFaceUseCase = verifyFaceUseCase;
  }

  async verify(req, res) {
    try {
      const result = await this.verifyFaceUseCase.execute({
        ...req.body,
        ip: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1'
      });
      res.json(result);
    } catch (err) {
      console.error('[VerificationController Error]', err);
      res.status(400).json({ success: false, message: err.message || 'Erro ao verificar biometria.' });
    }
  }
}

module.exports = VerificationController;
