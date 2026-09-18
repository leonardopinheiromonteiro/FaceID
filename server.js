const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// 1. Load Environment Variables (.env)
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(envPath);
}

// Environment Constants
const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;
const THRESHOLD = parseFloat(process.env.FACE_MATCH_THRESHOLD) || 0.55;
const LOG_REPLACEMENT_MINUTES = parseInt(process.env.LOG_REPLACEMENT_INTERVAL_MINUTES, 10) || 5;
const DB_PATH = process.env.DB_PATH ? path.resolve(__dirname, process.env.DB_PATH) : path.join(__dirname, 'data', 'database.json');
const DB_TYPE = (process.env.DB_TYPE || 'json').toLowerCase();

// 2. Import Services, Infrastructure & Components
const LoggerService = require('./src/infrastructure/logging/LoggerService');
const MigrationRunner = require('./src/infrastructure/database/MigrationRunner');
const { serveSwaggerUI } = require('./src/infrastructure/swagger/swagger');

// Repositories
const JsonUserRepository = require('./src/infrastructure/repositories/JsonUserRepository');
const JsonAccessLogRepository = require('./src/infrastructure/repositories/JsonAccessLogRepository');
const JsonSystemUserRepository = require('./src/infrastructure/repositories/JsonSystemUserRepository');
const JsonProfileRepository = require('./src/infrastructure/repositories/JsonProfileRepository');
const JsonBranchRepository = require('./src/infrastructure/repositories/JsonBranchRepository');

const PostgresUserRepository = require('./src/infrastructure/repositories/PostgresUserRepository');
const PostgresAccessLogRepository = require('./src/infrastructure/repositories/PostgresAccessLogRepository');
const PostgresSystemUserRepository = require('./src/infrastructure/repositories/PostgresSystemUserRepository');
const PostgresProfileRepository = require('./src/infrastructure/repositories/PostgresProfileRepository');
const PostgresBranchRepository = require('./src/infrastructure/repositories/PostgresBranchRepository');

const { createPgPool, initPostgresTables } = require('./src/infrastructure/database/initPostgres');

// Domain Entities
const SystemUser = require('./src/domain/entities/SystemUser');
const Profile = require('./src/domain/entities/Profile');

// Use Cases
const RegisterUserUseCase = require('./src/application/use-cases/RegisterUserUseCase');
const VerifyFaceUseCase = require('./src/application/use-cases/VerifyFaceUseCase');
const { GetUsersUseCase, DeleteUserUseCase, UpdateUserUseCase, GetLogsUseCase } = require('./src/application/use-cases/UserAndLogUseCases');

const {
  LoginSystemUserUseCase,
  CreateSystemUserUseCase,
  GetSystemUsersUseCase,
  UpdateSystemUserUseCase,
  DeleteSystemUserUseCase
} = require('./src/application/use-cases/SystemUserUseCases');

const {
  CreateProfileUseCase,
  GetProfilesUseCase,
  UpdateProfileUseCase,
  DeleteProfileUseCase
} = require('./src/application/use-cases/ProfileUseCases');

const {
  CreateBranchUseCase,
  GetBranchesUseCase,
  UpdateBranchUseCase,
  DeleteBranchUseCase
} = require('./src/application/use-cases/BranchUseCases');

// Controllers
const UserController = require('./src/presentation/controllers/UserController');
const VerificationController = require('./src/presentation/controllers/VerificationController');
const LogController = require('./src/presentation/controllers/LogController');
const AuthController = require('./src/presentation/controllers/AuthController');
const SystemUserController = require('./src/presentation/controllers/SystemUserController');
const ProfileController = require('./src/presentation/controllers/ProfileController');
const BranchController = require('./src/presentation/controllers/BranchController');

const createApiRouter = require('./src/presentation/routes/apiRoutes');
const { securityHeaders } = require('./src/presentation/middlewares/SecurityMiddleware');
const { getSSLCertificate } = require('./ssl-generator');

