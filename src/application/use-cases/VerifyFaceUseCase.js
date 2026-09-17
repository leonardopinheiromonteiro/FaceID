const AccessLog = require('../../domain/entities/AccessLog');
const BiometricMatcherService = require('../../domain/services/BiometricMatcherService');

/**
 * VerifyFaceUseCase (Application Layer)
 * Executes face verification against domain users and persists access logs.
 */
class VerifyFaceUseCase {
  /**
   * @param {Object} dependencies
   * @param {import('../../domain/repositories/IUserRepository')} dependencies.userRepository
   * @param {import('../../domain/repositories/IAccessLogRepository')} dependencies.accessLogRepository
   * @param {Object|null} [dependencies.loggerService]
   * @param {BiometricMatcherService} [dependencies.biometricMatcherService]
   * @param {number} [dependencies.threshold]
   * @param {number} [dependencies.logReplacementMinutes]
   */
  constructor({
    userRepository,
    accessLogRepository,
    loggerService = null,
    biometricMatcherService = new BiometricMatcherService(),
    threshold = 0.55,
    logReplacementMinutes = 5
  }) {
    this.userRepository = userRepository;
    this.accessLogRepository = accessLogRepository;
    this.loggerService = loggerService;
    this.biometricMatcherService = biometricMatcherService;
    this.threshold = threshold;
    this.logReplacementMinutes = logReplacementMinutes;
  }

  /**
   * @param {Object} inputData
   * @param {number[]} inputData.descriptor
   * @param {string} [inputData.image] Base64 captured snapshot image
   * @param {string} [inputData.ip] Client IP address
   */
  async execute({ descriptor, image = null, ip = '127.0.0.1' }) {
    if (!descriptor || !Array.isArray(descriptor) || descriptor.length === 0) {
      throw new Error('Vetor de face ausente para verificação.');
    }

    const users = await this.userRepository.findAll();

    if (users.length === 0) {
      const failedLog = new AccessLog({
        matchedUserId: null,
        matchedUserName: 'Desconhecido',
        branch: '0101',
        registration: 'N/A',
        image: image || null,
        matchDistance: null,
        matchPercentage: 0,
        success: false,
        statusText: 'Rejeitado: Nenhum usuário cadastrado no sistema'
      });
      await this.accessLogRepository.saveOrReplaceLog(failedLog, this.logReplacementMinutes);
      return {
        success: false,
        message: 'Acesso Negado: Nenhum usuário cadastrado no sistema.',
        matchPercentage: 0,
        log: failedLog.toJSON()
      };
    }

    const { matchedUser, minDistance, matchPercentage, isMatch } =
      this.biometricMatcherService.matchFace(descriptor, users, this.threshold);

    if (isMatch && matchedUser) {
      const branchCode = matchedUser.branch_code || matchedUser.branch || '0101';

      // 1. CHECAGEM DE CREDENCIAL BLOQUEADA / INATIVA
      if (matchedUser.isBlocked) {
        console.warn(`[USE CASE VERIFY] Bloqueado: ${matchedUser.name} (Matrícula: ${matchedUser.registration}) tentou acessar, mas está BLOQUEADO.`);
        
        const blockedLog = new AccessLog({
          matchedUserId: matchedUser.id,
          matchedUserName: matchedUser.name,
          branch: branchCode,
          registration: matchedUser.registration,
          image: image || null,
          matchDistance: minDistance,
          matchPercentage: matchPercentage,
          success: false,
          statusText: `Acesso Negado: Credencial Bloqueada / Inativa (${matchedUser.name})`
        });
        await this.accessLogRepository.saveOrReplaceLog(blockedLog, this.logReplacementMinutes);

        // Gera Log de Auditoria no Sistema (system_logs)
        if (this.loggerService) {
          try {
            await this.loggerService.audit(
              'USER_BLOCKED_ACCESS',
              `Acesso Negado: Tentativa de validação biométrica com credencial BLOQUEADA/INATIVA de "${matchedUser.name}" (Matrícula: ${matchedUser.registration})`,
              {
                branch_code: branchCode,
                userId: matchedUser.id,
                registration: matchedUser.registration,
                name: matchedUser.name,
                matchDistance: minDistance,
                matchPercentage: matchPercentage,
                status: 'BLOCKED'
              },
              ip || '127.0.0.1'
            );
          } catch (auditErr) {
            console.error('[LOGGER AUDIT ERROR]', auditErr);
          }
        }

        return {
          success: false,
          isBlocked: true,
          message: `Acesso Negado: A credencial de "${matchedUser.name}" (Matrícula: ${matchedUser.registration}) está bloqueada/inativa no sistema.`,
          user: matchedUser.toPublicJSON(),
          matchDistance: minDistance,
          matchPercentage: matchPercentage,
          log: blockedLog.toJSON()
        };
      }

      // 2. ACESSO PERMITIDO
      console.log(`[USE CASE VERIFY] Sucesso: ${matchedUser.name} | Distância: ${minDistance} | Precisão: ${matchPercentage}%`);
      const logEntry = new AccessLog({
        matchedUserId: matchedUser.id,
        matchedUserName: matchedUser.name,
        branch: branchCode,
        registration: matchedUser.registration,
        image: image || null,
        matchDistance: minDistance,
        matchPercentage: matchPercentage,
        success: true,
        statusText: `Acesso Concedido (${matchPercentage}% de precisão)`
      });
      await this.accessLogRepository.saveOrReplaceLog(logEntry, this.logReplacementMinutes);

      return {
        success: true,
        message: `Acesso Concedido! Bem-vindo(a), ${matchedUser.name}!`,
        user: matchedUser.toPublicJSON(),
        matchDistance: minDistance,
        matchPercentage: matchPercentage,
        log: logEntry.toJSON()
      };
    } else {
      // 3. ROSTO NÃO RECONHECIDO
      console.log(`[USE CASE VERIFY] Falha: Rosto não reconhecido | Menor distância: ${minDistance}`);
      const failedLog = new AccessLog({
        matchedUserId: null,
        matchedUserName: 'Desconhecido',
        branch: '0101',
        registration: 'N/A',
        image: image || null,
        matchDistance: minDistance,
        matchPercentage: matchPercentage,
        success: false,
        statusText: `Acesso Negado: Rosto não identificado (Menor distância: ${minDistance !== null ? minDistance.toFixed(3) : 'N/A'})`
      });
      await this.accessLogRepository.saveOrReplaceLog(failedLog, this.logReplacementMinutes);

      return {
        success: false,
        message: 'Acesso Negado: Rosto não reconhecido ou nível de confiança insuficiente.',
        matchDistance: minDistance,
        matchPercentage: matchPercentage,
        log: failedLog.toJSON()
      };
    }
  }
}

module.exports = VerifyFaceUseCase;
