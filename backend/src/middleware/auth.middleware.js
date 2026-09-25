const { authService } = require('../modules/auth/auth.service');

/**
 * Middleware: Verify JWT Access Token in Authorization header
 * Usage: router.get('/profile', authenticate, controller.getProfile);
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authentication token provided.',
      error: {},
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = authService.verifyAccessToken(token);
    req.user = decoded; // { userId, role, iat, exp }
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message || 'Invalid or expired access token',
      error: {},
    });
  }
};

/**
 * Middleware: Role-based authorization guard
 * Usage: router.post('/admin/something', authenticate, authorize('ADMIN'), ...);
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not have permission to access this resource.',
        error: {},
      });
    }
    next();
  };
};

module.exports = {
  authenticate,
  authorize,
};