async function seedDefaultBranchesAndProfiles(branchRepository, profileRepository, systemUserRepository) {
  try {
    if (branchRepository) {
      const Branch = require('./src/domain/entities/Branch');
      await branchRepository.findByCode('0101') || await branchRepository.save(new Branch({ code: '0101', name: 'Matriz', cnpj: '00.000.000/0001-00', active: true }));
      await branchRepository.findByCode('0102') || await branchRepository.save(new Branch({ code: '0102', name: 'Adoro', cnpj: '00.000.000/0002-00', active: true }));
    }

    const adminProfile = await profileRepository.findByName('Administrador') || await profileRepository.save(new Profile({
      id: 'prf_admin',
      code: 'ADM',
      name: 'Administrador',
      description: 'Acesso total a todos os módulos e configurações do sistema',
      permissions: ['auth', 'register', 'credentials', 'status', 'audit', 'system_users', 'profiles', 'branches'],
      allowedBranches: ['*'],
      isSystem: true
    }));

    await profileRepository.findByName('Operador de Portaria') || await profileRepository.save(new Profile({
      id: 'prf_portaria',
      code: 'PORT',
      name: 'Operador de Portaria',
      description: 'Acesso para leitura facial e cadastro biométrico de colaboradores',
      permissions: ['auth', 'register'],
      allowedBranches: ['*'],
      isSystem: true
    }));

    await profileRepository.findByName('Auditor / SGQ') || await profileRepository.save(new Profile({
      id: 'prf_auditor',
      code: 'AUD',
      name: 'Auditor / SGQ',
      description: 'Acesso para consulta de relatórios de auditoria e credenciais',
      permissions: ['audit', 'credentials', 'status'],
      allowedBranches: ['*'],
      isSystem: true
    }));

    const admin = await systemUserRepository.findByUsername('admin');
    if (!admin) {
      const defaultAdmin = new SystemUser({
        id: 'sys_admin_master',
        username: 'admin',
        name: 'Administrador do Sistema',
        email: 'admin@empresa.com.br',
        password: 'admin123',
        role: 'admin',
        profileId: adminProfile.id,
        permissions: ['auth', 'register', 'credentials', 'status', 'audit', 'system_users', 'profiles', 'branches']
      });
      await systemUserRepository.save(defaultAdmin);
      console.log('[SEED] Operador administrador mestre "admin" (senha: admin123) registrado com sucesso.');
    }
  } catch (e) {
    console.warn('[SEED WARN] Falha ao verificar/criar perfis, filiais e admin padrão:', e.message);
  }
}

