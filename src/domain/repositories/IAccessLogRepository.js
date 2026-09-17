/**
 * IAccessLogRepository Interface (Domain Layer - DIP)
 * Abstract repository contract for access log persistence & replacement rules.
 */
class IAccessLogRepository {
  async getLogs() { throw new Error('Method not implemented.'); }
  async saveOrReplaceLog(accessLog, replacementIntervalMinutes) { throw new Error('Method not implemented.'); }
  async clearLogs() { throw new Error('Method not implemented.'); }
}

module.exports = IAccessLogRepository;
