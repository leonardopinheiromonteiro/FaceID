class LogController {
  constructor({ getLogsUseCase }) {
    this.getLogsUseCase = getLogsUseCase;
  }

  async getLogs(req, res) {
    try {
      const logs = await this.getLogsUseCase.execute();
      res.json({ success: true, logs });
    } catch (err) {
      console.error('[LogController getLogs Error]', err);
      res.status(500).json({ success: false, message: 'Erro ao buscar histórico de logs.' });
    }
  }

  async clearLogs(req, res) {
    return res.status(403).json({
      success: false,
      message: 'Exclusão de registros de auditoria é estritamente proibida por diretrizes de conformidade e segurança.'
    });
  }
}

module.exports = LogController;