async function bootstrap() {
  let userRepository;
  let accessLogRepository;
  let systemUserRepository;
  let profileRepository;
  let branchRepository;
  let activeDbName = 'JSON Database File';
  const loggerService = new LoggerService();

  // 3. Dependency Injection Selection & Migration Execution
  if (DB_TYPE === 'postgres') {
    try {
      console.log('[BOOTSTRAP] Inicializando conexão com o PostgreSQL...');
      const pool = createPgPool();
      
      const runner = new MigrationRunner(pool);
      await runner.runMigrations();

      await initPostgresTables(pool);
      loggerService.setPool(pool);
      userRepository = new PostgresUserRepository(pool);
      accessLogRepository = new PostgresAccessLogRepository(pool);
      systemUserRepository = new PostgresSystemUserRepository(pool);
      profileRepository = new PostgresProfileRepository(pool);
      branchRepository = new PostgresBranchRepository(pool);

      activeDbName = 'PostgreSQL (Docker Desktop)';
      await seedDefaultBranchesAndProfiles(branchRepository, profileRepository, systemUserRepository);
      await loggerService.info('SYSTEM_START', 'Servidor inicializado com banco PostgreSQL e Migrations ativas.');
    } catch (err) {
      console.error('[BOOTSTRAP WARN] Falha no PostgreSQL. Ativando modo JSON:', err.message);
      userRepository = new JsonUserRepository(DB_PATH);
      accessLogRepository = new JsonAccessLogRepository(DB_PATH);
      systemUserRepository = new JsonSystemUserRepository(DB_PATH);
      profileRepository = new JsonProfileRepository(DB_PATH);
      branchRepository = new JsonBranchRepository();
      await seedDefaultBranchesAndProfiles(branchRepository, profileRepository, systemUserRepository);
      await loggerService.warn('SYSTEM_FALLBACK', `Falha no PostgreSQL: ${err.message}. Ativando modo JSON.`);
    }
  } else {
    userRepository = new JsonUserRepository(DB_PATH);
    accessLogRepository = new JsonAccessLogRepository(DB_PATH);
    systemUserRepository = new JsonSystemUserRepository(DB_PATH);
    profileRepository = new JsonProfileRepository(DB_PATH);
    branchRepository = new JsonBranchRepository();
    await seedDefaultBranchesAndProfiles(branchRepository, profileRepository, systemUserRepository);
    await loggerService.info('SYSTEM_START', 'Servidor inicializado com persistência JSON.');
  }

  // 4. Instantiate Use Cases & Controllers
  const registerUserUseCase = new RegisterUserUseCase({ userRepository });
  const getUsersUseCase = new GetUsersUseCase({ userRepository });
  const deleteUserUseCase = new DeleteUserUseCase({ userRepository });
  const updateUserUseCase = new UpdateUserUseCase({ userRepository });
  const verifyFaceUseCase = new VerifyFaceUseCase({
    userRepository,
    accessLogRepository,
    loggerService,
    threshold: THRESHOLD,
    logReplacementMinutes: LOG_REPLACEMENT_MINUTES
  });
  const getLogsUseCase = new GetLogsUseCase({ accessLogRepository });

  const loginSystemUserUseCase = new LoginSystemUserUseCase({ systemUserRepository, profileRepository, loggerService });
  const createSystemUserUseCase = new CreateSystemUserUseCase({ systemUserRepository, profileRepository, loggerService });
  const getSystemUsersUseCase = new GetSystemUsersUseCase({ systemUserRepository, profileRepository });
  const updateSystemUserUseCase = new UpdateSystemUserUseCase({ systemUserRepository, profileRepository, loggerService });
  const deleteSystemUserUseCase = new DeleteSystemUserUseCase({ systemUserRepository, loggerService });

  const createProfileUseCase = new CreateProfileUseCase({ profileRepository, loggerService });
  const getProfilesUseCase = new GetProfilesUseCase({ profileRepository });
  const updateProfileUseCase = new UpdateProfileUseCase({ profileRepository, loggerService });
  const deleteProfileUseCase = new DeleteProfileUseCase({ profileRepository, loggerService });

  const createBranchUseCase = new CreateBranchUseCase(branchRepository);
  const getBranchesUseCase = new GetBranchesUseCase(branchRepository);
  const updateBranchUseCase = new UpdateBranchUseCase(branchRepository);
  const deleteBranchUseCase = new DeleteBranchUseCase(branchRepository);

  const userController = new UserController({ registerUserUseCase, getUsersUseCase, deleteUserUseCase, updateUserUseCase, loggerService });
  const verificationController = new VerificationController({ verifyFaceUseCase });
  const logController = new LogController({ getLogsUseCase });
  const authController = new AuthController({ loginSystemUserUseCase, systemUserRepository, profileRepository });
  const systemUserController = new SystemUserController({
    createSystemUserUseCase,
    getSystemUsersUseCase,
    updateSystemUserUseCase,
    deleteSystemUserUseCase
  });
  const profileController = new ProfileController({
    createProfileUseCase,
    getProfilesUseCase,
    updateProfileUseCase,
    deleteProfileUseCase
  });
  const branchController = new BranchController({
    createBranchUseCase,
    getBranchesUseCase,
    updateBranchUseCase,
    deleteBranchUseCase
  });

  // 5. Express App Configuration
  const app = express();

  app.use(securityHeaders);
  app.use(cors());
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ limit: '15mb', extended: true }));

  // Serve Swagger Interactive API Documentation
  app.get('/api-docs', serveSwaggerUI);
  app.get('/api/docs', serveSwaggerUI);

  app.use(express.static(path.join(__dirname, 'public')));
  app.use('/api', createApiRouter({
    userController,
    verificationController,
    logController,
    authController,
    systemUserController,
    profileController,
    branchController,
    loggerService
  }));

  // 6. Start Servers
  const isCloudEnv = Boolean(process.env.K_SERVICE || process.env.RENDER || process.env.RAILWAY_STATIC_URL || process.env.DISABLE_HTTPS === 'true');

  const httpServer = http.createServer(app);
  httpServer.listen(PORT, () => {
    console.log(`===========================================================`);
    console.log(`  FACEID BIOMETRIC SERVER ACTIVE`);
    console.log(`  BANCO DE DADOS:  ${activeDbName}`);
    console.log(`  SWAGGER API DOCS: http://localhost:${PORT}/api-docs`);
    console.log(`  HTTP PORT:        ${PORT}`);
    console.log(`===========================================================`);
  });

  if (!isCloudEnv) {
    try {
      const { cert, key, localIP } = getSSLCertificate();
      const httpsServer = https.createServer({ key, cert }, app);
      httpsServer.listen(HTTPS_PORT, () => {
        console.log(`  HTTPS (Mobile Local): https://${localIP}:${HTTPS_PORT}`);
        console.log(`  HTTPS (Desktop Local): https://localhost:${HTTPS_PORT}`);
        console.log(`===========================================================`);
      });
    } catch (e) {
      console.warn('[SSL WARN] Servidor HTTPS local não inicializado:', e.message);
    }
  }
}

bootstrap().catch(err => {
  console.error('[BOOTSTRAP FATAL ERROR]', err);
  process.exit(1);
});
