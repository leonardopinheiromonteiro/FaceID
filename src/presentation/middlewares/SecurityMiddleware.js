/**
 * SecurityMiddleware (Presentation / Cybersecurity Layer)
 * Implements AppSec best practices: Security Headers, Input Sanitization & Rate Limiting.
 */

// Simple lightweight rate limiter
const requestTracker = new Map();

/**
 * Rate Limiting Middleware
 * @param {Object} options
 * @param {number} options.windowMs Time window in ms (e.g. 60000 = 1 min)
 * @param {number} options.max Maximum requests per IP per window
 */
function rateLimiter({ windowMs = 60000, max = 120 } = {}) {
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    if (!requestTracker.has(ip)) {
      requestTracker.set(ip, { count: 1, startTime: now });
      return next();
    }

    const tracker = requestTracker.get(ip);
    if (now - tracker.startTime > windowMs) {
      tracker.count = 1;
      tracker.startTime = now;
      return next();
    }

    tracker.count++;
    if (tracker.count > max) {
      console.warn(`[SECURITY WARN] Rate limit excedido para o IP: ${ip}`);
      return res.status(429).json({
        success: false,
        message: 'Muitas requisições enviadas em um curto período. Por favor, aguarde um instante.'
      });
    }

    next();
  };
}

/**
 * Security Headers Middleware (AppSec / DevSecOps)
 */
function securityHeaders(req, res, next) {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Prevent clickjacking via iframes
  res.setHeader('X-Frame-Options', 'DENY');
  // Enable browser XSS filtering
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Strict Transport Security (HSTS) for HTTPS
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
}

/**
 * Input Sanitization Middleware to prevent XSS / Script Injections
 */
function sanitizeInputs(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === 'string') {
        // Strip HTML tags and dangerous characters
        req.body[key] = req.body[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<[^>]+>/g, '')
          .trim();
      }
    }
  }
  next();
}

module.exports = {
  rateLimiter,
  securityHeaders,
  sanitizeInputs
};
