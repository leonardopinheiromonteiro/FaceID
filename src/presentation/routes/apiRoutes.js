const express = require('express');
const { rateLimiter, sanitizeInputs } = require('../middlewares/SecurityMiddleware');

function createApiRouter({ userController, verificationController, logController, authController, systemUserController, profileController, branchController, loggerService }) {
  const router = express.Router();

  // Apply input sanitization across all API endpoints
  router.use(sanitizeInputs);

  // Authentication endpoints
  if (authController) {
    router.post('/auth/login', rateLimiter({ windowMs: 60000, max: 15 }), (req, res) => authController.login(req, res));
    router.post('/auth/logout', (req, res) => authController.logout(req, res));
    router.get('/auth/me', (req, res) => authController.me(req, res));
  }

  // Branch Management endpoints
  if (branchController) {
    router.get('/branches', (req, res) => branchController.getAll(req, res));
    router.post('/branches', (req, res) => branchController.create(req, res));
    router.put('/branches/:code', (req, res) => branchController.update(req, res));
    router.delete('/branches/:code', (req, res) => branchController.delete(req, res));
  }

  // Profile / Group Management endpoints
  if (profileController) {
    router.get('/profiles', (req, res) => profileController.getAll(req, res));
    router.post('/profiles', (req, res) => profileController.create(req, res));
    router.put('/profiles/:id', (req, res) => profileController.update(req, res));
    router.delete('/profiles/:id', (req, res) => profileController.delete(req, res));
  }

  // System User Management endpoints
  if (systemUserController) {
    router.get('/system-users', (req, res) => systemUserController.getAll(req, res));
    router.post('/system-users', (req, res) => systemUserController.create(req, res));
    router.put('/system-users/:id', (req, res) => systemUserController.update(req, res));
    router.delete('/system-users/:id', (req, res) => systemUserController.delete(req, res));
  }

  // User & Credential management endpoints
  router.get('/users', (req, res) => userController.getAll(req, res));
  router.post('/register', rateLimiter({ windowMs: 60000, max: 20 }), (req, res) => userController.register(req, res));
  router.put('/users/:id', (req, res) => userController.update(req, res));
  router.delete('/users/:id', (req, res) => userController.delete(req, res));

  // Biometric verification endpoint with rate limiting (DevSecOps)
  router.post('/verify', rateLimiter({ windowMs: 60000, max: 100 }), (req, res) => verificationController.verify(req, res));

  // Access log endpoints (Note: DELETE /logs is blocked with 403 Forbidden for audit immutability)
  router.get('/logs', (req, res) => logController.getLogs(req, res));
  router.delete('/logs', (req, res) => logController.clearLogs(req, res));

  // System audit log endpoint
  router.get('/system-logs', async (req, res) => {
    try {
      const logs = loggerService ? await loggerService.getSystemLogs(150) : [];
      res.json({ success: true, logs });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Erro ao buscar logs de sistema.' });
    }
  });

  return router;
}

module.exports = createApiRouter;
